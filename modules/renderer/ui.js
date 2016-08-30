(function ()
{
    var menuName = (process.platform === 'darwin') ? 'Preferences' : 'Options';

    var uuid = require('node-uuid');

    var settingsBox,
        settingsViewMeta;

    function clearSettingsViewMeta()
    {
        settingsViewMeta = {
            toView: '',
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
        restartIcon: function()
        {
            if (global.bcRestart)
            {
                irpcRenderer.call('relaunch', {}, function(err, result)
                {
                    if (err) throw err;
                });
            }

        },
        unlockIcon: function()
        {
            bootbox.alert('Later...');
        },
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
                var toView = '#settingsContent .' + cssClass;
                settingsViewMeta.toView = toView;

                var fromView = '#settingsContent .' + settingsViewMeta.tabLastVisable;
                if (settingsViewMeta.tabLastVisable.length > 0)
                {
                    $(fromView).fadeOut('fast', function()
                    {
                        if (settingsViewMeta.toView == toView) //show new view
                        {
                            $(toView).fadeIn('fast');
                        }

                        if (settingsViewMeta.toView != fromView) //ready view for next time
                        {
                            $(fromView + ' .loading').show();
                            $(fromView + ' .inside').hide();
                        }

                    });
                }
                else
                {
                    $(toView).fadeIn('fast');
                }

                settingsViewMeta.tabLastVisable = cssClass;

                return id;
            },
            show: function(cssClass)
            {
                var toView = '#settingsContent .' + cssClass;

                if (settingsViewMeta.toView == toView)
                {
                    $(toView + ' .loading').fadeOut('fast', function()
                    {
                        if (settingsViewMeta.toView == toView) //show new view
                        {
                            $(toView + ' .inside').fadeIn('fast');
                        }

                    });

                }

            },
            whatChanged: function()
            {
                var result = {
                    unsaved: false,
                    what: {}
                };

                //check for changes
                var wsHostVal = $('#generalTabWSHostInput').val();
                if (wsHostVal != settingsViewMeta.fields.general.wsHost)
                {
                    result.unsaved = true;
                    result.what.wsHost = {val: wsHostVal};
                }

                //return result
                return result;
            },
            closeSettings: function()
            {
                var changed = module.exports.settingTabHelpers.whatChanged();

                if (changed.unsaved)
                {

                    bootbox.confirm('Unsaved Changes. Are you sure you want to close?', function(result)
                    {
                        if (result)
                        {
                            clearSettingsViewMeta();
                            settingsBox.modal('hide');
                        }

                    });

                }
                else
                {
                    clearSettingsViewMeta();
                    settingsBox.modal('hide');
                }

                return false;
            },
            updateSettings: function()
            {
                var changed = module.exports.settingTabHelpers.whatChanged();

                if (changed.unsaved)
                {
                    if (changed.what.wsHost) //update wsHost
                    {

                        if (util.isWS(changed.what.wsHost.val))
                        {
                            irpcRenderer.call('update-wshost', {
                                k: 'wsNode',
                                v: changed.what.wsHost.val
                            }, function(err, result)
                            {
                                if (err)
                                {
                                    console.log(err);
                                    bootbox.alert('Error Updating Steem Node...');
                                }
                                else
                                {
                                    settingsViewMeta.fields.general.wsHost = changed.what.wsHost.val;
                                    global.updateBCStatus(result);
                                }

                            });

                        }
                        else
                        {
                            bootbox.alert('Invalid Steem Node Websocket Address, Field not saved.');
                        }

                    }

                }
                else
                {
                    bootbox.alert('No unsaved changes.');
                }

                return false;
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
                if ($('#generalTabWSHostInput').val() == global.appConfig.defaultWS)
                {
                    bootbox.alert('Steem Node is already set to default websocket host');
                }
                else
                {
                    $('#generalTabWSHostInput').val(global.appConfig.defaultWS);
                }

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
                    module.exports.settingTabHelpers.show('general');
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
                                module.exports.settingTabHelpers.show('general');
                                module.exports.settingTabHelpers.showUpdateBTN();
                            }

                        }

                    });

                }

            },
            accounts: function()
            {
                var id = module.exports.settingTabHelpers.switchedTabs('Accounts', 'accounts');

                if (settingsViewMeta.loading.accounts) //is loading, do nothing
                {
                    return;
                }
                else if (settingsViewMeta.loaded.accounts) //loaded already
                {
                    module.exports.settingTabHelpers.show('accounts');
                    //module.exports.settingTabHelpers.showUpdateBTN();
                }
                else //not loaded or loading
                {
                    settingsViewMeta.loading.accounts = true;

                    irpcRenderer.call('accounts.accountList', {}, function(err, result)
                    {
                        if (err)
                        {
                            console.log(err);
                            bootbox.alert('Error loading accounts tab...');
                            settingsViewMeta.loading.accounts = false;
                        }
                        else
                        {
                            $('#settingsContent .accounts').html(util.getViewHtml('settings/accountsTab', {

                            }));

                            //Update UI encryptdStatus
                            $('#settingsContent .accounts .encryptdStatus').hide();

                            if (result.isEncrypted)
                            {
                                if (result.isUnlocked)
                                {
                                    $('#settingsContent .accounts .encryptdUnlocked').show();
                                }
                                else
                                {
                                    $('#settingsContent .accounts .encryptdLocked').show();
                                }

                            }
                            else
                            {
                                $('#settingsContent .accounts .encryptdNot').show();
                            }

                            //Display tab
                            settingsViewMeta.loaded.accounts = true;
                            settingsViewMeta.loading.accounts = false;

                            if (settingsViewMeta.tabLastVisable == 'accounts')
                            {
                                module.exports.settingTabHelpers.show('accounts');
                                //module.exports.settingTabHelpers.showUpdateBTN();
                            }

                        }

                    });

                }

            }
        },
        displaySettings: function(tabName)
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
                          module.exports.settingTabHelpers.updateSettings();
                          return false;
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

            if (tabName == 'accounts') //Load accounts Tab
            {
                module.exports.settingTab.accounts();
            }
            else //Load general Tab
            {
                module.exports.settingTab.general();
            }

        },
        openSettings: function(tabName)
        {

            if (!$('.has-settings-menu-loaded').length)
            {
                if ($('#appView').is(':visible'))
                {
                    module.exports.displaySettings(tabName);
                }
                else
                {
                    bootbox.alert(menuName + ' is not ready yet.');
                }
            }

        },
        accounts: {
            encryptCredentials: function()
            {
                var encryptCredentials = '';

                //Passphrase
                bootbox.prompt({
                    title: 'Encrypt Credentials - Enter Passphrase<p class"passphraseInfoText">Please use a passphrase of ten or more random characters, or eight or more worlds.</p>',
                    inputType: 'password',
                    callback: function(result)
                    {
                        if (typeof result !== 'undefined' && result !== null)
                        {
                            encryptCredentials = result;

                            if (result.length > 0)
                            {
                                //Confirm
                                bootbox.prompt({
                                    title: 'Encrypt Credentials - Confirm Passphrase<p class"passphraseInfoText">Please use a passphrase of ten or more random characters, or eight or more worlds.</p>',
                                    inputType: 'password',
                                    callback: function(result)
                                    {
                                        if (typeof result !== 'undefined' && result !== null)
                                        {

                                            if (encryptCredentials === result)
                                            {
                                                var msg = '<b>Warning:</b> If you encrypt your credentials and lose your passphrase, you will NEED TO REENTER YOUR CREDENTIALS to continue using those accounts with this software.';
                                                msg += '<br><br>Are you sure you wish to encrypt your credentials?';

                                                bootbox.confirm({
                                                    message: msg,
                                                    callback: function(result)
                                                    {
                                                        if (result)
                                                        {
                                                            //put up loading spinner
                                                            $.LoadingOverlay('show', {
                                                                zIndex: 2000
                                                            });

                                                            //call encryptCredentials
                                                            irpcRenderer.call('accounts.encryptCredentials', {
                                                                passphrase: encryptCredentials
                                                            }, function(err, result)
                                                            {
                                                                if (err)
                                                                {
                                                                    console.log(err);
                                                                    $.LoadingOverlay('hide'); //hide loading spinner
                                                                    bootbox.alert('Error Encrypting Credentials...');
                                                                }
                                                                else
                                                                {
                                                                    if (result && typeof result == 'object' && typeof result.msg == 'string')
                                                                    {
                                                                        $.LoadingOverlay('hide'); //hide loading spinner
                                                                        bootbox.alert(result.msg);
                                                                    }
                                                                    else
                                                                    {
                                                                        $('#settingsContent .accounts .encryptdStatus').hide();
                                                                        $('#settingsContent .accounts .encryptdUnlocked').show();
                                                                        $.LoadingOverlay('hide'); //hide loading spinner
                                                                    }

                                                                }

                                                            });

                                                        }

                                                    }
                                                });

                                            }
                                            else
                                            {
                                                bootbox.alert('Passphrase and Confirm Passphrase do not match.');
                                            }

                                        }
                                    }
                                });

                            }
                            else
                            {
                                bootbox.alert('Passphrase is empty.');
                            }

                        }

                    }

                });

            }
        },
        switchAccount: function(ele)
        {
            //alert($(ele).text());
        },
        mainContentHolder: {
            view: function() //returns the view to write to
            {
                var id = uuid.v1().replace(/-/g, '');
                var viewHolderID = 'mainContent_' + id;

                $('#mainContentHolder').prepend('<div id="' + viewHolderID + '" class="viewHolder" style="display: none;"></div>');

                return $('#' + viewHolderID);
            },
            ready: function($viewHolderSelector, cb) //view that is transitioned to
            {
                var id = $viewHolderSelector.attr('id');

                if (id)
                {
                    var selector = '#' + id;

                    if ($(selector).is(':visible'))
                    {
                        if (typeof cb == 'function') cb('already'); //already visible
                    }
                    else
                    {
                        var views = $('#mainContentHolder .viewHolder:not(' + selector + ')');

                        if (views.length > 0)
                        {
                            views.fadeOut('fast', function()
                            {
                                $(selector).fadeIn('fast');
                                if (typeof cb == 'function') cb('show'); //ui was shown
                            }).remove();
                        }
                        else
                        {
                            $(selector).fadeIn('fast');
                            if (typeof cb == 'function') cb('show'); //ui was shown
                        }

                    }

                }
                else
                {
                    if (typeof cb == 'function') cb(false); //not found
                }

            }
        }

    };

}());
