//global.viewData.viewName
(function ()
{
    module.exports = {
        close: function() {
            var remote = require('electron').remote;
            var window = remote.getCurrentWindow();
            window.close();
        },
        infoBox: function() {
            
        },
        optionsBox: function() {

        }
    };

}());
