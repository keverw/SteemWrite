(function()
{
    var _ = require('underscore'),
        async = require('async'),
        sha1 = require('sha1'),
        sqlHelpers = require('./sqlHelpers.js'),
        jsonHash = require('json-hash');

    module.exports = {
        countPostsByUser: function(username, cb)
        {
            global.db.get("SELECT (SELECT COUNT(*) FROM posts WHERE author = ? AND status='scheduled') AS scheduled, (SELECT COUNT(*) FROM posts WHERE author = ? AND status='drafts') AS drafts", [username, username], function(err, row) {
                if (err) return cb(err);

                cb(null, {
                    drafts: row.drafts,
                    scheduled: row.scheduled
                });

            });

        },
        countPosts: function(accountsList, cb)
        {
            //count posts for all users
            var results = {
                draftPostCounts: {},
                scheduledPostCounts: {}
            };

            if (accountsList.length > 0)
            {
                async.eachOfSeries(accountsList, function(value, key, callback)
                {
                    module.exports.countPostsByUser(value, function(err, meta)
                    {
                        if (err) return callback(err);

                        results.draftPostCounts[value] = meta.drafts;
                        results.scheduledPostCounts[value] = meta.scheduled;
                        callback();
                    });

                }, function done(err)
                {
                    if (err) return cb(err);
                    cb(null, results);

                });

            }
            else
            {
                cb(null, results);
            }

        },
        generateContentHash: function(title, body, json_metadata)
        {
            // title, body, json_metadata are set to autosave in the hash if it’s a autosave
            if (title && body && json_metadata)
            {
                return sha1([title, body, json_metadata].join(','));
            }
            else
            {
                return sha1(['autosave', 'autosave', 'autosave'].join(','));
            }

        },
        generateRevHash: function(contentHash, blockChainDate)
        {
            return sha1([contentHash, blockChainDate].join(','));
        },
        insertRevision: function(parameters, cb)
        {
            sqlHelpers.insert(parameters, function(string, values)
            {
                global.db.run('INSERT OR IGNORE INTO revisions ' + string, values, function(err)
                {
                    cb(err);
                });

            });

        },
        replaceRevision: function(parameters, cb)
        {
            sqlHelpers.insert(parameters, function(string, values)
            {
                global.db.run('REPLACE INTO revisions ' + string, values, function(err)
                {
                    cb(err);
                });

            });

        },
        insertPost: function(parameters, cb)
        {
            sqlHelpers.insert(parameters, function(string, values)
            {

                global.db.run('INSERT OR IGNORE INTO posts ' + string, values, function(err)
                {
                    cb(err);
                });

            });

        },
        metadataToTagsKV: function(metadata)
        {
            //returns a object with the tag1, tag2, etc set based on the metaData object
            var tag1 = (metadata && typeof metadata == 'object' && metadata.tags && typeof metadata.tags == 'object' && metadata.tags[0]) ? metadata.tags[0] : '';
            var tag2 = (metadata && typeof metadata == 'object' && metadata.tags && typeof metadata.tags == 'object' && metadata.tags[1]) ? metadata.tags[1] : '';
            var tag3 = (metadata && typeof metadata == 'object' && metadata.tags && typeof metadata.tags == 'object' && metadata.tags[2]) ? metadata.tags[2] : '';
            var tag4 = (metadata && typeof metadata == 'object' && metadata.tags && typeof metadata.tags == 'object' && metadata.tags[3]) ? metadata.tags[3] : '';
            var tag5 = (metadata && typeof metadata == 'object' && metadata.tags && typeof metadata.tags == 'object' && metadata.tags[4]) ? metadata.tags[4] : '';

            return {
                tag1: tag1,
                tag2: tag2,
                tag3: tag3,
                tag4: tag4,
                tag5: tag5
            };

        },
        updatePost: function(author, permlink, updateData, cb)
        {
            //author, permlink, updateData
            sqlHelpers.update(updateData, function(string, values)
            {
                values.push(author);
                values.push(permlink);

                global.db.run('UPDATE posts SET ' + string + ' WHERE author = ? AND permlink = ?', values, function(err)
                {
                    cb(err);
                });

            });

        },
        getLatestRevisons: function(authperms, cb)
        {
            global.db.all(sqlHelpers.inParam('SELECT authperm, revHash from revisions WHERE isAutosave = 0 AND authperm in (?#) GROUP BY authperm ORDER BY date DESC', authperms), authperms, function(err, rows)
            {
                if (err) return cb(err);

                var results = {};

                if (rows.length > 0)
                {
                    for (var i in rows)
                    {
                        if (rows.hasOwnProperty(i))
                        {
                            results[rows[i].authperm] = rows[i].revHash;
                        }

                    }

                }

                cb(err, results);
            });

        },
        getAutosaves: function(authperms, cb)
        {
            global.db.all(sqlHelpers.inParam('SELECT authperm, revHash from revisions WHERE isAutosave = 1 AND authperm in (?#)', authperms), authperms, function(err, rows)
            {
                if (err) return cb(err);

                var results = {};

                if (rows.length > 0)
                {
                    for (var i in rows)
                    {
                        if (rows.hasOwnProperty(i))
                        {
                            results[rows[i].authperm] = rows[i].revHash;
                        }

                    }

                }

                cb(err, results);
            });

        },
        getRevInfo: function(authperm, cb)
        {
            var result = {
                latestRevison: '',
                autosaveRevison: ''
            };

            module.exports.getLatestRevisons([authperm], function(err, results)
            {
                if (err) return cb(err);

                if (results[authperm])
                {
                    result.latestRevison = results[authperm];
                }

                module.exports.getAutosaves([authperm], function(err, results)
                {
                    if (err) return cb(err);

                    if (results[authperm])
                    {
                        result.autosaveRevison = results[authperm];
                    }

                    cb(null, result);
                });

            });

        },
        getLatestContentHash: function(authperm, cb)
        {
            global.db.get('SELECT contentHash from revisions WHERE isAutosave = 0 AND authperm = ? GROUP BY authperm ORDER BY date DESC', [authperm], function(err, row)
            {
                if (err) return cb(err);

                if (row)
                {
                    cb(null, row.contentHash);
                }
                else
                {
                    cb(null, '');
                }

            });

        },
        deleteAutosave: function(author, permlink, cb)
        {
            var autoSaveContentHash = module.exports.generateContentHash(); //autosave one

            global.db.run("DELETE FROM revisions WHERE isAutosave = 1 AND contentHash = ? AND author = ? AND permlink = ?", [autoSaveContentHash, author, permlink], function(err)
            {
                cb(err);
            });
        },
        saveAutosave: function(metadata, tags, featuredImg, unixTime, editorData, cb)
        {
            var contentHash = module.exports.generateContentHash(); //autosave one
            var revHash = module.exports.generateRevHash(contentHash, 0);

            module.exports.replaceRevision({
                revHash: revHash,
                contentHash: contentHash,
                publishedTX: '',
                author: editorData.author,
                permlink: editorData.permlink,
                authperm: [editorData.author, editorData.permlink].join('.'),
                title: editorData.title,
                body: editorData.body,
                json_metadata: JSON.stringify(metadata),
                localDate: unixTime,
                blockChainDate: 0,
                date: unixTime,
                isAutosave: 1
            }, function(err)
            {
                if (err) cb(err);

                if (editorData.isNew) //insert post
                {
                    var postData = {
                        author: editorData.author,
                        permlink: editorData.permlink,
                        title: editorData.title,
                        status: editorData.postStatus,
                        latestPublishedTX: '',
                        date: unixTime,
                        scheduledDate: 0,
                        featuredImg: featuredImg,
                        warningMsg: ''
                    };

                    //add tags
                    postData = _.extend(postData, module.exports.metadataToTagsKV(tags));

                    module.exports.insertPost(postData, function(err)
                    {
                        if (err) return cb(err);

                        cb(null, {
                            locked: false,
                            saved: true,
                            autosaveRevison: revHash
                        });

                    });

                }
                else //not new post
                {

                    cb(null, {
                        locked: false,
                        saved: true,
                        autosaveRevison: revHash
                    });
                }

            });

        },
        saveDraft: function(metadata, tags, featuredImg, unixTime, editorData, cb)
        {

            var contentHash = module.exports.generateContentHash(editorData.title, editorData.body, JSON.stringify(metadata));
            var revHash = module.exports.generateRevHash(contentHash, unixTime);

            var authperm = [editorData.author, editorData.permlink].join('.');

            // check if already saved:
            module.exports.getLatestContentHash(authperm, function(err, latestContentHash)
            {
                if (err) return cb(err);

                if (latestContentHash == contentHash) //already saved this version
                {
                    //delete if any autosaves if already saved main
                    module.exports.deleteAutosave(editorData.author, editorData.permlink, function(err)
                    {
                        cb(err, {
                            status: 'alreadySaved'
                        });

                    });

                }
                else
                {

                    module.exports.replaceRevision({
                        revHash: revHash,
                        contentHash: contentHash,
                        publishedTX: '',
                        permlink: editorData.permlink,
                        author: editorData.author,
                        authperm: [editorData.author, editorData.permlink].join('.'),
                        title: editorData.title,
                        body: editorData.body,
                        json_metadata: JSON.stringify(metadata),
                        localDate: unixTime,
                        blockChainDate: 0,
                        date: unixTime,
                        isAutosave: 0
                    }, function(err)
                    {
                        if (err) return cb(err);

                        var postData = {
                            title: editorData.title,
                            date: unixTime,
                            featuredImg: featuredImg,
                        };

                        //add tags
                        postData = _.extend(postData, module.exports.metadataToTagsKV(tags));

                        if (editorData.isNew) //insert post
                        {
                            postData.author = editorData.author;
                            postData.permlink = editorData.permlink;
                            postData.status = editorData.postStatus;
                            postData.latestPublishedTX = '';
                            postData.scheduledDate = 0;
                            postData.warningMsg = '';

                            module.exports.insertPost(postData, function(err)
                            {
                                if (err) return cb(err);

                                module.exports.deleteAutosave(editorData.author, editorData.permlink, function(err)
                                {
                                    if (err) cb(err);

                                    cb(err, {
                                        status: 'saved',
                                        publishPanel: {
                                            date: unixTime,
                                            autosaveRevison: ''
                                        }

                                    });

                                });

                            });

                        }
                        else //saved
                        {

                            module.exports.updatePost(editorData.author, editorData.permlink, postData, function(err)
                            {
                                if (err) cb(err);

                                module.exports.deleteAutosave(editorData.author, editorData.permlink, function(err)
                                {
                                    if (err) cb(err);

                                    cb(err, {
                                        status: 'saved',
                                        publishPanel: {
                                            date: unixTime,
                                            autosaveRevison: ''
                                        }

                                    });

                                });

                            });

                        }

                    });

                }

            });

        },
        isOpLock: function(author, permalink)
        {
            var str = author + '.' + permalink;
            return (typeof global.postOpLocks[str] == 'boolean');
        },
        opLock: function(author, permalink)
        {
            var str = author + '.' + permalink;
            global.postOpLocks[str] = true;
        },
        opUnlock: function(author, permalink)
        {
            var str = author + '.' + permalink;
            delete global.postOpLocks[str];
        },
        comparePost: function(editorData, editorMetadataObj, bcGetContentResult)
        {
            if (bcGetContentResult.body.length > 0) //found post for that slug
            {
                //Title is the same
                if (editorData.title === bcGetContentResult.title) return true;

                //Body is the same
                if (editorData.body === bcGetContentResult.body) return true;

                //JSON is the same
                if (jsonHash.digest(editorMetadataObj) === jsonHash.digest(JSON.parse(bcGetContentResult.json_metadata))) return true;
            }

            return false;
        }

    };

}());
