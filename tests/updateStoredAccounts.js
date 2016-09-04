var accountHelpers = require('../modules/main/accountHelpers.js');

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

var authStr = JSON.stringify({
    password: 'bar'
});

global.accountsData.stored.accounts.foo = {
    username: 'foo',
    encrypted: false,
    hasAuth: true,
    auth: authStr
};

console.log('As is: ', global.accountsData.stored);
accountHelpers.updateStoredAccounts(global.accountsData.stored, undefined, 'lol', function(err) //set passphrase
    {
        if (err) console.log(err);
        if (!err)
        {
            console.log('set passphrase', global.accountsData.stored);

            accountHelpers.updateStoredAccounts(global.accountsData.stored, 'lol', 'lmao', function(err) //change passphrase
                {
                    if (err) console.log(err);

                    if (!err)
                    {
                        console.log('change passphrase', global.accountsData.stored);

                        accountHelpers.updateStoredAccounts(global.accountsData.stored, 'lmao', '', function(err) //unencrypt credentials
                            {
                                if (err) console.log(err);
                                if (!err)
                                {
                                    console.log('unencrypt credentials', global.accountsData.stored);

                                    accountHelpers.updateStoredAccounts(global.accountsData.stored, undefined, undefined, function(err) //remove credentials
                                        {
                                            if (err) console.log(err);
                                            if (!err)
                                            {
                                                console.log('remove credentials', global.accountsData.stored);
                                            }

                                        });

                                }

                            });

                    }

                });

        }

    });
