//global.viewData.viewName
(function ()
{
    var menuName = (process.platform === 'darwin') ? 'Preferences' : 'Options';
    var uuid = require('node-uuid');

    module.exports = {
        close: function() {
            var remote = require('electron').remote;
            var window = remote.getCurrentWindow();
            window.close();
        },
        licenseAgree: function()
        {
            $('#licenseView .licenseButtons button').prop('disabled', true);

            irpcRenderer.call('kvs.set', {
                k: 'licenseVer',
                v: global.appConfig.licenseVer
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

        },
        settingTabHelpers: {
            switchedTabs: function(title, cssClass)
            {
                var id = uuid.v1();
                global.viewData.settingsViewMeta.tabReq = id;

                $('.has-settings-menu-loaded .subTitle').text(' - ' + title);
                $('.has-settings-menu-loaded .nav-tabs li').removeClass('active');
                $('.has-settings-menu-loaded .nav-tabs li.' + cssClass).addClass('active');
                $('#settingsContent').html('<img class="loadingSpinner" src="./images/whiteLoader.svg">');

                return id;
            }
        },
        settingTab: {
            general: function()
            {
                var id = module.exports.settingTabHelpers.switchedTabs('General', 'general');
                bootbox.alert('general later');
            },
            accounts: function()
            {
                var id = module.exports.settingTabHelpers.switchedTabs('Accounts', 'accounts');

                bootbox.alert('accounts later');
            }
        },
        displaySettings: function()
        {
            var settingsBox = bootbox.dialog({
                message: util.getViewHtml('base/settingsContexts'),
                title: menuName + '&nbsp;<span class="subTitle"></span>',
                closeButton: false,
                className: 'has-settings-menu-loaded',
                buttons: {
                    close: {
                      label: 'Close',
                      className: 'btn-danger',
                      callback: function () {

                      }

                    }
                }
            });

            //Fake the close button
            $('.has-settings-menu-loaded .modal-header').prepend('<button type="button" class="close" aria-hidden="true">&times;</button>');
            $('.has-settings-menu-loaded .modal-header .close').click(function()
            {
                alert("Handler for X called.");
            });

            //Load general Tab
            module.exports.settingTab.general();

        },
        openSettings: function()
        {

            if(!$('.has-settings-menu-loaded').length)
            {
                if($('#appView').is(':visible'))
                {
                    module.exports.displaySettings();
                }
                else
                {
                    bootbox.alert(menuName + ' is not ready yet.');
                }
            }

        }

    };

}());
