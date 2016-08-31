(function ()
{

    /*
    1. if encrypted, app will ask for master password or can click later
    2. top of the app will show an unlocked icon to enter it later. The accounts won't be possible to allow publishing/updating until unlocked.

    Preferences:
    If not encrypted: Will let you set a master password if not one already, update KVS version, add accounts, etc

    If encrypted and authed: change password, add accounts, etc

    if encrypted and unauthed: remove the master password, and then UI will show accounts missing their password/posting key and not allow publishing/updating, etc as that account until they update it.

    Also if encrypted but unauthed: not editing accounts list
    */

    var saltRounds = 10;

    var bcrypt = require('bcrypt'),
        clone = require('fast-clone'),
        kvs = require('./kvs.js');

    if (!global.accountsData)
    {
        global.accountsData = {
            dataLocked: false, //if true - nothing should function while it's rewriting data, loading, etc
            isLoaded: false, //has account info been loaded/init'ed
            masterPass: '', //loaded in memory
            stored: { //this is what's stored in KVS as JSON
                password: '', //bcrypt stored password for validation if encrption enabled
                lastAcc: '',
                accounts: {} //key be the username, holding object with: username, auth: json string of object holding password or posting key?
                //if not encrypted, just plain JSON else encrypted JSON
            }
        };

    }

    function isLoadedAndUnlocked(cb)
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

    }

    function updateStoredAccounts(storedData, oldPassword, newPassword, cb)
    {
        var mode = 'change'; //change stored credentials passphrase

        //if oldPassword is undefined, not encrypted yet
        //if oldPassword and newPassword both are undefined - remove stored credentials
        //if oldPassword and newPassword both are defined - change stored credentials passphrase

        if (oldPassword === undefined && newPassword === undefined)
        {
            mode = 'remove'; //remove stored credentials
        }
        else if (oldPassword === undefined)
        {
            mode = 'encrypt'; //encrypt credentials
        }

        cb(); //temp cb
    }

    module.exports = {
        basicInfo: function(parameters, cb)
        {
            var accountsList = Object.keys(global.accountsData.stored.accounts);
            var totalAccounts = accountsList.length;
            var isEncrypted = ((global.accountsData.stored.password.length > 0) ? true : false);
            var isUnlocked = ((global.accountsData.masterPass.length > 0) ? true : false);

            cb(null, {
                hasAccs: ((totalAccounts > 0) ? true : false),
                totalAccounts: totalAccounts,
                accountsList: accountsList,
                lastAcc: global.accountsData.stored.lastAcc,
                isEncrypted: isEncrypted,
                isUnlocked: isUnlocked,
                isLocked: ((isEncrypted && (!isUnlocked)) ? true : false),
                dataLocked: global.accountsData.dataLocked,
                isLoaded: global.accountsData.isLoaded
            });

        },
        loadAccounts: function(parameters, cb)
        {

            if (global.accountsData.dataLocked) //already loading or saving...
            {
                var dataLockedErr = new Error('Data locked');
                dataLockedErr.type = 'accounts';
                dataLockedErr.code = 'dataLocked';
                cb(dataLockedErr);
            }
            else if (global.accountsData.isLoaded)
            {
                module.exports.basicInfo(parameters, cb);
            }
            else //load data from kvs
            {
                global.accountsData.dataLocked = true;

                kvs.read({
                    k: 'accounts'
                }, function(err, result)
                {
                    if (err)
                    {
                        global.accountsData.dataLocked = false;
                        cb(err);
                    }
                    else if (result && typeof result == 'object')
                    {
                        //has a key stored, convert the data to json and write to stored
                        try {
                            global.accountsData.stored = JSON.parse(result.v);

                            global.accountsData.dataLocked = false;
                            global.accountsData.isLoaded = true;
                            module.exports.basicInfo(parameters, cb);
                        } catch (err)
                        {
                            global.accountsData.dataLocked = false;
                            cb(err, {});
                        }

                    }
                    else //no data stored, use default
                    {
                        global.accountsData.dataLocked = false;
                        global.accountsData.isLoaded = true;
                        module.exports.basicInfo(parameters, cb);
                    }

                });

            }

        },
        accountList: function(parameters, cb)
        {
            //todo: load post counts maybe
            module.exports.loadAccounts(parameters, cb);
        },
        encryptCredentials: function(parameters, cb)
        {
            function doCB(err, info)
            {
                global.accountsData.dataLocked = false;
                cb(err, info);
            }

            ////////////////////////////////////////////////
            isLoadedAndUnlocked(function(ready, msg)
            {
                if (ready)
                {
                    global.accountsData.dataLocked = true;

                    var isEncrypted = ((global.accountsData.stored.password.length > 0) ? true : false);

                    if (isEncrypted)
                    {
                        doCB(null, {msg: 'Credentials Already Encrypted. Use change passphrase instead'});
                    }
                    else
                    {
                        //copy the stored data from memory
                        var storedData = clone(global.accountsData.stored);

                        bcrypt.genSalt(saltRounds, function(err, salt)
                        {
                            if (err) doCB(err);

                            bcrypt.hash(parameters.passphrase, salt, function(err, hash)
                            {
                                if (err) doCB(err);

                                storedData.password = hash;

                                updateStoredAccounts(storedData, undefined, parameters.passphrase, function(err)
                                {
                                    if (err) doCB(err);

                                    //update KVS and local memory
                                    var stringifed = JSON.stringify(storedData);

                                    kvs.set({
                                        k: 'accounts',
                                        v: stringifed
                                    }, function(err)
                                    {
                                        if (err) doCB(err);

                                        global.accountsData.stored = storedData; //update stored data
                                        global.accountsData.masterPass = parameters.passphrase; //update stored pass so unlocked
                                        doCB();

                                    });

                                });

                            });

                        });

                    }

                }
                else
                {
                    //reg callback as no need to unlock
                    cb(null, {msg: msg});
                }

            });

        },
        unlock: function(parameters, cb)
        {
            if (global.accountsData.isLoaded)
            {
                var isUnlocked = ((global.accountsData.masterPass.length > 0) ? true : false);
                var isEncrypted = ((global.accountsData.stored.password.length > 0) ? true : false);

                if (isUnlocked)
                {
                    cb(null, {msg: 'Already unlocked'});
                }
                else if (isEncrypted)
                {
                    bcrypt.compare(parameters.passphrase, global.accountsData.stored.password, function(err, res)
                    {
                        if (err) return cb(err);

                        if (res)
                        {
                            global.accountsData.masterPass = parameters.passphrase;
                            cb(null, {isUnlocked: true, msg: 'Unlocked'});
                        }
                        else
                        {
                            cb(null, {msg: 'Invalid Passphrase.'});
                        }


                    });

                }
                else
                {
                    cb(null, {msg: 'Account Credentials are not currently encrypted.'});
                }

            }
            else
            {
                cb(null, {msg: 'Accounts Data Not Loaded'});
            }

        },
        checkPassphrase: function(parameters, cb)
        {
            if (global.accountsData.isLoaded)
            {
                var isEncrypted = ((global.accountsData.stored.password.length > 0) ? true : false);

                if (isEncrypted)
                {
                    bcrypt.compare(parameters.passphrase, global.accountsData.stored.password, function(err, res)
                    {
                        if (err) return cb(err);

                        if (res)
                        {
                            cb(null, {isCorrect: true});
                        }
                        else
                        {
                            cb(null, {msg: 'Invalid Passphrase.'});
                        }

                    });

                }
                else
                {
                    cb(null, {msg: 'Account Credentials are not currently encrypted.'});
                }

            }
            else
            {
                cb(null, {msg: 'Accounts Data Not Loaded'});
            }
            
        },
        reset: function(parameters, cb)
        {
            function doCB(err, info)
            {
                global.accountsData.dataLocked = false;
                cb(err, info);
            }

            ////////////////////////////////////////////////
            isLoadedAndUnlocked(function(ready, msg)
            {
                if (ready)
                {
                    global.accountsData.dataLocked = true;

                    var isUnlocked = ((global.accountsData.masterPass.length > 0) ? true : false);
                    var isEncrypted = ((global.accountsData.stored.password.length > 0) ? true : false);

                    if (isEncrypted)
                    {
                        if (isUnlocked)
                        {
                            doCB(null, {msg: 'Already unlocked'});
                        }
                        else
                        {
                            //copy the stored data from memory
                            var storedData = clone(global.accountsData.stored);
                            storedData.password = '';

                            updateStoredAccounts(storedData, undefined, undefined, function(err)
                            {
                                if (err) doCB(err);

                                //update KVS and local memory
                                var stringifed = JSON.stringify(storedData);

                                kvs.set({
                                    k: 'accounts',
                                    v: stringifed
                                }, function(err)
                                {
                                    global.accountsData.stored = storedData; //update stored data
                                    doCB(null, {removed: true, msg: 'Password Removed.'});
                                });

                            });

                        }

                    }
                    else
                    {
                        doCB(null, {msg: 'Account Credentials are not currently encrypted.'});
                    }

                }
                else
                {
                    //reg callback as no need to unlock
                    cb(null, {msg: msg});
                }

            });

        }

    };

}());
