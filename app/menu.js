(function()
{
    //note: If this is ever translated in the future - replace the role: ones with what's in menu-item-roles.js in the electron-master
    //note: Then translate each label

    var electronShell = require('electron').shell,
        Menu = require('electron').Menu;

    function displayDialog(focusedWindow, dialogName)
    {
        if (focusedWindow) //is the focused window
        {
            focusedWindow.webContents.send('display-dialog', dialogName);
        }
        else if (global.mainWindow) //has a main window
        {
            global.mainWindow.webContents.send('display-dialog', dialogName);

            if (global.mainWindow.isMinimized()) global.mainWindow.restore();
            global.mainWindow.focus();
        }
        else //does not have a main window
        {
            if (global.isAppReady && !global.isAppClosing)
            {
                global.createWindow();

                global.mainWindow.webContents.once('dom-ready', function()
                {
                    global.mainWindow.webContents.send('display-dialog', dialogName);
                });

            }

        }
    }

    function getAboutMenuItem(appName)
    {
        return {
            label: process.platform === 'linux' ? 'About' : 'About ' + appName,
            click: function click(item, focusedWindow)
            {
                displayDialog(focusedWindow, 'about');
            }
        };

    }

    function getEditMenu() //Edit Menu
    {
        var editMenu = {
            label: 'Edit',
            submenu: [
                {
                    role: 'undo'
			},
                {
                    role: 'redo'
			},
                {
                    type: 'separator'
			},
                {
                    role: 'cut'
			},
                {
                    role: 'copy'
			},
                {
                    role: 'paste'
			},
                {
                    role: 'pasteandmatchstyle'
			},
                {
                    role: 'delete'
			},
                {
                    role: 'selectall'
			}]
        };

        if (process.platform === 'darwin')
        {
            editMenu.submenu.push(
            {
                type: 'separator'
            },
            {
                label: 'Speech',
                submenu: [
                    {
                        role: 'startspeaking'
				},
                    {
                        role: 'stopspeaking'
				}]
            });
        }

        return editMenu;
    }

    function getViewMenu() //View Menu
    {
        var viewMenu = {
            label: 'View',
            submenu: []
        };

        if (global.appConfig.dev)
        {
            viewMenu.submenu.push(
            {
                label: 'Reload',
                accelerator: 'CmdOrCtrl+R',
                click: function click(item, focusedWindow)
                {
                    if (focusedWindow) focusedWindow.reload();
                }
            },
            {
                label: 'Toggle Developer Tools',
                accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
                click: function click(item, focusedWindow)
                {
                    if (focusedWindow) focusedWindow.webContents.toggleDevTools();
                }
            },
            {
                type: 'separator'
            });

        }

        viewMenu.submenu.push(
        {
            role: 'togglefullscreen'
        });

        return viewMenu;
    }

    function getFileMenu() //File Menu
    {
        var fileMenu = {
            label: 'File',
            submenu: []
        };

        if (process.platform !== 'darwin') //add settings menu on non Mac
        {
            fileMenu.submenu.push({
                label: 'Options…',
                accelerator: 'CmdOrCtrl+,',
                click: function click(item, focusedWindow)
                {
                    displayDialog(focusedWindow, 'settings');
                }
            });
        }

        if (process.platform !== 'darwin') //add exit on non Mac
        {
            fileMenu.submenu.push(
            {
                type: 'separator'
            },
            {
                role: 'quit'
            });
        }

        return fileMenu;
    }

    function getWindowMenu() //Window Menu
    {
        return {
            role: 'window',
            submenu: [
                {
                    label: 'Minimize',
                    accelerator: 'CmdOrCtrl+M',
                    role: 'minimize'
			},
                {
                    label: 'Zoom',
                    role: 'zoom'
			}]
        };

    }

    function getHelpMenu(appName) //Help Menu
    {
        var helpMenu = {
            role: 'help',
            submenu: []
        };

        helpMenu.submenu.push(
        {
            label: 'Issue Tracker',
            click: function click()
            {
                electronShell.openExternal('https://github.com/keverw/SteemWrite/issues');
            }
        },
        {
            label: 'Steem Profile',
            click: function click()
            {
                electronShell.openExternal('https://steemit.com/@steemwrite');
            }
        });

        if (process.platform !== 'darwin') //Add about on non Mac platforms
        {
            helpMenu.submenu.push(
                {
                    type: 'separator'
                },
                getAboutMenuItem(appName)
            );
        }

        return helpMenu;
    }

    module.exports = {
        init: function(app)
        {
            var appName = app.getName();

            var template = [];

            //File Menu
            if (process.platform !== 'darwin') //not currently used on OS X
            {
                template.push(getFileMenu()); //add file menu
            }

            template.push(getEditMenu()); //add edit menu

            //View Menu
            template.push(getViewMenu()); //add view menu

            //Window Menu
            if (process.platform === 'darwin')
            {
                template.push(getWindowMenu());
            }

            //Help Menu
            template.push(getHelpMenu(appName));

            //Mac Menu Adjustments
            if (process.platform === 'darwin')
            {
                template.unshift(
                {
                    label: appName,
                    submenu: [getAboutMenuItem(appName),
                        {
                            type: 'separator'
					},
                        {
                            label: 'Preferences…',
                            accelerator: 'CmdOrCtrl+,',
                            click: function click(item, focusedWindow)
                            {
                                displayDialog(focusedWindow, 'settings');
                            }
                    },
                        {
                            type: 'separator'
					},
                        {
                            role: 'services',
                            submenu: []
					},
                        {
                            type: 'separator'
					},
                        {
                            role: 'hide'
					},
                        {
                            role: 'hideothers'
					},
                        {
                            role: 'unhide'
					},
                        {
                            type: 'separator'
					},
                        {
                            role: 'quit'
					}]
                });

            }

            // Set the menu
            var menu = Menu.buildFromTemplate(template);
            Menu.setApplicationMenu(menu);

        }
    };

})();
