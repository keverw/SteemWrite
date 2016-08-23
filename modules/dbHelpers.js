(function ()
{
    global.didMigrateCheck = false;
    global.isMigrateingDone = false;
    global.dbMeta = {
        appDBVer: 1,  //app DB ver num
        userDBVer: -1, //user app db num
        dbTask: '', //i for init, u for upgrading
        totalSteps: 0, //progress bar - total steps
        doneSteps: 0 //progress bar - steps done so far
    };

    global.dbMigrateErr = function(err)
    {
        global.isMigrateingDone = true;
        global.closeWithError(err);
    };

    var isDBReady = false;

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
                global.dbMigrateErr(err);
            }
            else if (typeof row.user_version == 'number')
            {
                global.dbMeta.userDBVer = row.user_version;

                if (global.dbMeta.userDBVer > global.dbMeta.appDBVer)
                {
                    global.dbMigrateErr(global.lang.appErrors.newerDB);
                }
                else
                {
                    dbMigrate();
                }

            }
            else
            {
                global.dbMigrateErr('user_version is not a number');
            }

        });

    }

    function runMigration(file, version)
    {
        global.db.run('BEGIN TRANSACTION', function(err)
        {
            if (err) return global.dbMigrateErr(err);

            require('../migrations/' + file + '.js').migrate(function(commit)
            {

                if (commit) //commit
                {
                    //update version
                    global.db.run('PRAGMA user_version = ' + version, function(err)
                    {
                        if (err) return global.dbMigrateErr(err);

                        //do commit
                        global.db.run('COMMIT', function(err)
                        {
                            if (err) return global.dbMigrateErr(err);

                            global.dbMeta.userDBVer = version;
                            global.dbMeta.doneSteps++;
                            dbMigrate();
                        });

                    });

                }
                else //rollback
                {
                    global.db.run('ROLLBACK', function(err)
                    {
                        if (err) return global.dbMigrateErr(err);

                        global.isMigrateingDone = true;
                        global.justClose();
                    });

                }

            });

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
            if (global.dbMeta.userDBVer > -1)
            {

                if (global.dbMeta.userDBVer === 0) //init
                {
                    global.dbMeta.dbTask = 'i';
                    global.dbMeta.totalSteps++;
                    global.dbMeta.totalSteps = global.dbMeta.totalSteps + require('../migrations/init.js').getTotal;
                    
                    runMigration('init', global.dbMeta.appDBVer);
                }
                else //non empty db - check for upgrading
                {
                    //todo: check if they need a upgrade or not
                    //if yes, caluate for progress and mark as done. then do each file.

                    //global.dbMeta.dbTask = 'u';

                    global.isMigrateingDone = true;
                    isDBReady = true;
                }

            }
            else
            {
                global.dbMigrateErr('userDBVer is not a positive number');
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
                        dbTask: global.dbMeta.dbTask,
                        totalSteps: global.dbMeta.totalSteps,
                        doneSteps: global.dbMeta.doneSteps,
                        appDBVer: global.dbMeta.appDBVer,
                        userDBVer: global.dbMeta.userDBVer
                    });

                }
            }, 'dbHelpers');

        }
    };

}());
