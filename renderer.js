// This file is loaded by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
global.appConfig = require('./appConfig.json');
global.lang = require('./lang/en.json');

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
        if (err)
        {
            throw err;
        }
        else if (result.ready)
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

global.hasAgreed = function(currentLayerID)
{
    //show main ui
    $('#appView').html(util.getViewHtml('base/main'));
    $('#' + currentLayerID).fadeOut('fast', function()
    {
        $('#appView').fadeIn('fast');
        $('#menuDropdownName').text('Accounts');
        $('#menuDropdownItems').html(util.getViewHtml('base/menuDropdown'));
    });

    //enable update checks/connect to blockchain

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
                alert('about');
            }

            ////////////////////////////////////
        }

    }, 1);

});

///////////////////////////////////////////////////////////////////////////
$(function()
{
    isJQReady = true;

    $('#loadingScreen h1').text(global.lang.loadingScreen.loading).show();

    isDBReady(function()
    {
        //check license agreement
        irpcRenderer.call('kvs.read', {
        	k: 'licenseVer',
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
