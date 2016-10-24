(function()
{
    var util = require('../util.js'),
        async = require('async'),
        kvs = require('./kvs.js'),
        clone = require('fast-clone'),
        _ = require('underscore'),
        postHelpers = require('./postHelpers.js'),
        steemUserWatcher = require('./steemUserWatcher.js');

    function order(unordered) //http://stackoverflow.com/a/30693905/458642 order keys in ABC order
    {
        return _.object(_.sortBy(_.pairs(unordered), function(o) {
            return o[0];
        }));
    }

    function removeAccountDBRows(username, cb)
    {
        var cmds = {
            delete_posts: 'DELETE FROM posts WHERE author = ?',
            delete_revisions: 'DELETE FROM revisions WHERE author = ?'
        };

        async.eachOfSeries(cmds, function(value, key, callback)
        {
            global.db.run(value, [username], function(err)
            {
                callback(err);
            });

        }, function done(err)
        {
            cb(err);
        });

    }

    module.exports = {
        isLoadedAndDataUnlocked: function(cb)
        {
            if (global.accountsData.isLoaded)
            {
                if (global.accountsData.dataLocked)
                {
                    cb(false, 'Accounts Data Record Locked');
                }
                else
                {
                    cb(true);
                }

            }
            else
            {
                cb(false, 'Accounts Data Not Loaded');
            }

        },
        hasAuth: function(authJSON)
        {
            var info = {
                has: false,
                data: {}
            };

            try {
                var data = JSON.parse(authJSON);

                if (data.password)
                {
                    info.has = true;
                    info.data = data;
                }

            } catch (err)
            {
                console.log(err);
            }

            return info;
        },
        basicInfo: function(cb)
        {
            var accountsList = Object.keys(global.accountsData.stored.accounts);
            var totalAccounts = accountsList.length;
            var hasAccs = ((totalAccounts > 0) ? true : false);

            ///////// Check if accounts have credentials
            var hasCredentials = {};

            for (var acc in accountsList)
            {
                if (accountsList.hasOwnProperty(acc))
                {
                    hasCredentials[accountsList[acc]] = false;

                    if (global.accountsData.stored.accounts[accountsList[acc]] && global.accountsData.stored.accounts[accountsList[acc]].hasAuth)
                    {
                        hasCredentials[accountsList[acc]] = true;
                    }

                }

            }

            postHelpers.countPosts(accountsList, function(err, result)
            {
                if (err) return err;

                var isEncrypted = ((global.accountsData.stored.password.length > 0) ? true : false);
                var isUnlocked = ((global.accountsData.masterPass.length > 0) ? true : false);

                cb(null, {
                    hasAccs: hasAccs,
                    totalAccounts: totalAccounts,
                    accountsList: accountsList,
                    hasCredentials: hasCredentials,
                    draftPostCounts: result.draftPostCounts,
                    scheduledPostCounts: result.scheduledPostCounts,
                    lastAcc: global.accountsData.stored.lastAcc,
                    isEncrypted: isEncrypted,
                    isUnlocked: isUnlocked,
                    isLocked: ((isEncrypted && (!isUnlocked)) ? true : false),
                    dataLocked: global.accountsData.dataLocked,
                    isLoaded: global.accountsData.isLoaded
                });

            });

        },
        updateStoredAccounts: function(storedData, oldPassphrase, newPassphrase, cb)
        {
            var emptyOBJ = JSON.stringify({});
            var mode = 'change'; //change stored credentials passphrase

            //if oldPassphrase is undefined, not encrypted yet
            //if oldPassphrase and newPassphrase both are undefined - remove stored credentials
            //if oldPassphrase and newPassphrase both are defined - change stored credentials passphrase
            //if oldPassphrase and newPassphrase both are defined, but new one is a empty string - then unencrypt but keep credentials

            if (oldPassphrase === undefined && newPassphrase === undefined)
            {
                mode = 'remove'; //remove stored credentials
            }
            else if (oldPassphrase === undefined)
            {
                mode = 'encrypt'; //encrypt credentials
            }

            //loop accounts
            for (var acc in storedData.accounts)
            {
                if (storedData.accounts.hasOwnProperty(acc))
                {

                    //update record
                    if (mode == 'encrypt')
                    {
                        if (storedData.accounts[acc].encrypted) return cb(new Error('Encrypted Already'));

                        storedData.accounts[acc].hasAuth = module.exports.hasAuth(storedData.accounts[acc].auth).has;
                        storedData.accounts[acc].auth = util.encrypt(storedData.accounts[acc].auth, newPassphrase);
                        storedData.accounts[acc].encrypted = true;
                    }
                    else if (mode == 'change')
                    {
                        if (storedData.accounts[acc].encrypted)
                        {
                            var decryptedString = util.decrypt(storedData.accounts[acc].auth, oldPassphrase);
                            storedData.accounts[acc].hasAuth = module.exports.hasAuth(decryptedString).has;

                            if (newPassphrase.length > 0)
                            {
                                storedData.accounts[acc].auth = util.encrypt(decryptedString, newPassphrase);
                                storedData.accounts[acc].encrypted = true;
                            }
                            else
                            {
                                storedData.accounts[acc].auth = decryptedString;
                                storedData.accounts[acc].encrypted = false;
                            }

                        }
                        else
                        {
                            return cb(new Error('Not Encrypted'));
                        }

                    }
                    else if (mode == 'remove')
                    {
                        storedData.accounts[acc].hasAuth = false;
                        storedData.accounts[acc].auth = emptyOBJ;
                        storedData.accounts[acc].encrypted = false;
                    }
                    else
                    {
                        return cb(new Error('Invalid Mode'));
                    }

                }

            }

            cb();
        },
        canAccessAccounts: function(cb)
        {
            var isEncrypted = ((global.accountsData.stored.password.length > 0) ? true : false);
            var isUnlocked = ((global.accountsData.masterPass.length > 0) ? true : false);

            if (isEncrypted && !isUnlocked)
            {
                cb(false, 'Please unlock your encrypted credentials first.'); //need to unlock - bad
            }
            else
            {
                cb(true); //not encrypted or unlocked - good
            }

        },
        accessAccountsReady: function(orignalCB, cb)
        {
            //this function handles if accessing accounts is ready and handles the locking part
            //if it's ready cb will be called with a doneCB function to call when done
            //else orignalCB will be called with an error

            function doneCB(err, info)
            {
                global.accountsData.dataLocked = false;
                orignalCB(err, info);
            }

            ////////////////////////////////////////////////
            module.exports.isLoadedAndDataUnlocked(function(ready, msg)
            {
                if (ready)
                {
                    global.accountsData.dataLocked = true;

                    module.exports.canAccessAccounts(function(ready, msg)
                    {
                        if (ready) return cb(doneCB);

                        doneCB(null, {
                            msg: msg
                        });

                    });

                }
                else
                {
                    //orignal callback as no need to unlock
                    orignalCB(null, {
                        msg: msg
                    });

                }

            });

        },
        accessDataReadyUnencrypted: function(orignalCB, cb)
        {
            //same as accessAccountsReady but doesn't check if unencrypted

            function doneCB(err, info)
            {
                global.accountsData.dataLocked = false;
                orignalCB(err, info);
            }

            ////////////////////////////////////////////////
            module.exports.isLoadedAndDataUnlocked(function(ready, msg)
            {
                if (ready)
                {
                    global.accountsData.dataLocked = true;
                    cb(doneCB);
                }
                else
                {
                    //orignal callback as no need to unlock
                    orignalCB(null, {
                        msg: msg
                    });

                }

            });

        },
        checkSteemLogin: function(username, password, cb)
        {
            //cb is: err, status, login
            //status codes:
            //notfound - account matching the username was not found
            //badlogin - wrong password
            //good - login was successful

            if (global.bcReady)
            {

                global.bc.database_api().exec('get_accounts', [[username]])
                    .then(function(res)
                    {
                        if (res.length > 0)
                        {
                            var account = res[0];

                            var Login = require('steemjs-lib').Login;
                            var login = new Login();
                            login.setRoles(['posting', 'active']);

                            if (login.checkKeys({
                                    accountName: username,
                                    password: password,
                                    auths: {
                                        active: account.active.key_auths,
                                        posting: account.posting.key_auths
                                    }
                                }))
                            {
                                cb(null, 'good', login);
                            }
                            else
                            {
                                cb(null, 'badlogin');
                            }

                        }
                        else
                        {
                            cb(null, 'notfound');
                        }

                    })
                    .catch(function(e)
                    {
                        cb(e);
                    });

            }
            else
            {
                cb(new Error('Blockchain not ready yet'));
            }

        },
        addAccount: function(username, password, cb)
        {
            var isEncrypted = ((global.accountsData.stored.password.length > 0) ? true : false);
            username = username.toLowerCase();

            if (typeof global.accountsData.stored.accounts[username] == 'object')
            {
                cb(null, 'already');
            }
            else
            {
                module.exports.checkSteemLogin(username, password, function(err, status, login)
                {
                    if (err) cb(err);

                    if (status == 'notfound' || status == 'badlogin')
                    {
                        cb(null, status);
                    }
                    else if (status == 'good')
                    {
                        var authStr = JSON.stringify({
                            password: password
                        });

                        if (isEncrypted) authStr = util.encrypt(authStr, global.accountsData.masterPass);

                        //Copy storedData before modifying
                        var storedData = clone(global.accountsData.stored);

                        //Add to storage
                        storedData.accounts[username] = {
                            username: username,
                            encrypted: isEncrypted,
                            hasAuth: true,
                            auth: authStr
                        };

                        order(storedData.accounts); //order to be ABC order

                        //set added account to the last account
                        storedData.lastAcc = username;

                        //update KVS and local memory
                        var stringifed = JSON.stringify(storedData);

                        kvs.set({
                            k: 'accounts',
                            v: stringifed
                        }, function(err)
                        {
                            if (err) return cb(err);

                            global.accountsData.stored = storedData; //update stored data

                            //watch account
                            steemUserWatcher.watchAccountAndSync(username, ['posts'], function(err, status, reqID)
                            {
                                if (status != 'processing-started')
                                {
                                    cb(null, 'added');
                                }

                            }, function(err, status, reqID)
                            {
                                cb(null, 'added');
                            });

                        });

                    }
                    else
                    {
                        cb(null, 'unknown');
                    }

                });

            }

        },
        useAccount: function(username, role, cb)
        {
            //cb is: err, status, login
            //statuses:
            //notloaded - account data not loaded
            //locked - is encrypted but not unlocked - "Please unlock your encrypted credentials first"
            //notadded - account not currently added
            //noauth - auth removed due to reset or missing that type of key
            //notfound - account matching the username was not found
            //badlogin - wrong password
            //good - login was successful

            if (global.accountsData.isLoaded)
            {
                module.exports.canAccessAccounts(function(ready, msg)
                {
                    if (ready)
                    {
                        //check for username
                        username = username.toLowerCase();

                        if (typeof global.accountsData.stored.accounts[username] == 'object')
                        {
                            if (global.accountsData.stored.accounts[username].hasAuth)
                            {
                                var authLoaded = false;
                                var authObj = {};

                                if (global.accountsData.stored.accounts[username].encrypted)
                                {

                                    try {
                                        authObj = JSON.parse(util.decrypt(global.accountsData.stored.accounts[username].auth, global.accountsData.masterPass));
                                        authLoaded = true;
                                    } catch (err)
                                    {
                                        return cb(err);
                                    }

                                }
                                else
                                {

                                    try {
                                        authObj = JSON.parse(global.accountsData.stored.accounts[username].auth);
                                        authLoaded = true;
                                    } catch (err)
                                    {
                                        return cb(err);
                                    }

                                }

                                if (authLoaded) module.exports.checkSteemLogin(username, authObj.password, cb);

                            }
                            else
                            {
                                cb(null, 'noauth');
                            }

                        }
                        else
                        {
                            cb(null, 'notadded');
                        }

                    }
                    else
                    {
                        cb(null, 'locked');
                    }

                });

            }
            else
            {
                cb(null, 'notloaded');
            }

        },
        useAccountStatus2Text: function(status)
        {
            var statusCodes = {
                notloaded: 'Accounts Data Not Loaded',
                locked: 'Please unlock your encrypted credentials first',
                notadded: 'Account is not currently added',
                noauth: 'Account authentication credentials not found. Please edit the password saved for this account.',
                notfound: 'No account matching given username',
                badlogin: 'Incorrect Password',
                good: 'Account authentication credentials were successfully validated!'
            };

            return (statusCodes.hasOwnProperty(status)) ? statusCodes[status] : null; //string, else null if unknown
        },
        removeAccount: function(username, cb)
        {
            //cb - err, status

            username = username.toLowerCase();

            if (typeof global.accountsData.stored.accounts[username] == 'object')
            {
                //account found - check post counts
                postHelpers.countPostsByUser(username, function(err, meta)
                {
                    if (err) return cb(err);

                    if (meta.drafts > 0)
                    {
                        cb(null, 'hasdrafts');
                    }
                    else if (meta.scheduled > 0)
                    {
                        cb(null, 'has_scheduled');
                    }
                    else
                    {
                        //actually can remove the account at this point

                        //Copy storedData before modifying
                        var storedData = clone(global.accountsData.stored);

                        //remove from storage
                        delete storedData.accounts[username];

                        //if current lastAcc
                        if (storedData.lastAcc == username)
                        {
                            var accountsList = Object.keys(storedData.accounts);
                            var totalAccounts = accountsList.length;

                            if (totalAccounts > 0)
                            {
                                storedData.lastAcc = accountsList[0]; //first account found
                            }
                            else
                            {
                                storedData.lastAcc = ''; //no other accounts
                            }

                        }

                        //update KVS and local memory
                        var stringifed = JSON.stringify(storedData);

                        kvs.set({
                            k: 'accounts',
                            v: stringifed
                        }, function(err)
                        {
                            if (err) return cb(err);

                            steemUserWatcher.unwatchAccount(username, ['posts']); //unwatch account

                            removeAccountDBRows(username, function(err)
                            {
                                if (err) return cb(err);

                                global.accountsData.stored = storedData; //update stored data

                                setTimeout(function()
                                {
                                    removeAccountDBRows(username, function(err)
                                    {
                                        if (err) return cb(err);

                                        cb(null, 'removed');
                                    });

                                }, 1000);

                            });

                        });

                    }

                });

            }
            else
            {
                cb(null, 'notadded');
            }

        },
        editAccountPassword: function(username, password, cb)
        {
            //cb - err, status

            var isEncrypted = ((global.accountsData.stored.password.length > 0) ? true : false);
            username = username.toLowerCase();

            if (typeof global.accountsData.stored.accounts[username] == 'object')
            {
                module.exports.checkSteemLogin(username, password, function(err, status, login)
                {
                    if (err) cb(err);

                    if (status == 'notfound' || status == 'badlogin')
                    {
                        cb(null, status);
                    }
                    else if (status == 'good')
                    {
                        var authStr = JSON.stringify({
                            password: password
                        });

                        if (isEncrypted) authStr = util.encrypt(authStr, global.accountsData.masterPass);

                        //Copy storedData before modifying
                        var storedData = clone(global.accountsData.stored);

                        //Update storage
                        storedData.accounts[username].encrypted = isEncrypted;
                        storedData.accounts[username].hasAuth = true;
                        storedData.accounts[username].auth = authStr;

                        //update KVS and local memory
                        var stringifed = JSON.stringify(storedData);

                        kvs.set({
                            k: 'accounts',
                            v: stringifed
                        }, function(err)
                        {
                            if (err) return cb(err);

                            global.accountsData.stored = storedData; //update stored data
                            cb(null, 'changed');
                        });

                    }
                    else
                    {
                        cb(null, 'unknown');
                    }

                });

            }
            else
            {
                cb(null, 'notadded');
            }

        },
        switchAccount: function(username, cb)
        {
            //cb - err, status
            username = username.toLowerCase();

            if (typeof global.accountsData.stored.accounts[username] == 'object')
            {
                if (global.accountsData.stored.lastAcc == username)
                {
                    cb(null, 'alreadyswitched');
                }
                else
                {
                    //Copy storedData before modifying
                    var storedData = clone(global.accountsData.stored);

                    //update to account they switched to
                    storedData.lastAcc = username;

                    //update KVS and local memory
                    var stringifed = JSON.stringify(storedData);

                    kvs.set({
                        k: 'accounts',
                        v: stringifed
                    }, function(err)
                    {
                        if (err) return cb(err);

                        global.accountsData.stored = storedData; //update stored data
                        cb(null, 'switched');
                    });

                }

            }
            else
            {
                cb(null, 'notadded');
            }

        }

    };

}());
