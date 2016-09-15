(function()
{
    var async = require('async');

    var cmds = {
        auto_vacuum: 'PRAGMA auto_vacuum = 1',
        make_cvsTBL: 'CREATE TABLE `kvs` (`k` TEXT, `v` TEXT, PRIMARY KEY(k));',
        make_postsTBL: 'CREATE TABLE `posts` (`author` TEXT, `permlink` TEXT, `title` TEXT, `status` TEXT, `latestPublishedTX` TEXT, `revHash` TEXT, `date` INTEGER, `scheduledDate` INTEGER, `tag1` TEXT, `tag2` TEXT, `tag3` TEXT, `tag4` TEXT, `tag5` TEXT, `featuredImg` TEXT, PRIMARY KEY(`author`,`permlink`));',
        make_revisionsTBL: 'CREATE TABLE `revisions` (`revHash` TEXT, `publishedTX` TEXT, `author` TEXT, `permlink` TEXT, `title` TEXT, `body` TEXT, `json_metadata` TEXT, `localDate` INTEGER, `blockChainDate` INTEGER, `date` INTEGER, `isAutosave` INTEGER, PRIMARY KEY(`revHash`));'
    };

    module.exports = {
        getTotal: Object.keys(cmds).length, //how many things you plan on doing
        migrate: function(doneCB)
        {
            async.eachOfSeries(cmds, function(value, key, callback)
            {
                global.db.run(value, function(err)
                {
                    callback(err);
                });

            }, function done(err) {
                if (err) global.dbMigrateErr(err);
                doneCB(true); //true to commit, false to roll back and exit
            });

        }

    };

}());
