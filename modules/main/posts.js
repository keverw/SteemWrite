(function()
{
    var _ = require('underscore'),
        pagination = require('./pagination.js'),
        postHelpers = require('./postHelpers.js'),
        util = require('../util.js'),
        textHelpers = require('../textHelpers.js'),
        secureRandom = require('secure-random'),
        base58 = require('bs58'),
        editorUtility = require('../editorUtility.js');

    function cleanPermlink(permlink)
    {
        //Over STEEMIT_MAX_PERMLINK_LENGTH
        if (permlink.length > 255) permlink = permlink.substring(permlink.length - 255, permlink.length);

        // only letters numbers and dashes shall survive
        permlink = permlink.toLowerCase().replace(/[^a-z0-9-]+/g, '');
        return permlink;
    }

    module.exports = {
        postList: function(parameters, cb)
        {
            var output = {};

            function processResults(err, rows)
            {
                if (err) return cb(err);

                var authpermsLookups = [];

                //build authpermsLookups list
                if (rows.length > 0)
                {
                    for (var i in rows)
                    {
                        if (rows.hasOwnProperty(i))
                        {
                            authpermsLookups.push([rows[i].author, rows[i].permlink].join('.'));
                        }

                    }

                }

                //call getAutosaves and process
                postHelpers.getAutosaves(authpermsLookups, function(err, results)
                {
                    if (err) return cb(err);

                    for (var i in rows)
                    {
                        if (rows.hasOwnProperty(i))
                        {
                            var authperm = [rows[i].author, rows[i].permlink].join('.');
                            rows[i].autosaveRevison = (results[authperm]) ? results[authperm] : '';
                        }

                    }

                    output.posts = rows;
                    cb(null, output);
                });

            }

            function processCountResult(err, row)
            {
                if (err) return cb(err);

                var postCount = row.posts;

                var myPagination = pagination.init();
                myPagination.setFN('postsView.page');
                myPagination.setPerPage(7);
                myPagination.setTotalItems(postCount);

                myPagination.setPage(parameters.page);
                output.pagination = myPagination.getPagination();

                var fields = 'author, permlink, title, status, date, tag1, tag2, tag3, tag4, tag5, featuredImg';

                if (parameters.type == 'all')
                {
                    global.db.all("SELECT " + fields + " FROM posts WHERE author = ? ORDER BY date DESC " + myPagination.getLimitSql(), [parameters.username], processResults);
                }
                else
                {
                    global.db.all("SELECT " + fields + " FROM posts WHERE author = ? AND status = ? ORDER BY date DESC " + myPagination.getLimitSql(), [parameters.username, parameters.type], processResults);
                }

            }

            if (parameters.type == 'all')
            {
                global.db.get("SELECT COUNT(*) AS posts FROM posts WHERE author = ?", [parameters.username], processCountResult);
            }
            else
            {
                global.db.get("SELECT COUNT(*) AS posts FROM posts WHERE author = ? AND status = ?", [parameters.username, parameters.type], processCountResult);
            }

        },
        bcGetContent: function(parameters, cb)
        {
            if (global.bcReady)
            {
                global.bc.database_api().exec('get_content', [parameters.author, parameters.permlink])
                    .then(function(res)
                    {
                        cb(null, res);
                    })
                    .catch(function(e)
                    {
                        cb(e);
                    });

            }
            else
            {
                cb(new Error('Blockchain not ready yet'));
            }

        },
        createMainPermlink: function(parameters, cb)
        {
            var author = parameters.author,
                title = parameters.title;

            var permlink = '';

            var s = editorUtility.slug(title.toLowerCase());

            if (s === '') s = base58.encode(secureRandom.randomBuffer(4));

            //ensure the permlink(slug) is unique
            var prefix = '';

            module.exports.bcGetContent({
                author: author,
                permlink: s
            }, function(err, result)
            {
                if (err) return cb(err);

                if (result.body === '') //no post for that slug
                {
                    //check database
                    global.db.get('SELECT * FROM posts WHERE author = ? AND permlink = ?', [author, s], function(err, row)
                    {
                        if (err) return cb(err);

                        if (row) //post already for that slug
                        {
                            prefix = base58.encode(secureRandom.randomBuffer(4)) + '-'; // make sure slug is unique
                        }

                        cb(null, {
                            permlink: cleanPermlink(prefix + s)
                        });

                    });

                }
                else //post already for that slug
                {
                    prefix = base58.encode(secureRandom.randomBuffer(4)) + '-'; // make sure slug is unique
                    cb(null, {
                        permlink: cleanPermlink(prefix + s)
                    });

                }

            });

        },
        createReplyPermlink: function(parameters, cb)
        {
            // comments: re-parentauthor-parentpermlink-time
            var timeStr = new Date().toISOString().replace(/[^a-zA-Z0-9]+/g, '');
            parameters.parent_permlink = parameters.parent_permlink.replace(/(-\d{8}t\d{9}z)/g, '');
            var permlink = 're-' + parameters.parent_author + '-' + parameters.parent_permlink + '-' + timeStr;

            cb(null, {
                permlink: cleanPermlink(permlink)
            });

        },
        loadPost: function(parameters, cb)
        {
            global.db.get("SELECT * FROM posts WHERE author = ? AND permlink = ? LIMIT 1", [parameters.author, parameters.permlink], function(err, postsRow)
            {
                if (err) return cb(err);

                if (postsRow)
                {
                    var authperm = [parameters.author, parameters.permlink].join('.');

                    postHelpers.getRevInfo(authperm, function(err, info)
                    {
                        if (err) return cb(err);

                        var lookupRev = info.autosaveRevison;

                        if (lookupRev === '') //no autosave, use latest saved revison
                        {
                            lookupRev = info.latestRevison;
                        }

                        if (lookupRev.length > 0)
                        {

                            //author and permlink are included because revhash is only 1 part of the pkey.
                            global.db.get("SELECT * FROM revisions WHERE revHash = ? AND author = ? AND permlink = ? LIMIT 1", [lookupRev, parameters.author, parameters.permlink], function(err, revisionsRow)
                            {

                                if (err) return cb(err);

                                if (revisionsRow)
                                {
                                    var tags = [];

                                    try {
                                        var metadata = JSON.parse(revisionsRow.json_metadata);

                                        if (metadata.tags) tags = metadata.tags;

                                        cb(null, {
                                            status: 'found',
                                            postStatus: postsRow.status,
                                            author: revisionsRow.author,
                                            permlink: revisionsRow.permlink,
                                            title: revisionsRow.title,
                                            body: revisionsRow.body,
                                            json_metadata: metadata,
                                            tags: tags
                                        });

                                    } catch (err)
                                    {
                                        if (err) return cb(err);
                                    }

                                }
                                else
                                {
                                    cb(null, {
                                        status: 'notfound'
                                    });

                                }

                            });

                        }
                        else
                        {
                            cb(null, {
                                status: 'notfound'
                            });
                        }

                    });

                }
                else
                {
                    cb(null, {
                        status: 'notfound'
                    });
                }

            });

        },
        savePost: function(parameters, cb)
        {
            var metadata = {};

            var additionalJSONParseResult = editorUtility.validate.additionalJSONParse(parameters.editorData.additionalJSON);

            //set if no error message
            if (!additionalJSONParseResult.errMsg) metadata = additionalJSONParseResult.decoded;

            //set tags and extractedMeta
            var tags = util.splitRemoveEmpties(' ', parameters.editorData.tags);
            var extractedMeta = textHelpers.metadata(parameters.editorData.body);

            if (tags.length > 0) metadata.tags = tags;
            if (extractedMeta.usertags.length > 0) metadata.users = extractedMeta.usertags;
            if (extractedMeta.images.length > 0) metadata.image = extractedMeta.images;
            if (extractedMeta.links.length > 0) metadata.links = extractedMeta.links;

            var featuredImg = (metadata.image && typeof metadata.image == 'object' && typeof metadata.image[0] == 'string') ? metadata.image[0] : '';

            if (parameters.mode == 'autosave')
            {

                if (postHelpers.isOpLock(parameters.editorData.author, parameters.editorData.permlink))
                {
                    cb(null, {
                        locked: true
                    });

                }
                else
                {
                    postHelpers.opLock(parameters.editorData.author, parameters.editorData.permlink);

                    var unixTime = util.time();

                    var contentHash = postHelpers.generateContentHash(); //autosave one
                    var revHash = postHelpers.generateRevHash(contentHash, 0);

                    postHelpers.replaceRevision({
                        revHash: revHash,
                        contentHash: contentHash,
                        publishedTX: '',
                        author: parameters.editorData.author,
                        permlink: parameters.editorData.permlink,
                        authperm: [parameters.editorData.author, parameters.editorData.permlink].join('.'),
                        title: parameters.editorData.title,
                        body: parameters.editorData.body,
                        json_metadata: JSON.stringify(metadata),
                        localDate: unixTime,
                        blockChainDate: 0,
                        date: unixTime,
                        isAutosave: 1
                    }, function(err)
                    {

                        if (err)
                        {
                            postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);
                            cb(err);
                        }
                        else if (parameters.editorData.isNew) //insert post
                        {
                            var postData = {
                                author: parameters.editorData.author,
                                permlink: parameters.editorData.permlink,
                                title: parameters.editorData.title,
                                status: parameters.editorData.postStatus,
                                latestPublishedTX: '',
                                date: unixTime,
                                scheduledDate: 0,
                                featuredImg: featuredImg
                            };

                            //add tags
                            postData = _.extend(postData, postHelpers.metadataToTagsKV(tags));

                            postHelpers.insertPost(postData, function(err)
                            {
                                postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);

                                if (err) return cb(err);

                                cb(null, {
                                    locked: false,
                                    saved: true
                                });

                            });

                        }
                        else //saved
                        {
                            postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);

                            cb(null, {
                                locked: false,
                                saved: true
                            });

                        }

                    });

                }

            }
            else
            {
                cb(new Error('Invalid mode'));
            }

        }

    };

}());
