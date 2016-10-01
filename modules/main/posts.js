(function()
{
    var _ = require('underscore'),
        pagination = require('./pagination.js'),
        postHelpers = require('./postHelpers.js'),
        util = require('../util.js'),
        textHelpers = require('../textHelpers.js'),
        editorUtility = require('../editorUtility.js');

    module.exports = {
        postList: function(parameters, cb)
        {
            var output = {};

            function processResults(err, rows)
            {
                if (err) return cb(err);

                output.posts = rows;
                cb(null, output);
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

                            global.db.get("SELECT * FROM revisions WHERE revHash = ? LIMIT 1", [lookupRev], function(err, revisionsRow)
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

            console.log('output', metadata);

            //console.log(parameters);

            //
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
                    console.log('locking...');
                    postHelpers.opLock(parameters.editorData.author, parameters.editorData.permlink);

                    setTimeout(function()
                    {
                        postHelpers.opUnlock(parameters.editorData.author, parameters.editorData.permlink);

                        console.log('unlocking...');

                        cb(null, {
                            locked: false
                        });

                    }, 10000);

                }

            }
            else
            {
                cb(new Error('Invalid mode'));
            }

        }

    };

}());
