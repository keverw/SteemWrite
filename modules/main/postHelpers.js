(function()
{
    var async = require('async'),
        sha1 = require('sha1'),
        sqlHelpers = require('./sqlHelpers.js');

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
        generateContentHash: function(author, permlink, title, body, json_metadata)
        {
            // revHash should be: author, permlink, title, body, json_metadata
            // title, body, json_metadata are set to autosave in the hash if it’s a autosave
            if (author && permlink && title && body && json_metadata)
            {
                return sha1([author, permlink, title, body, json_metadata].join(','));
            }
            else
            {
                return sha1([author, permlink, 'autosave', 'autosave', 'autosave'].join(','));
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

        }

    };

}());
