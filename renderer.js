// This file is loaded by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
var util = require('./modules/util.js'); //my own utils
var nodeUtil = require('util'); //Node.js utils
var irpc = require('electron-irpc');
var irpcRenderer = irpc.renderer();

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

$(function()
{
    $('#loadingScreen h1').text(global.lang.loadingScreen.loading).show();

    isDBReady(function()
    {
        $('#appView').html(util.getViewHtml('base/main'));
        $('#loadingScreen').fadeOut('fast', function()
        {
            $('#appView').fadeIn('fast');
            $('#menuDropdownName').text('Accounts');
            $('#menuDropdownItems').html(util.getViewHtml('base/menuDropdown'));
        });

    });

});

