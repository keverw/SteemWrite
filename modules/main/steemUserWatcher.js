(function()
{
    var _ = require('underscore'),
        kvs = require('./kvs.js');

    function saveBcSyncingMeta(cb)
    {
        kvs.set({
            k: 'watchedUsers',
            v: global.bcSyncingMeta.stored
        }, function(err)
        {
            cb(err);
        });

    }

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
                k: 'watchedUsers'
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
        watchAccount: function(username, modes, cb)
        {
            username = username.toLowerCase();
            modes = _.uniq(modes);

            var doSave = false;

            if (global.bcSyncingMeta.stored.users[username]) //already
            {
                var wasChanged = false;

                for (var key in modes)
                {
                    if (modes.hasOwnProperty(key))
                    {

                        if (!_.contains(global.bcSyncingMeta.stored.users[username].modes, modes[key]))
                        {
                            global.bcSyncingMeta.stored.users[username].modes.push(modes[key]);
                            wasChanged = true;
                        }

                    }

                }

                if (wasChanged)
                {
                    doSave = true;
                    //todo: if wasChanged is true, we need to cancel processing(if processing)
                }

            }
            else //not added
            {
                //-1 means not checked yet
                global.bcSyncingMeta.stored.users[username] = {
                    lastID: -1,
                    lastChecked: -1,
                    modes: modes
                };

                doSave = true;

            }

            //todo: save and call syncAccount...

            //todo: cb is called if it is a function as optional
            //doSave is true is need to do a save to DB...

            //if adding a new mode not already, resync from start
        },
        setAccountLastID: function(username, id)
        {
            //useful to override the last ID to check from

        },
        unwatchAccount: function(username, modes, cb)
        {
            username = username.toLowerCase();
            modes = _.uniq(modes);

            var doSave = false;

            if (global.bcSyncingMeta.stored.users[username]) //added
            {
                var wasChanged = false;

                //remove keys if in array
                for (var key in modes)
                {
                    if (modes.hasOwnProperty(key))
                    {
                        if (_.contains(global.bcSyncingMeta.stored.users[username].modes, modes[key]))
                        {
                            global.bcSyncingMeta.stored.users[username].modes = _.without(global.bcSyncingMeta.stored.users[username].modes, modes[key]);
                            wasChanged = true;
                        }

                    }
                }

                //if modes is empty, remove whole entry
                if (global.bcSyncingMeta.stored.users[username].modes.length === 0)
                {
                    delete global.bcSyncingMeta.stored.users[username];
                    wasChanged = true;
                }

                //
                if (wasChanged)
                {
                    doSave = true;
                    //todo: if wasChanged is true, we need to cancel processing(if processing)
                }

            }

            //todo: cb is called if it is a function as optional
            //doSave is true is need to do a save to DB...

        },
        syncAccount: function(mode, account, from, limit, cb)
        {
            //use global.bcSyncingMeta
        }
    };

}());
