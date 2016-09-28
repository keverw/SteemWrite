(function()
{
    var pagination = require('./pagination.js');

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
                    global.db.get("SELECT * FROM revisions WHERE revHash = ? LIMIT 1", [postsRow.revHash], function(err, revisionsRow)
                    {
                        if (err) return cb(err);

                        if (revisionsRow)
                        {
                            var tags = [];

                            try {
                                var metadata = JSON.parse(revisionsRow.json_metadata);

                                if (metadata.tags)
                                {
                                    tags = metadata.tags;
                                }

                            } catch (err)
                            {
                                //
                            }

                            cb(null, {
                                status: 'found',
                                postStatus: postsRow.status,
                                author: revisionsRow.author,
                                permlink: revisionsRow.permlink,
                                title: revisionsRow.title,
                                body: revisionsRow.body,
                                tags: tags
                            });

                        }
                        else
                        {
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

    };

}());
