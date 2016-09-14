(function()
{
    var async = require('async'),
        sha1 = require('sha1');

    module.exports = {
        countPostsByUser: function(username, cb)
        {
            //todo: query db for draft's and scheduled to return real data

            cb(null, {
                drafts: 0,
                scheduled: 0
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
        generateRevHash: function(author, permlink, title, body, json_metadata)
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

        }

    };

}());
