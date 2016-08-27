// This file is loaded by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

global.appConfig = require('./appConfig.json');
global.appConfig.appVersion = require('./package.json').version;
global.lang = require('./lang/en.json');

var app = require('electron').remote.app;
global.userDataPath = app.getPath('userData');

global.viewData = {
    viewName: '',
    viewMeta: {}
};

var ui = require('./modules/renderer/ui.js');
var util = require('./modules/util.js'); //my own utils
var nodeUtil = require('util'); //Node.js utils
var irpc = require('electron-irpc');
var irpcRenderer = irpc.renderer();

var fs = require('fs');

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

function updateBCStatus(info)
{
    global.bcReady = info.ready;
    global.bcStatus = info.status;

    if (info.status == 'open') //green
    {
        $('#bcStatus').attr('class','led led-green').attr('title', 'Connected');
    }
    else if (info.status == 'closed') //yellow
    {
        $('#bcStatus').attr('class','led led-yellow').attr('title', 'Connecting...');
    }
    else if (info.status == 'error') //red
    {
        $('#bcStatus').attr('class','led led-red').attr('title', 'Error');
    }

}

global.hasAgreed = function(currentLayerID)
{
    $('#appView').html(util.getViewHtml('base/main'));

    //tell to connect to blockchain
    irpcRenderer.call('bc-connect', {}, function(err, result)
    {
        if (err) return global.closeWithError(err);

        //update blockchain connection status
        updateBCStatus(result);

        //show main ui
        $('#' + currentLayerID).fadeOut('fast', function()
        {
            $('body').tooltip({selector: '[data-toggle=tooltip]'});
            $('#appView').fadeIn('fast');
            $('#menuDropdownName').text('Accounts');
            $('#menuDropdownItems').html(util.getViewHtml('base/menuDropdown'));
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
                if(!$('.has-about-menu-loaded').length)
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
    updateBCStatus(msg);
});

///////////////////////////////////////////////////////////////////////////
$(function()
{
    bootbox.setDefaults({
        backdrop: 'static'
    });

    isJQReady = true;

    $('#loadingScreen h1').text(global.lang.loadingScreen.loading).show();

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

                fs.readFile('./LICENSE-en.html', 'utf8', function(err, data)
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
