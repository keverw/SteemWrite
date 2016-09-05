global.appConfig = require('./appConfig.json');
global.appConfig.appVersion = require('./package.json').version;
global.lang = require('./lang/en.json');

var electron = require('electron');
// Module to control application life.
var app = electron.app;

function makeSingleInstance() {
    return app.makeSingleInstance(function() {
        if (global.mainWindow) {
            if (global.mainWindow.isMinimized()) global.mainWindow.restore();
            global.mainWindow.focus();
        }
    });
}

if (makeSingleInstance())
{
    return app.quit();
}

// Module to create native browser window.
var BrowserWindow = electron.BrowserWindow;

global.isAppReady = false;
global.isAppClosing = false;

if (global.appConfig.dev)
{
    require('electron-reload')(__dirname, {
        electron: require('electron-prebuilt')
    });
}

var kvs = require('./modules/main/kvs.js'),
    accounts = require('./modules/main/accounts.js');

global.db = null; //SQLite3 connection
global.bc = null; //BC connection
global.bcReady = false; //BC connection ready
global.bcStatus = ''; //BC connection status
global.bcNode = ''; //BC connection node
global.bcRestart = false; //bc require restart

var dialog = require('electron').dialog;

global.closeWithError = function(msg)
{
    if (typeof msg == 'object') msg = msg.message; //convert error object to use it's string
    dialog.showErrorBox(global.lang.appErrors.title, msg);
    app.quit();
};

global.justClose = function()
{
    app.quit();
};

global.isDBReady = function(cb)
{
    if (global.db)
    {
        cb();
    }
    else
    {
        var notReadyErr = new Error('Database not ready');
        notReadyErr.type = 'db';
        notReadyErr.code = 'notReady';
        cb(notReadyErr);
    }

};

// IRPC Modules
var irpc = require('electron-irpc');
var irpcMain = irpc.main();

irpcMain.addFunction('closeWithError', function(parameters, cb)
{
    cb(null, {
        ok: true
    });

    global.closeWithError(parameters.err);
});

var doRelaunch = false;
irpcMain.addFunction('relaunch', function(parameters, cb)
{
    doRelaunch = true;
    cb(null, {
        ok: true
    });

    app.relaunch({
        args: process.argv.slice(1) + ['--relaunch']
    });

    app.quit();
});

irpcMain.addFunction('quit', function(parameters, cb)
{
    cb(null, {
        ok: true
    });

    app.quit();
});

function bcAlertUI(status)
{
    global.bcStatus = status;

    if (global.mainWindow)
    {
        global.mainWindow.webContents.send('bc-status', {
            ready: global.bcReady,
            status: global.bcStatus,
            node: global.bcNode,
            restart: global.bcRestart
        });

    }

}

var bcConnLock = false;

irpcMain.addFunction('update-wshost', function(parameters, cb)
{
    kvs.set(parameters, function(err)
    {
        if (err) return cb(err);

        global.bcRestart = (global.bcNode != parameters.v);
        cb(null, {
            ready: global.bcReady,
            status: global.bcStatus,
            node: global.bcNode,
            restart: global.bcRestart
        });

    });

});

irpcMain.addFunction('bc-connect', function(parameters, cb)
{
    //tell the status
    cb(null, {
        ready: global.bcReady,
        status: global.bcStatus,
        node: global.bcNode,
        restart: global.bcRestart
    });

    if (bcConnLock) return;
    bcConnLock = true;

    //connect
    var steemClient = require('steem-rpc').Client;

    kvs.read({
        k: 'wsNode'
    }, function(err, result)
    {
        if (err) global.closeWithError(parameters.err);

        var wsHost = (result && typeof result == 'object') ? result.v : global.appConfig.defaultWS;
        global.bcNode = wsHost;

        /////////////////////////////////////////////
        global.bc = steemClient.get({
            maxReconnectAttempts: null, //unlimited reconnect attempts
            idleThreshold: 0,
            apis: ['database_api', 'login_api', 'network_broadcast_api'],
            url: wsHost,
            statusCallback: function(e)
            {
                //possibly errors strings: open, closed, error
                bcAlertUI(e);
            }
        }, true);

        global.bc.initPromise.then(function(res)
        {
            global.bcReady = true;
            console.log("*** Connected to", res, "***");

            // Pulse the websocket every 20 seconds for block number 1, just to make
            // sure the websocket doesn't disconnect.
            setInterval(function()
            {
                global.bc.database_api().exec('get_block', [1]).then(function(res)
                {
                    //console.log('database_api res', res);
                }).catch(function(e)
                {
                    //console.log('database_api res', e);
                });

            }, 20000);

        }).catch(function(err)
        {
            console.log('Connection error:', err);
            bcAlertUI('error');
        });

    });

});

require('./modules/main/dbHelpers.js').init(irpcMain);
irpcMain.addModule(kvs, 'kvs');
irpcMain.addModule(accounts, 'accounts');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
global.mainWindow = null;

global.createWindow = function()
{
    if (global.mainWindow) return;

    // Create the browser window.
    global.mainWindow = new BrowserWindow({
        backgroundColor: '#272b30',
        width: 1200,
        height: 700,
        minWidth: 800,
        minHeight: 500
    });

    // and load the index.html of the app.
    global.mainWindow.loadURL('file://' + __dirname + '/index.html');

    // Open the DevTools.
    //mainWindow.webContents.openDevTools();

    // Emitted when the window is closed.
    global.mainWindow.on('closed', function()
    {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        global.mainWindow = null;
    });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.

var path = require('path');
var sqlite3 = require('sqlite3');

app.on('ready', function()
{
    require('./menu.js').init(app);

    var dbFile = path.join(app.getPath('userData'), 'main.db');

    if (!global.db)
    {
        global.db = new sqlite3.Database(dbFile);
    }

    global.isAppReady = true;
    global.createWindow();
});

// Quit when all windows are closed.
app.on('window-all-closed', function()
{
    if (global.isAppReady && !global.isAppClosing)
    {
        // On OS X it is common for applications and their menu bar
        // to stay active until the user quits explicitly with Cmd + Q
        if (process.platform !== 'darwin')
        {
            app.quit();
        }

    }

});

var allowClose = false;

function canIClose()
{
    if (!global.isMigrateingDone) //migrating isn't done/stopped
    {
        return false;
    }
    else //nothing that says no
    {
        return true;
    }

}

function doClose()
{
    if (canIClose())
    {
        if (global.db) //db isn't null, close it
        {
            global.db.close(function(err)
            {
                allowClose = true;

                if (err) return global.closeWithError(err);

                if (doRelaunch)
                {
                    app.relaunch({
                        args: process.argv.slice(1) + ['--relaunch']
                    });
                }

                app.quit();
            });
        }
        else
        {
            allowClose = true;

            if (doRelaunch)
            {
                app.relaunch({
                    args: process.argv.slice(1) + ['--relaunch']
                });
            }

            app.quit(); //close later
        }

    }
    else
    {
        setTimeout(function()
        {
            doClose(); //try again
        }, 100);
    }

}

app.on('before-quit', function(event)
{
    if (!global.isAppClosing) //not running closing code
    {
        global.isAppClosing = true;
        event.preventDefault();
        doClose();
    }
    else if (!allowClose) //not allowed to close
    {
        event.preventDefault();
    }

});

app.on('activate', function()
{
    if (global.isAppReady && !global.isAppClosing)
    {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (global.mainWindow === null)
        {
            global.createWindow();
        }

    }

});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
