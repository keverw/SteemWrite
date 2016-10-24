//dummy environment to test against
var path = require('path');
var sqlite3 = require('sqlite3');

var dbPath = path.resolve('/users/kevinwhitman/Library/Application Support/SteemWrite/main.db'); //path to DB file

global.db = new sqlite3.Database(dbPath);

global.isDBReady = function(cb)
{
    cb();
};

//connect to blockchain
global.bc = null; //BC connection
global.bcReady = false; //BC connection ready
global.bcHardfork = '';

var util = require('../modules/util.js');

////Test Code
util.enhancedBCConnect({}, function(err)
{
    if (!err)
    {
        test();
    }

});

//test steemUserWatcher
function test()
{
    var steemUserWatcher = require('../modules/main/steemUserWatcher.js');

    var processItemFN = function(reqMeta, resultData, cb)
    {
        //note: should account for duplicated results
        console.log(resultData);
        cb();
    };

    steemUserWatcher.init(processItemFN, function(err)
    {
        if (err) console.log(err);

        // steemUserWatcher.sync();

        //steemUserWatcher.watchAccount('keverw', ['posts']);

        steemUserWatcher.watchAccountAndSync('keverw', ['posts'], function(err, status, reqID)
        {
            console.log(err, status, reqID);
        }, function(err, status, reqID)
        {
            console.log('done cb', err, status, reqID);
        });
        //
        // console.log(global.bcSyncingMeta.stored.users);
        //
        // setTimeout(function()
        // {
        //     steemUserWatcher.watchAccount('keverw', ['updater']); //in a real app you'd add both at the same time to be more efficient if you were to add multiples at once
        //
        //     console.log(global.bcSyncingMeta.stored.users);
        // }, 10000);

        // steemUserWatcher.watchAccount('keverw', ['posts', 'updater']);
        // console.log(global.bcSyncingMeta.stored.users);

        //test remove:
        // steemUserWatcher.unwatchAccount('keverw', ['posts']);
        // console.log(global.bcSyncingMeta.stored.users);
        //
        // steemUserWatcher.unwatchAccount('keverw', ['updater']);
        // console.log(global.bcSyncingMeta.stored.users);

        // steemUserWatcher.unwatchAccount('keverw', ['posts', 'updater']);
        // console.log(global.bcSyncingMeta.stored.users);

        //test processing tracking functions
        // console.log(steemUserWatcher.isProcessingUser('keverw'));
        // console.log(steemUserWatcher.isProcessingReqID('d9d7c573-db53-4e9b-ad83-36a6f546bea8'));
        //
        // //add req
        // var id = steemUserWatcher.processingAdd('keverw');
        //
        // console.log(steemUserWatcher.isProcessingUser('keverw'));
        // console.log(steemUserWatcher.isProcessingReqID(id));
        //
        // steemUserWatcher.processingRemoveUser('keverw');
        //
        // console.log(steemUserWatcher.isProcessingUser('keverw'));
        // console.log(steemUserWatcher.isProcessingReqID(id));

    });
}
