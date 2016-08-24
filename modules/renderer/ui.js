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

        },
        licenseAgree: function()
        {
            $('#licenseView .licenseButtons button').prop('disabled', true);

            irpcRenderer.call('kvs.set', {
                k: 'licenseVer',
                v: global.licenseVer
            }, function(err, result)
            {
                if (err) return global.closeWithError(err);
                global.hasAgreed('licenseView');
            });

        },
        licenseDisagree: function()
        {
            $('#licenseView .licenseButtons button').prop('disabled', true);

            irpcRenderer.call('quit', {}, function(err, result)
            {
                if (err) throw err;
            });

        }
    };

}());
