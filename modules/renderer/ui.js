(function ()
{
    var menuName = (process.platform === 'darwin') ? 'Preferences' : 'Options';

    var uuid = require('node-uuid');

    var settingsBox,
    settingsViewMeta;

    function clearSettingsViewMeta()
    {
        settingsViewMeta = {
            loading: {},
            loaded: {},
            tabLastVisable: '',
            tabReq: '', //might not need
            fields: {
                general: {},
                accounts: {}
            }
        };

    }

    clearSettingsViewMeta();
    ////////////////////////
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
                settingsViewMeta.tabReq = id;

                module.exports.settingTabHelpers.hideUpdateBTN();

                //Update Tab
                $('.has-settings-menu-loaded .subTitle').text(' - ' + title);
                $('.has-settings-menu-loaded .nav-tabs li').removeClass('active');
                $('.has-settings-menu-loaded .nav-tabs li.' + cssClass).addClass('active');

                //Update Content
                if (settingsViewMeta.tabLastVisable.length > 0)
                {
                    $('#settingsContent .' + settingsViewMeta.tabLastVisable).fadeOut('fast', function()
                    {
                        $('#settingsContent .loadingTab').fadeIn('fast');
                    });

                }

                settingsViewMeta.tabLastVisable = cssClass;

                return id;
            },
            closeSettings: function()
            {
                clearSettingsViewMeta();
                settingsBox.modal('hide');

                return false;
            },
            updateSettings: function()
            {
                //Wire up controls
                // if (userinput != settingsViewMeta.fields.general.wsHost)
                // {
                //     //save
                // }

            },
            showTab: function()
            {
                $('#settingsContent .loadingTab').fadeOut('fast', function()
                {
                    $('#settingsContent .' + settingsViewMeta.tabLastVisable).fadeIn('fast');
                });
            },
            hideUpdateBTN: function()
            {
                $('.has-settings-menu-loaded .modal-footer .updateBTN').hide();
            },
            showUpdateBTN: function()
            {
                $('.has-settings-menu-loaded .modal-footer .updateBTN').show();
            }
        },
        settingTab: {
            general_setDefault: function()
            {
                bootbox.alert('later...');
            },
            general: function()
            {
                var id = module.exports.settingTabHelpers.switchedTabs('General', 'general');

                if (settingsViewMeta.loading.general) //is loading, do nothing
                {
                    return;
                }
                else if (settingsViewMeta.loaded.general) //loaded already
                {
                    module.exports.settingTabHelpers.showTab();
                    module.exports.settingTabHelpers.showUpdateBTN();
                }
                else //not loaded or loading
                {
                    settingsViewMeta.loading.general = true;

                    irpcRenderer.call('kvs.read', {
                    	k: 'wsNode'
                    }, function(err, result)
                    {
                        if (err)
                        {
                            console.log(err);
                            bootbox.alert('Error loading general tab...');
                            settingsViewMeta.loading.general = false;
                        }
                        else
                        {
                            settingsViewMeta.fields.general.wsHost = (result && typeof result == 'object') ? result.v : global.appConfig.defaultWS;

                            $('#settingsContent .general').html(util.getViewHtml('settings/generalTab', {
                                wsHost: settingsViewMeta.fields.general.wsHost
                            }));

                            //Display tab
                            settingsViewMeta.loaded.general = true;
                            settingsViewMeta.loading.general = false;

                            if (settingsViewMeta.tabLastVisable == 'general')
                            {
                                module.exports.settingTabHelpers.showTab();
                                module.exports.settingTabHelpers.showUpdateBTN();
                            }

                        }

                    });

                }

            },
            accounts: function()
            {
                var id = module.exports.settingTabHelpers.switchedTabs('Accounts', 'accounts');
                bootbox.alert('accounts later');
            }
        },
        displaySettings: function()
        {
            settingsBox = bootbox.dialog({
                message: util.getViewHtml('settings/main'),
                title: menuName + '&nbsp;<span class="subTitle"></span>',
                closeButton: false,
                className: 'has-settings-menu-loaded',
                buttons: {
                    update: {
                      label: 'Update',
                      className: 'btn-success updateBTN',
                      callback: function()
                      {
                          return module.exports.settingTabHelpers.updateSettings();
                      }

                    },
                    close: {
                      label: 'Close',
                      className: 'btn-danger',
                      callback: function()
                      {
                          return module.exports.settingTabHelpers.closeSettings();
                      }

                    }
                }
            });

            module.exports.settingTabHelpers.hideUpdateBTN();

            //Fake the close button
            $('.has-settings-menu-loaded .modal-header').prepend('<button type="button" class="close" aria-hidden="true">&times;</button>');
            $('.has-settings-menu-loaded .modal-header .close').click(function()
            {
                return module.exports.settingTabHelpers.closeSettings();
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
