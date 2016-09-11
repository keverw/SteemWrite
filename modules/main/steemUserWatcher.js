(function()
{
    var _ = require('underscore'),
        uuid = require('node-uuid'),
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
    function isProcessingUser(username)
    {
        username = username.toLowerCase();
        return (global.bcSyncingMeta.processingAccounts[username]) ? true : false;
    }

    function isProcessingReqID(reqID)
    {
        return (global.bcSyncingMeta.processingIDToAccount[reqID]) ? true : false;
    }

    function processingAdd(username)
    {
        username = username.toLowerCase();

        var reqID = uuid.v4();

        if (typeof global.bcSyncingMeta.processingAccounts[username] != 'object')
        {
            global.bcSyncingMeta.processingAccounts[username] = [];
        }

        global.bcSyncingMeta.processingAccounts[username].push(reqID);
        global.bcSyncingMeta.processingIDToAccount[reqID] = username;

        return reqID;
    }

    function processingRemoveUser(username)
    {
        username = username.toLowerCase();

        if (isProcessingUser(username))
        {
            for (var key in global.bcSyncingMeta.processingAccounts[username])
            {
                if (global.bcSyncingMeta.processingAccounts[username].hasOwnProperty(key))
                {
                    processingRemoveReqID(global.bcSyncingMeta.processingAccounts[username][key]);
                }

            }

        }

    }

    function processingRemoveReqID(reqID)
    {
        if (global.bcSyncingMeta.processingIDToAccount[reqID])
        {
            var username = global.bcSyncingMeta.processingIDToAccount[reqID];

            global.bcSyncingMeta.processingAccounts[username] = _.without(global.bcSyncingMeta.processingAccounts[username], reqID); //remove ID from array for account
            delete global.bcSyncingMeta.processingIDToAccount[reqID]; //remove ID from ID to username map

            //if account array is empty, delete the array for the username
            if (global.bcSyncingMeta.processingAccounts[username].length === 0)
            {
                delete global.bcSyncingMeta.processingAccounts[username];
            }
        }

    }

    //////////////////////////////

    module.exports = {
        init: function(cb)
        {
            global.bcSyncingMeta = {
                loaded: false,
                processingAccounts: {}, //accounts currently being processed
                processingIDToAccount: {}, //req IDs to account map
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
                    processingRemoveUser(username); //different modes were added, stop processing for that user
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
                    processingRemoveUser(username); //modes were removed, stop processing for that user
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
        isProcessingUser: isProcessingUser,
        isProcessingReqID: isProcessingReqID,
        processingAdd: processingAdd,
        processingRemoveUser: processingRemoveUser,
        processingRemoveReqID: processingRemoveReqID
    };

}());
