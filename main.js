var electron = require('electron');
// Module to control application life.
var app = electron.app;
// Module to create native browser window.
var BrowserWindow = electron.BrowserWindow;

global.isAppReady = false;
global.isAppClosing = false;

//For DEV
require('electron-reload')(__dirname, {
  electron: require('electron-prebuilt')
});

global.lang = require('./lang/en.json');

global.db = null;

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

require('./modules/main/dbHelpers.js').init(irpcMain);
irpcMain.addModule(require('./modules/main/kvs.js'), 'kvs');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow;

function createWindow()
{
    // Create the browser window.
    mainWindow = new BrowserWindow({
        backgroundColor: '#272b30',
        width: 1200,
        height: 700,
        minWidth: 800,
        minHeight: 500
    });

  // and load the index.html of the app.
  mainWindow.loadURL('file://' + __dirname + '/index.html');

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', function()
  {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.

var path = require('path');
var sqlite3 = require('sqlite3');

app.on('ready', function()
{
    var dbFile = path.join(app.getPath('userData'), 'main.db');

    if (!global.db)
    {
        global.db = new sqlite3.Database(dbFile);
    }

    global.isAppReady = true;
    createWindow();
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
                app.quit();
            });
        }
        else
        {
            allowClose = true;
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
        if (mainWindow === null)
        {
          createWindow();
        }

    }

});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
