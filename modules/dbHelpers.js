(function ()
{
    global.didMigrateCheck = false;
    global.isMigrateingDone = false;

    var appDBVer = 1; //app DB ver num
    var userDBVer = -1; //user app db num

    var isDBReady = false;
    var dbTask = ''; //i for init, u for upgrading

    //progress bar
    var totalSteps = 0;
    var doneSteps = 0;

    //checks if it needs to migrate, and then does it if so.
    function dbMigrateCheck()
    {
        if (global.didMigrateCheck) return;
        global.didMigrateCheck = true;

        //get db version
        global.db.get("PRAGMA user_version", function(err, row)
        {
            if (err)
            {
                global.closeWithError(err);
                global.isMigrateingDone = true;
            }
            else if (typeof row.user_version == 'number')
            {
                userDBVer = row.user_version;

                if (userDBVer > appDBVer)
                {
                    global.closeWithError(global.lang.appErrors.newerDB);
                    global.isMigrateingDone = true;
                }
                else
                {
                    dbMigrate();
                }

            }
            else
            {
                global.closeWithError('user_version is not a number');
                global.isMigrateingDone = true;
            }

        });

    }

    //note: when user is wanting to close... finsh up step and then stop - use global.isAppClosing to detect it then set global.isMigrateingDone to true to allow closing
    function dbMigrate()
    {
        setTimeout(function()
        {
            //user is wanting to quit...
            if (global.isAppClosing)
            {
                global.isMigrateingDone = true;
                return;
            }

            //do migrations
            if (userDBVer > -1)
            {
                if (userDBVer === 0)
                {
                    // dbTask: dbTask,
                    // totalSteps: totalSteps,
                    // doneSteps: doneSteps

                    //i for init, u for upgrading


                    userDBVer = 1;
                    dbMigrate();
                }
                else //no upgrades
                {
                    global.isMigrateingDone = true;
                    isDBReady = true;
                }

            }
            else
            {
                global.closeWithError('userDBVer is not a positive number');
                global.isMigrateingDone = true;
            }

        }, 1);

    }

    module.exports = {
        init: function(irpcMain)
        {
            if (global.dbHelpersLoaded)
            {
                throw new Error('dbHelpersLoaded loaded already');
            }

            global.dbHelpersLoaded = true;

            //add to irpc
            irpcMain.addModule({
                isReady: function(parameters, cb)
                {
                    if (global.isAppReady && global.db) dbMigrateCheck();

                    cb(null, {
                        ready: isDBReady,
                        dbTask: dbTask,
                        totalSteps: totalSteps,
                        doneSteps: doneSteps
                    });

                }
            }, 'dbHelpers');

        }
    };

}());
