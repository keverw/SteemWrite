(function()
{
    var _ = require('underscore'),
        uuid = require('node-uuid'),
        kvs = require('./kvs.js'),
        clone = require('fast-clone'),
        async = require('async'),
        util = require('../util.js');

    var get_account_historyLimit = 500;

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

    function processingRemoveUserExcludeReqID(username, lockReqID)
    {
        username = username.toLowerCase();

        if (isProcessingUser(username))
        {
            for (var key in global.bcSyncingMeta.processingAccounts[username])
            {
                if (global.bcSyncingMeta.processingAccounts[username].hasOwnProperty(key))
                {
                    var cReqID = global.bcSyncingMeta.processingAccounts[username][key];

                    if (lockReqID != cReqID)
                    {
                        processingRemoveReqID(cReqID);
                    }

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
    function _syncAccount(reqMeta, cb)
    {
        //cb - err, status, reqID
        function updateLastID(lastID)
        {
            if (isProcessingReqID(reqMeta.reqID) && (!global.isAppClosing))
            {
                if (global.bcSyncingMeta.stored.users[reqMeta.username])
                {
                    global.bcSyncingMeta.stored.users[reqMeta.username].lastID = lastID;
                }
            }
        }

        function updateLastCheckedTime(time)
        {
            if (isProcessingReqID(reqMeta.reqID) && (!global.isAppClosing))
            {
                if (global.bcSyncingMeta.stored.users[reqMeta.username])
                {
                    global.bcSyncingMeta.stored.users[reqMeta.username].lastCheckedTime = time;
                }
            }

        }

        function isDone()
        {
            if (isProcessingReqID(reqMeta.reqID) && (!global.isAppClosing))
            {
                if (global.bcSyncingMeta.stored.users[reqMeta.username])
                {
                    updateLastCheckedTime(util.time());

                    saveBcSyncingMeta(function(err)
                    {
                        processingRemoveReqID(reqMeta.reqID);
                        if (cb) cb(err, 'done', reqMeta.reqID);
                    });

                }
                else
                {
                    if (cb) cb(null, 'canceled', reqMeta.reqID);
                }

            }
            else
            {
                if (cb) cb(null, 'canceled', reqMeta.reqID);
            }

        }

        function getLastID()
        {
            return (global.bcSyncingMeta.stored.users[reqMeta.username]) ? global.bcSyncingMeta.stored.users[reqMeta.username].lastID : -1;
        }

        function grabAccHistory(from)
        {
            var limit = get_account_historyLimit;
            from = (from == -1) ? limit : from + limit;

            global.bc.database_api().exec('get_account_history', [reqMeta.username, from, limit])
                .then(function(res)
                {
                    if (isProcessingReqID(reqMeta.reqID) && (!global.isAppClosing))
                    {
                        if (res.length > 0)
                        {
                            var foundNewResults = false;

                            async.eachOfSeries(res, function(value, key, callback)
                            {
                                if (isProcessingReqID(reqMeta.reqID) && (!global.isAppClosing))
                                {
                                    var resultID = value[0];
                                    var resultData = value[1];

                                    if (resultID > getLastID()) //new ID found
                                    {
                                        foundNewResults = true;

                                        var newReqMeta = {
                                            username: reqMeta.username,
                                            reqID: reqMeta.reqID,
                                            modes: reqMeta.modes
                                        };

                                        global.bcSyncingMeta.processItemFN(newReqMeta, resultData, function(err)
                                        {
                                            if (err) return callback(err);

                                            updateLastID(resultID);
                                            callback();
                                        });

                                    }
                                    else //not new
                                    {
                                        callback();
                                    }

                                }
                                else //skip if canceled
                                {
                                    callback();
                                }

                            }, function(err)
                            {
                                if (isProcessingReqID(reqMeta.reqID) && (!global.isAppClosing))
                                {
                                    if (err)
                                    {
                                        if (cb) cb(err);
                                    }
                                    else
                                    {
                                        if (foundNewResults)
                                        {
                                            //check for more results
                                            var lastIDLookup = getLastID();

                                            if (lastIDLookup > -1)
                                            {
                                                grabAccHistory(lastIDLookup);
                                            }
                                            else
                                            {
                                                isDone();
                                            }

                                        }
                                        else
                                        {
                                            isDone();
                                        }

                                    }

                                }
                                else
                                {
                                    if (cb) cb(null, 'canceled', reqMeta.reqID);
                                }

                            });

                        }
                        else //no results found
                        {
                            updateLastCheckedTime(util.time());
                            if (cb) cb(null, 'done', reqMeta.reqID);
                        }

                    }
                    else
                    {
                        if (cb) cb(null, 'canceled', reqMeta.reqID);
                    }

                })
                .catch(function(e)
                {
                    if (cb) return cb(e);
                });

        }

        if (isProcessingReqID(reqMeta.reqID) && (!global.isAppClosing))
        {
            grabAccHistory(reqMeta.lastID);
        }
        else
        {
            if (cb) cb(null, 'canceled', reqMeta.reqID);
        }

    }

    function _watchAccount(doSync, username, modes, cb, doneCB)
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

        //watchAccount
        //_watchAccount(false, username, modes, cb);

        //watchAccountAndSync
        //_watchAccount(true, username, modes, cb, doneCB);

        //handle saving/cb
        if (doSave)
        {
            saveBcSyncingMeta(function(err)
            {
                if (err) return cb(err);

                if (doSync)
                {
                    module.exports.syncAccount(username, cb, doneCB);
                }

            });

        }
        else
        {
            if (doSync)
            {
                module.exports.syncAccount(username, cb, doneCB);
            }
            else
            {
                if (cb) cb();
            }

        }

    }

    function _checkIfNewHF(cb)
    {
        if (global.bcSyncingMeta.hfUpdateLock)
        {
            var isUnlockedTimer = setInterval(function()
            {
                if (!global.bcSyncingMeta.hfUpdateLock)
                {
                    //no longer locked
                    clearInterval(isUnlockedTimer);
                    cb();
                }

            }, 100);
        }
        else
        {
            //Check if hardfork version changed
            if (global.bcSyncingMeta.stored.HFVer == global.bcHardfork)
            {
                //No Change
                cb();
            }
            else
            {
                console.log('Detected Change', global.bcHardfork); //temp

                //Detected Change
                global.bcSyncingMeta.hfUpdateLock = true;
                global.bcSyncingMeta.stored.HFVer = global.bcHardfork;

                //loop users
                for (var key in global.bcSyncingMeta.stored.users)
                {
                    if (global.bcSyncingMeta.stored.users.hasOwnProperty(key))
                    {
                        //lock user, release all other locks
                        var userLock = processingAdd(key);
                        processingRemoveUserExcludeReqID(key, userLock);

                        //update vars
                        global.bcSyncingMeta.stored.users[key].lastID = -1;
                        global.bcSyncingMeta.stored.users[key].lastCheckedTime = -1;

                        //release lock for account
                        processingRemoveReqID(userLock);

                    }

                }

                //release lock
                global.bcSyncingMeta.hfUpdateLock = false;
                cb();

            }

        }

    }

    //Exported API
    module.exports = {
        init: function(processItemFN, cb)
        {
            if (global.bcSyncingMeta) //already inited
            {
                return cb();
            }

            //not inited
            global.bcSyncingMeta = {
                loaded: false,
                processItemFN: processItemFN,
                processingAccounts: {}, //accounts currently being processed
                processingIDToAccount: {}, //req IDs to account map
                hfUpdateLock: false,
                stored: {
                    HFVer: '',
                    users: { //each user is key lowername name holding a object with: lastID, modes, lastCheckedTime

                    }
                }
            };

            //load from KVS
            kvs.read({
                k: 'watchedUsers'
            }, function(err, result) {
                if (err) return cb(err); //return because error

                if (result && typeof result == 'object')
                {
                    try {
                        global.bcSyncingMeta.stored = JSON.parse(result.v);
                        global.bcSyncingMeta.loaded = true;
                        cb();
                    }
                    catch (err)
                    {
                        return cb(err); //return because error
                    }

                }
                else //no data stored, use default
                {
                    global.bcSyncingMeta.loaded = true;
                    cb();
                }

            });

            //set sync timer
            var interval = setInterval(function()
            {
                if (global.isAppClosing)
                {
                    clearInterval(interval);
                    return;
                }

                module.exports.sync();

            }, 50); //check every 50 milliseconds

        },
        sync: function(cb)
        {
            if (global.bcReady)
            {

                //Check if hardfork version changed
                _checkIfNewHF(function(err)
                {
                    if (err)
                    {
                        if (cb) cb(err);
                    }
                    else
                    {
                        //Check for accounts to sync
                        var cTime = util.time();
                        //var syncInterval = 60 * 3; //3 min
                        var syncInterval = 30; //every 30 seconds - note this is in seconds and not milliseconds

                        var syncList = [];

                        //check what users need synced
                        for (var key in global.bcSyncingMeta.stored.users)
                        {
                            if (global.bcSyncingMeta.stored.users.hasOwnProperty(key))
                            {

                                if (global.bcSyncingMeta.stored.users[key].lastCheckedTime == -1)
                                {
                                    syncList.push(key);
                                }
                                else if (cTime - global.bcSyncingMeta.stored.users[key].lastCheckedTime > syncInterval)
                                {
                                    syncList.push(key);
                                }

                            }

                        }

                        //start sync - limited to 3 at a time
                        async.eachOfLimit(syncList, 3, function iteratee(value, key, callback)
                        {
                            module.exports.syncAccount(value, function(err, status, reqID)
                            {
                                if (err) return callback(err);

                                //callback only if not 'processing-started'
                                if (status != 'processing-started')
                                {
                                    callback();
                                }

                            }, function(err, status, reqID)
                            {
                                //sync done callback
                                callback(err);
                            });

                        }, function done(err)
                        {
                            if (cb) cb(err);
                        });

                    }

                });

            }
            else
            {
                //blockchain isn't ready yet for syncing
                if (cb) return cb(null, 'syncnotready');
            }

        },
        watchAccount: function(username, modes, cb)
        {
            _watchAccount(false, username, modes, cb);
        },
        watchAccountAndSync: function(username, modes, cb, doneCB)
        {
            _watchAccount(true, username, modes, cb, doneCB);
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
        syncAccount: function(username, cb, onDoneCB)
        {
            //cb - err, status, reqID(only if status == 'processing-started')
            if (global.bcReady)
            {
                //Check if hardfork version changed
                _checkIfNewHF(function(err)
                {
                    if (err)
                    {
                        if (cb) cb(err);
                    }
                    else
                    {
                        username = username.toLowerCase();

                        if (global.bcSyncingMeta.stored.users[username]) //added
                        {

                            if (isProcessingUser(username))
                            {
                                if (cb) return cb(null, 'processing-already');
                            }
                            else
                            {
                                var id = processingAdd(username);

                                var originalReq = clone(global.bcSyncingMeta.stored.users[username]);
                                originalReq.reqID = id;
                                originalReq.username = username;

                                if (cb) cb(null, 'processing-started', id); //no return since processing more after
                                _syncAccount(originalReq, onDoneCB);
                            }

                        }
                        else //account not added
                        {
                            if (cb) return cb(null, 'notfound');
                        }

                    }

                });

            }
            else
            {
                //blockchain isn't ready yet for syncing
                if (cb) return cb(null, 'syncnotready');
            }

        },
        isProcessingUser: isProcessingUser,
        isProcessingReqID: isProcessingReqID,
        processingAdd: processingAdd,
        processingRemoveUser: processingRemoveUser,
        processingRemoveReqID: processingRemoveReqID
    };

}());
