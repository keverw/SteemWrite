(function()
{
	var Menu = require('electron').Menu;

	module.exports = {
		init: function(app)
		{
			var template = [];

			//Edit Menu
			template.push(
			{
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
			});

			//View Menu
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

			viewMenu.submenu.push({
				role: 'togglefullscreen'
			});

			template.push(viewMenu);

			//Window Menu
			template.push(
			{
				role: 'window',
				submenu: [
				{
					role: 'minimize'
				},
				{
					role: 'close'
				}]
			});

			//Help Menu
			template.push(
			{
				role: 'help',
				submenu: [
				{
					label: 'Learn More',
					click: function click()
					{
						require('electron').shell.openExternal('http://electron.atom.io');
					}
				}]
			});

			//Mac Menu Adjustments
			if (process.platform === 'darwin')
			{
				var name = app.getName();

				template.unshift(
				{
					label: name,
					submenu: [
					{
						role: 'about'
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

				// Edit menu.
				template[1].submenu.push(
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

				// Window menu.
				template[3].submenu = [
				{
					label: 'Close',
					accelerator: 'CmdOrCtrl+W',
					role: 'close'
				},
				{
					label: 'Minimize',
					accelerator: 'CmdOrCtrl+M',
					role: 'minimize'
				},
				{
					label: 'Zoom',
					role: 'zoom'
				}];
			}

			// Set the menu
			var menu = Menu.buildFromTemplate(template);
			Menu.setApplicationMenu(menu);

		}
	};

})();
