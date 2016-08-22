// This file is loaded by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
var util = require('./modules/util.js');
var irpc = require('electron-irpc');
var irpcRenderer = irpc.renderer();

$(function()
{
    $('#appView').html(util.getViewHtml('base/main'));
    $('#loadingScreen').fadeOut('fast', function()
    {
        $('#appView').fadeIn('fast');
        $('#menuDropdownName').text('Accounts');
        $('#menuDropdownItems').html(util.getViewHtml('base/menuDropdown'));
    });
});
