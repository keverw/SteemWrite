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

    var bcrypt = require('bcrypt'),
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

        }
    };

}());
