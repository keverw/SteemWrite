(function()
{
    var _ = require('underscore'),
        postHelpers = require('./postHelpers.js'),
        util = require('../util.js'),
        textHelpers = require('../textHelpers.js');

    module.exports = {
        processItem: function(reqMeta, resultData, cb)
        {
            //note: should account for duplicated results

            //process modes updater, posts
            var updaterMode = _.contains(reqMeta.modes, 'updater');
            var postsMode = _.contains(reqMeta.modes, 'posts');

            var totalTasks = updaterMode + postsMode; //true or false can be added up just like numbers
            var doneTasks = 0;
            var lastErr = null;

            //console.log(resultData);

            ////////////////////////////////////////////////////////////
            if (updaterMode)
            {
                module.exports.processUpdaterMode(reqMeta, resultData, function(err)
                {
                    if (err) lastErr = err;
                    doneTasks++;
                });

            }

            if (postsMode)
            {
                module.exports.processPostsMode(reqMeta, resultData, function(err)
                {
                    if (err) lastErr = err;
                    doneTasks++;
                });
            }

            //check when tasks are done:
            var cbCalled = false;

            var isDone = setInterval(function()
            {

                if (!cbCalled && totalTasks == doneTasks)
                {
                    cbCalled = true;
                    clearInterval(isDone);
                    cb(lastErr);
                }

            }, 1);

        },
        processUpdaterMode: function(reqMeta, resultData, cb)
        {
            //check for a post indicating a new version

            var reqID = reqMeta.modes;
            var username = reqMeta.username;

            if (username == 'steemwrite')
            {
                //todo: actually write this if it's a new post and over current version
                cb();
            }
            else
            {
                cb();
            }

        },
        processPostsMode: function(reqMeta, resultData, cb)
        {
            //process new posts, etc
            var reqID = reqMeta.modes;
            var username = reqMeta.username;

            ////////////////////////////
            var trx_id = resultData.trx_id;
            var timestamp = resultData.timestamp;

            var op = resultData.op[0];
            var data = resultData.op[1];

            //console.log(op, data);

            if (op == 'comment') //account for comments
            {
                //new post or user for that watched user
                if (data.parent_author === '' && data.author === username)
                {

                    //check if author, permlink exists already
                    global.db.get('SELECT * FROM posts WHERE author = ? AND permlink = ?', [data.author, data.permlink], function(err, row)
                    {
                        if (err) return cb(err);

                        var authperm = [data.author, data.permlink].join('.');

                        var metadata = JSON.parse(data.json_metadata);

                        var featuredImg = '';

                        if (metadata.image && typeof metadata.image == 'object' && typeof metadata.image[0] == 'string') featuredImg = metadata.image[0];

                        var unixTime = global.moment.utc(timestamp).unix();

                        if (row) //already
                        {
                            var revisionInsertedOrUpdated = function()
                            {
                                //update post
                                var postUpdateData = {
                                    title: data.title,
                                    status: 'published',
                                    date: unixTime,
                                    featuredImg: featuredImg
                                };

                                //add tags
                                postUpdateData = _.extend(postUpdateData, postHelpers.metadataToTagsKV(metadata));

                                //update posts
                                postHelpers.updatePost(data.author, data.permlink, postUpdateData, function(err)
                                {
                                    cb(err);
                                });

                            };

                            //check for local content hash:
                            var bcSentHash = postHelpers.generatebcSentHash(data.title, data.body, metadata);

                            global.db.get('SELECT * FROM revisions WHERE isAutosave = 0 AND blockChainDate = 0 AND publishedTX = "" AND author = ? AND permlink = ? AND bcSentHash = ? ORDER BY date ASC LIMIT 1', [data.author, data.permlink, bcSentHash], function(err, contentHashLookupResult)
                            {
                                if (err) return cb(err);

                                if (contentHashLookupResult) //found bcSentHash - update revision
                                {
                                    postHelpers.updateRevision(contentHashLookupResult.revHash, contentHashLookupResult.author, contentHashLookupResult.permlink, {
                                        revHash: postHelpers.generateRevHash(contentHashLookupResult.contentHash, unixTime),
                                        bcSentHash: null,
                                        publishedTX: trx_id,
                                        blockChainDate: unixTime,
                                        date: unixTime
                                    }, function(err)
                                    {
                                        if (err) return cb(err);
                                        revisionInsertedOrUpdated();
                                    });

                                }
                                else //no bcSentHash found - keep going
                                {
                                    //grab revision before this one
                                    global.db.get('SELECT body, revHash FROM revisions WHERE NOT (publishedTX = "") AND author = ? AND permlink = ? AND blockChainDate > 0 AND blockChainDate < ? ORDER BY blockChainDate DESC LIMIT 1', [data.author, data.permlink, unixTime], function(err, row)
                                    {
                                        var body = data.body;

                                        if (row) //found a revision before
                                        {
                                            body = util.applyPatch(row.body, data.body); //update body
                                        }

                                        //no featured image, check metadata genreated from body
                                        if (featuredImg === '')
                                        {
                                            var extractedMeta = textHelpers.metadata(body);

                                            if (extractedMeta.images.length > 0)
                                            {
                                                featuredImg = extractedMeta.images[0];
                                            }

                                        }

                                        //insert revision
                                        var contentHash = postHelpers.generateContentHash(data.title, body, JSON.stringify(metadata));
                                        var newRevHash = postHelpers.generateRevHash(contentHash, unixTime);

                                        postHelpers.insertRevision({
                                            revHash: newRevHash,
                                            contentHash: contentHash,
                                            publishedTX: trx_id,
                                            author: data.author,
                                            permlink: data.permlink,
                                            authperm: [data.author, data.permlink].join('.'),
                                            title: data.title,
                                            body: body,
                                            json_metadata: JSON.stringify(metadata),
                                            localDate: 0,
                                            blockChainDate: unixTime,
                                            date: unixTime,
                                            isAutosave: 0
                                        }, function(err)
                                        {
                                            if (err) return cb(err);
                                            revisionInsertedOrUpdated();
                                        });

                                    });

                                }

                            });

                        }
                        else //not already
                        {
                            //no featured image, check metadata genreated from body
                            if (featuredImg === '')
                            {
                                var extractedMeta = textHelpers.metadata(data.body);

                                if (extractedMeta.images.length > 0)
                                {
                                    featuredImg = extractedMeta.images[0];
                                }

                            }

                            //insert revision
                            var contentHash = postHelpers.generateContentHash(data.title, data.body, JSON.stringify(metadata));
                            var revHash = postHelpers.generateRevHash(contentHash, unixTime);

                            postHelpers.insertRevision({
                                revHash: revHash,
                                contentHash: contentHash,
                                publishedTX: trx_id,
                                author: data.author,
                                permlink: data.permlink,
                                authperm: [data.author, data.permlink].join('.'),
                                title: data.title,
                                body: data.body,
                                json_metadata: JSON.stringify(metadata),
                                localDate: 0,
                                blockChainDate: unixTime,
                                date: unixTime,
                                isAutosave: 0
                            }, function(err)
                            {
                                if (err) return cb(err);

                                //insert post
                                var postData = {
                                    author: data.author,
                                    permlink: data.permlink,
                                    title: data.title,
                                    status: 'published',
                                    date: unixTime,
                                    scheduledDate: 0,
                                    featuredImg: featuredImg,
                                    warningMsg: ''
                                };

                                //add tags
                                postData = _.extend(postData, postHelpers.metadataToTagsKV(metadata));

                                //insert
                                postHelpers.insertPost(postData, function(err)
                                {
                                    cb(err);
                                });

                            });

                        }

                    });

                    //   [3, {
                    //   "id": "2.17.7483135",
                    //   "trx_id": "fe9aae14ef39eb99a8fb4be85997d721d682a895",
                    //   "block": 4854475,
                    //   "trx_in_block": 4,
                    //   "op_in_trx": 0,
                    //   "virtual_op": 24532,
                    //   "timestamp": "2016-09-10T17:52:21",
                    //   "op": ["comment", {
                    //     "parent_author": "",
                    //     "parent_permlink": "spam",
                    //     "author": "kevintester",
                    //     "permlink": "testing",
                    //     "title": "testing",
                    //     "body": "test\n\nPlease ignore this post",
                    //     "json_metadata": "{\"tags\":[\"spam\"]}"
                    //   }]
                    // }]

                }
                else
                {
                    cb();
                }

            }
            else
            {
                cb();
            }

            //todo: account for delete's

        }
    };

}());
