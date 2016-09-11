(function()
{
    var _ = require('underscore'),
        kvs = require('./kvs.js');

    function saveBcSyncingMeta(cb)
    {
        kvs.set({
            k: 'watchedUsers',
            v: JSON.stringify(global.bcSyncingMeta.stored)
        }, function(err)
        {
            cb(err);
        });

    }

    //////////////////////////////
    function isProcessing(username)
    {
        username = username.toLowerCase();
        return _.contains(global.bcSyncingMeta.processing, username);
    }

    function processingAdd(username)
    {
        username = username.toLowerCase();
        global.bcSyncingMeta.processing.push(username);
    }

    function processingRemove(username)
    {
        username = username.toLowerCase();
        global.bcSyncingMeta.processing = _.without(global.bcSyncingMeta.processing, username);
    }

    //////////////////////////////

    module.exports = {
        init: function(cb)
        {
            global.bcSyncingMeta = {
                loaded: false,
                processing: [], //accounts currently being processed
                stored: {
                    users: { //each user is key lowername name holding a object with: lastID, modes, lastCheckedTime

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
                    module.exports.setAccountLastID(username, -1);
                    processingRemove(username); //diffrent modes were added, stop processing
                }

            }
            else //not added
            {
                //-1 means not checked yet
                global.bcSyncingMeta.stored.users[username] = {
                    lastID: -1,
                    lastCheckedTime: -1,
                    modes: modes
                };

                doSave = true;

            }

            //handle saving/cb
            if (doSave)
            {
                saveBcSyncingMeta(function(err)
                {
                    if (cb) return cb(err);

                    module.exports.syncAccount(username);
                });
            }
            else
            {
                if (cb) return cb();
            }

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

                ///////////////////////////////////////////////////////////////
                if (wasChanged)
                {
                    doSave = true;
                    processingRemove(username); //modes were removed, stop processing
                }

            }

            //handle saving/cb
            if (doSave)
            {
                saveBcSyncingMeta(function(err)
                {
                    if (cb) return cb(err);
                });
            }
            else
            {
                if (cb) return cb();
            }

        },
        setAccountLastID: function(username, id)
        {
            if (global.bcSyncingMeta.stored.users[username])
            {
                global.bcSyncingMeta.stored.users[username].lastID = id;
            }

        },
        syncAccount: function(username, cb)
        {
            //syncAccount: function(mode, account, from, limit, cb)
            //use global.bcSyncingMeta
        },
        isProcessing: isProcessing,
        processingAdd: processingAdd,
        processingRemove: processingRemove
    };

}());
