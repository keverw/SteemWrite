(function ()
{
    var async = require('async');

    var cmds = {
        auto_vacuum: 'PRAGMA auto_vacuum = 1',
        make_cvsTBL: 'CREATE TABLE `kvs` (`k` TEXT, `v`	TEXT, PRIMARY KEY(k));',
        insertDefault_host: 'INSERT INTO kvs (`k`, `v`) VALUES ("defaultWS", "' + global.appConfig.defaultWS + '");'
    };
    
    module.exports = {
        getTotal: Object.keys(cmds).length, //how many things you plan todo
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
