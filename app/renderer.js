// This file is loaded by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

global.appConfig = require('./appConfig.json');
global.appConfig.appVersion = require('./package.json').version;
global.lang = require('./lang/en.json');

global.mainPath = __dirname;

global.viewData = {
    lastView: '',
    lastAcc: '',
    currentAcc: '',
    autosaveOn: true,
    //autosaveOn: false,
    postsViewMeta: {},
    editorViewMeta: {}
};

global.tags = require('./tags.json').tags;

var ui = require('./modules/renderer/ui.js'),
    util = require('./modules/util.js'), //my own utils
    nodeUtil = require('util'), //Node.js utils
    irpc = require('electron-irpc');

var shell = require('electron').shell,
    validator = require('validator');

var irpcRenderer = irpc.renderer();

var webFrame = require('electron').webFrame;
var SpellCheckProvider = require('electron-spell-check-provider');

webFrame.setSpellCheckProvider('en-US', true, new SpellCheckProvider('en-US'));

var postsView = require('./modules/renderer/views/posts.js');
var editorView = require('./modules/renderer/views/editor.js');

var editorTextHelpers = require('./modules/renderer/editorTextHelpers.js');
var tagEditor = require('./modules/renderer/tagEditor.js');

var fs = require('fs');

//Edit context menus
var inputMenu = require('electron-input-menu');
var context = require('electron-contextmenu-middleware');

inputMenu.registerShortcuts();

context.use(inputMenu);
context.activate();
//End Edit context menus

//Debug menu
if (global.appConfig.dev)
{
    var debugMenu = require('debug-menu');
    debugMenu.install(); // activate context menu
}

//End Debug Menu

global.closeWithError = function(msg)
{
    if (msg && typeof msg == 'object')
    {
        msg = util.toObject(msg);
    }

    irpcRenderer.call('closeWithError', {
        err: msg
    }, function(err, result)
    {
        if (err) throw err;
    });

    return;
};

var dbResultLastUIState = '';
var isDBReady = function(isReadyCB)
{
    irpcRenderer.call('dbHelpers.isReady', {}, function(err, result)
    {
        if (err) return global.closeWithError(err);

        if (result.ready)
        {
            isReadyCB();
        }
        else
        {
            //update ui based on result
            var dbResultUIState = [result.dbTask, result.totalSteps, result.doneSteps, result.appDBVer, result.userDBVer].join(',');

            if (dbResultLastUIState != dbResultUIState)
            {
                dbResultLastUIState = dbResultUIState;

                //ui data state changed, update h4
                if (result.dbTask == 'i')
                {
                    $('#loadingScreen h4').text(global.lang.loadingScreen.init).show();
                }
                else if (result.dbTask == 'u')
                {
                    $('#loadingScreen h4').text(nodeUtil.format(global.lang.loadingScreen.upgrade, result.userDBVer + '/' + result.appDBVer)).show();
                }

                //update progress
                if (result.totalSteps > 0)
                {
                    var precent = Math.floor(((result.doneSteps / result.totalSteps) * 100));
                    $('#loadingScreen .progress-bar').attr('aria-valuenow', precent).css('width', precent + '%').text(precent + '%');
                    $('#loadingScreen .progress').show();
                }

            }

            //ask again in 500 millsseconds
            setTimeout(function()
            {
                isDBReady(isReadyCB);
            }, 500);

        }

    });
};

global.bcReady = false; //BC connection ready
global.bcStatus = ''; //BC connection status
global.bcNode = ''; //BC connection node
global.bcRestart = false; //bc require restart

global.updateBCStatus = function(info)
{
    global.bcReady = info.ready;
    global.bcStatus = info.status;
    global.bcNode = info.node;
    global.bcRestart = info.restart;

    if (global.bcRestart)
    {
        $('#bcRestartIcon').show();
    }
    else
    {
        $('#bcRestartIcon').hide();
    }

    if (info.status == 'open') //green
    {
        $('#bcStatus').attr('class', 'led led-green').attr('title', 'Connected to ' + global.bcNode).attr('data-original-title', 'Connected to ' + global.bcNode);
    }
    else if (info.status == 'closed') //yellow
    {
        $('#bcStatus').attr('class', 'led led-yellow').attr('title', 'Connecting...').attr('data-original-title', 'Connecting...');
    }
    else if (info.status == 'error') //red
    {
        $('#bcStatus').attr('class', 'led led-red').attr('title', 'Error').attr('data-original-title', 'Error');
    }

};

global.removeUnlockModal = function()
{
    $('.unlock-modal').next('div').remove();
    $('.unlock-modal').remove();
};

global.unlock = function()
{
    bootbox.prompt({
        title: 'Unlock - Enter Passphrase',
        inputType: 'password',
        className: 'unlock-modal',
        callback: function(result)
        {
            if (typeof result !== 'undefined' && result !== null)
            {
                if (result.length > 0)
                {
                    irpcRenderer.call('accounts.unlock', {
                        passphrase: result
                    }, function(err, result)
                    {
                        global.removeUnlockModal(); //remove if others

                        if (err)
                        {
                            console.log(err);
                            bootbox.alert('Error Unlocking...');
                        }
                        else if (result && typeof result == 'object' && typeof result.msg == 'string')
                        {
                            if (result.isUnlocked)
                            {
                                $('#settingsContent .accounts .encryptdStatus').hide();
                                $('#settingsContent .accounts .encryptdUnlocked').show();
                                $('#accountsLocked').hide();
                            }

                            bootbox.alert(result.msg);
                        }
                        else
                        {
                            bootbox.alert('Error Unlocking...');
                        }

                    });

                }
                else
                {
                    bootbox.alert('Empty passphrase');
                }

            }
        }
    });

};

global.updateTopAccountsMenuUI = function(info)
{
    var menuMeta = {
        hasAccs: info.hasAccs,
        accountsList: info.accountsList,
        lastAcc: info.lastAcc
    };

    $('#menuDropdownItems').html(util.getViewHtml('base/menuDropdown', menuMeta));

    if (info.hasAccs)
    {
        $('#menuDropdownName').text(menuMeta.lastAcc);
    }
    else
    {
        $('#menuDropdownName').text('Accounts');
    }

};

var noAccountsAddedToken = '$$$_NO_ACCOUNTS_ADDED_$$$'; //Can never be set since usernames are auto lowercased

global.updateMainUI = function(info)
{
    global.updateTopAccountsMenuUI(info);

    var updateMainView = false;

    if (global.viewData.lastAcc === 'string' && global.viewData.lastAcc != noAccountsAddedToken) //is defined, check if still in account list
    {
        //global.viewData.lastAcc is no longer in account list, update main view
        if (info.accountsList.indexOf(global.viewData.lastAcc) === -1)
        {
            updateMainView = true;
        }

        //lastAcc changed
        if (info.lastAcc != global.viewData.lastAcc)
        {
            updateMainView = true;
        }

    }
    else //lastAcc stored in the UI is empty
    {
        updateMainView = true;
    }

    if (updateMainView)
    {
        var viewHolder = ui.mainContentHolder.view('main');

        if (info.hasAccs)
        {
            global.viewData.lastAcc = info.lastAcc;
            global.viewData.currentAcc = info.lastAcc;
            postsView.load(viewHolder, info.lastAcc);
        }
        else //update default screen with a prompt to add accounts
        {
            global.viewData.lastAcc = noAccountsAddedToken;
            global.viewData.currentAcc = '';

            viewHolder.html(util.getViewHtml('base/noAccountsView'));

            $('#noAccountsView').click(function(e)
            {
                ui.openSettings('accounts');
            });

        }

        //transition to displaying view
        ui.mainContentHolder.ready(viewHolder);
    }

};

function showMainUI(currentLayerID, loadAccountsResult)
{
    //handle if locked...
    if (loadAccountsResult.isLocked)
    {
        $('#accountsLocked').show();

        //Prompt Unlock on startup
        global.unlock();
    }
    else
    {
        $('#accountsLocked').hide();
    }

    //update main ui
    global.updateMainUI(loadAccountsResult);

    //fade to main view
    $('#' + currentLayerID).fadeOut('fast', function()
    {
        $('body').tooltip({
            selector: '[data-toggle=tooltip]'
        });

        $('#appView').fadeIn('fast');
    });

}

function loadAccounts(currentLayerID)
{

    irpcRenderer.call('accounts.basicInfo', {}, function(err, result)
    {
        if (err) return global.closeWithError(err);

        if (result.dataLocked) //wait...
        {
            setTimeout(function(err)
            {
                loadAccounts(currentLayerID);
            }, 500);

        }
        else //call load accounts function
        {
            irpcRenderer.call('accounts.loadAccounts', {}, function(err, result)
            {
                if (err) return global.closeWithError(err);
                showMainUI(currentLayerID, result);
            });

        }

    });

}

global.hasAgreed = function(currentLayerID)
{
    //get Additional JSON Metadata UI pref
    irpcRenderer.call('kvs.read', {
        k: 'showJSONMetadataEditor'
    }, function(err, result)
    {
        //showJSONMetadataEditor
        if (err) return global.closeWithError(err);

        if (result && typeof result == 'object' && typeof result.v == 'string')
        {
            //convert to bool
            global.showJSONMetadataEditor = (result.v == 'true');
        }
        else //value never changed, default to false
        {
            global.showJSONMetadataEditor = false;
        }

        //tell to connect to blockchain
        irpcRenderer.call('bc-connect', {}, function(err, result)
        {
            if (err) return global.closeWithError(err);

            //update blockchain connection status
            global.updateBCStatus(result);

            // load accounts
            loadAccounts(currentLayerID);

        });

    });

};

///////////////////////////////////////////////////////////////////////////
var isJQReady = false;

var ipc = require('electron').ipcRenderer;
ipc.on('display-dialog', function(event, msg)
{
    var checkJQ = setInterval(function()
    {
        if (isJQReady)
        {
            clearInterval(checkJQ);

            ///////////////////// JQ is ready
            if (msg == 'about')
            {
                if (!$('.has-about-menu-loaded').length)
                {
                    bootbox.dialog({
                        message: util.getViewHtml('base/aboutContexts'),
                        title: 'About',
                        onEscape: function() {},
                        closeButton: true,
                        className: 'has-about-menu-loaded',
                        buttons: {
                            ok: {
                                label: 'OK',
                                className: 'btn-primary'
                            }
                        }
                    });

                }

            }
            else if (msg == 'settings')
            {
                ui.openSettings();
            }

        }

    }, 1);

});

ipc.on('bc-status', function(event, msg)
{
    global.updateBCStatus(msg);
});

///////////////////////////////////////////////////////////////////////////
$(function()
{
    $('#loadingScreen h1').text(global.lang.loadingScreen.loading).show();
    $('#appView').html(util.getViewHtml('base/main'));

    bootbox.setDefaults({
        backdrop: 'static'
    });

    var app = require('electron').remote.app;
    global.userDataPath = app.getPath('userData');

    isJQReady = true;

    isDBReady(function()
    {
        //check license agreement
        irpcRenderer.call('kvs.read', {
            k: 'licenseVer'
        }, function(err, result)
        {
            if (err) return global.closeWithError(err);

            if (result && typeof result == 'object' && result.v == global.appConfig.licenseVer)
            {
                global.hasAgreed('loadingScreen');
            }
            else
            {
                $('#licenseView').html(util.getViewHtml('base/license'));

                fs.readFile(global.mainPath + '/LICENSE-en.html', 'utf8', function(err, data)
                {
                    if (err) return global.closeWithError(err);
                    $('#licenseView .licenseText').html(data);

                    $('#loadingScreen').fadeOut('fast', function()
                    {
                        $('#licenseView').fadeIn('fast');
                    });

                });

            }

        });

    });

});

var remote = require('electron').remote;

var canClose = false;
var isAutosaving = false;

window.onbeforeunload = function(e)
{
    if (typeof global.viewData.editorViewMeta.viewID == 'string')
    {
        if (!isAutosaving)
        {
            isAutosaving = true;
            editorView.autosave(global.viewData.editorViewMeta.viewID, function()
            {
                canClose = true;
                remote.getCurrentWindow().close();
            });

        }

    }
    else
    {
        canClose = true;
    }

    return (canClose) ? null : false;
};

//attach play button to data-youtubeid
$(document).on('click', '.previewRender [data-youtubeid]', function()
{
    var youTubeID = $(this).attr('data-youtubeid');

    if (typeof youTubeID == 'string')
    {
        var iframeSrc = 'https://www.youtube.com/embed/' + youTubeID + '?autoplay=1&autohide=1';
        $(this).replaceWith('<iframe width="640" height="480" src="' + iframeSrc + '" frameBorder="0" allowFullScreen="true"></iframe>');
    }

});

//attach open in browser to links
$(document).on('click', '.previewRender a', function()
{
    event.preventDefault();

    var href = $(this).attr('href');

    if (typeof href == 'string' && validator.isURL(href))
    {
        shell.openExternal(href);
    }

});
