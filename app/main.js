//fix for win32 not finding native modules https://github.com/electron-userland/electron-packager/issues/217#issuecomment-168223915
var path = require('path');

module.paths.push(path.resolve('node_modules'));
module.paths.push(path.resolve('../node_modules'));
module.paths.push(path.resolve(__dirname, '..', '..', '..', '..', 'resources', 'app', 'node_modules'));
module.paths.push(path.resolve(__dirname, '..', '..', '..', '..', 'resources', 'app.asar', 'node_modules'));

global.appConfig = require('./appConfig.json');
global.appConfig.appVersion = require('./package.json').version;
global.lang = require('./lang/en.json');

global.mainPath = __dirname;

global.moment = require('moment-timezone');
global.tz = global.moment.tz.guess();

// Module to control application life.
var electron = require('electron');
var app = electron.app;

function makeSingleInstance() {
    return app.makeSingleInstance(function() {
        if (global.mainWindow) {
            if (global.mainWindow.isMinimized()) global.mainWindow.restore();
            global.mainWindow.focus();
        }
    });
}

if (makeSingleInstance()) return app.quit();

// Module to create native browser window.
var BrowserWindow = electron.BrowserWindow;

global.isAppReady = false;
global.isAppClosing = false;

if (global.appConfig.dev)
{
    require('electron-reload')(__dirname, {
        electron: require('electron')
    });
}

var kvs = require('./modules/main/kvs.js'),
    accounts = require('./modules/main/accounts.js'),
    util = require('./modules/util.js'),
    steemUserWatcher = require('./modules/main/steemUserWatcher.js'),
    posts = require('./modules/main/posts.js');

global.db = null; //SQLite3 connection
global.bc = null; //BC connection
global.bcReady = false; //BC connection ready
global.bcHardfork = '';
global.bcStatus = ''; //BC connection status
global.bcNode = ''; //BC connection node
global.bcRestart = false; //bc require restart
global.postOpLocks = {}; //locks for like when changing permalinks for unpublished posts

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

    //connect to websocket node
    var steemClient = require('steem-rpc').Client;

    kvs.read({
        k: 'wsNode'
    }, function(err, result)
    {
        if (err) return global.closeWithError(parameters.err);

        var wsHost = (result && typeof result == 'object') ? result.v : global.appConfig.defaultWS;
        global.bcNode = wsHost;

        ////////////////////////////////////////////
        util.enhancedBCConnect({
            maxReconnectAttempts: null, //unlimited reconnect attempts
            idleThreshold: 0,
            apis: ['database_api', 'login_api', 'network_broadcast_api'],
            url: wsHost,
            statusCallback: function(e)
            {
                //possibly errors strings: open, closed, error
                bcAlertUI(e);
            }
        }, function(err) {
            if (err)
            {
                bcAlertUI('error');
            }
            else
            {
                bcAlertUI('open');
                steemUserWatcher.sync();
            }

        });

    });

});

require('./modules/main/dbHelpers.js').init(irpcMain);
irpcMain.addModule(kvs, 'kvs');
irpcMain.addModule(accounts, 'accounts');
irpcMain.addModule(posts, 'posts');

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
        minWidth: 1000,
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
    if (global.isAppClosing)
    {
        app.quit();
    }
    else if (global.isAppReady)
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
    else if (global.mainWindow) //is defined and not null
    {
        return false;
    }
    else //nothing that says no
    {
        return true;
    }

}

var askedMainWindowToClose = false;

function doClose()
{
    if (!askedMainWindowToClose)
    {
        askedMainWindowToClose = true;
        if (global.mainWindow) global.mainWindow.close();
    }

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
