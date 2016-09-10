//dummy environment to test against
var path = require('path');
var sqlite3 = require('sqlite3');

var dbPath = path.resolve('/users/kevinwhitman/Library/Application Support/SteemWrite/main.db'); //path to DB file

global.db = new sqlite3.Database(dbPath);

global.isDBReady = function(cb)
{
    cb();
};

//test steemUserWatcher
var steemUserWatcher = require('../modules/main/steemUserWatcher.js');

steemUserWatcher.init(function(err)
{
    if (err) console.log(err);


    // steemUserWatcher.watchAccount('keverw', ['posts']);
    //
    // console.log(global.bcSyncingMeta.stored.users);
    //
    // steemUserWatcher.watchAccount('keverw', ['updater']); //in a real app you'd add both at the same time to be more efficient if you were to add multiples at once
    //
    // console.log(global.bcSyncingMeta.stored.users);

    steemUserWatcher.watchAccount('keverw', ['posts', 'updater']);
    console.log(global.bcSyncingMeta.stored.users);

    //test remove:
    // steemUserWatcher.unwatchAccount('keverw', ['posts']);
    // console.log(global.bcSyncingMeta.stored.users);
    //
    // steemUserWatcher.unwatchAccount('keverw', ['updater']);
    // console.log(global.bcSyncingMeta.stored.users);

    steemUserWatcher.unwatchAccount('keverw', ['posts', 'updater']);
    console.log(global.bcSyncingMeta.stored.users);
});
