(function()
{
    var async = require('async');

    var cmds = {
        auto_vacuum: 'PRAGMA auto_vacuum = 1',
        make_cvsTBL: 'CREATE TABLE `kvs` (`k` TEXT, `v`	TEXT, PRIMARY KEY(k));'
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
