(function()
{
    var clone = require('fast-clone'),
        kvs = require('./kvs.js');

    module.exports = {
        init: function(cb)
        {
            global.bcSyncingMeta = {
                loaded: false,
                processing: [], //accounts currently being processed
                stored: {
                    users: { //each user is key lowername name holding a object with: lastID, modes, lastChecked

                    }
                }
            };

            //load from KVS
            kvs.read({
                k: 'accounts'
            }, function(err, result) {
                if (err) return cb(err);

                if (result && typeof result == 'object')
                {
                    try {
                        global.bcSyncingMeta.stored = JSON.parse(result.v);
                        global.bcSyncingMeta.loaded = true;
                        cb();
                    }
                    catch (err)
                    {
                        cb(err);
                    }

                }
                else //no data stored, use default
                {
                    global.bcSyncingMeta.loaded = true;
                    cb();
                }

            });

        },
        sync: function()
        {
            //ready to sync
        },
        watchAccount: function(username, modes)
        {
            //probably shoud watch when added and when switched to?
        },
        setAccountLastID: function(username, id)
        {
            //useful to override the last ID to check from

        },
        unwatchAccount: function(username, modes)
        {
            //if all modes gone, remove
        },
        syncAccount: function(mode, account, from, limit, cb)
        {
            //use global.bcSyncingMeta
        }
    };

}());
