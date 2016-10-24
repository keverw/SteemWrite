(function()
{
    var menuName = (process.platform === 'darwin') ? 'Preferences' : 'Options';

    var uuid = require('node-uuid'),
        editorUIHelpers = require(global.mainPath + '/modules/renderer/editorUIHelpers.js');

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
            },
            dialogs: {} //store references to open dialogs
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
            global.unlock();
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

                //check for changes on general tab
                if (settingsViewMeta.loaded.general)
                {
                    //check if websocket host changed
                    var wsHostVal = $('#generalTabWSHostInput').val();
                    if (wsHostVal != settingsViewMeta.fields.general.wsHost)
                    {
                        result.unsaved = true;
                        result.what.wsHost = {
                            val: wsHostVal
                        };
                    }

                    //check if json metadata checkbox changed
                    var showJSONMetadataEditorCheckboxVal = $("[name='showJSONMetadataEditorCheckbox']").is(':checked');
                    if (showJSONMetadataEditorCheckboxVal != settingsViewMeta.fields.general.showJSONMetadataEditor)
                    {
                        result.unsaved = true;
                        result.what.showJSONMetadataEditor = {
                            val: showJSONMetadataEditorCheckboxVal
                        };
                    }

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

                    if (changed.what.showJSONMetadataEditor) //update showJSONMetadataEditor
                    {
                        var boolAsString = (changed.what.showJSONMetadataEditor.val) ? 'true' : 'false';

                        irpcRenderer.call('kvs.set', {
                            k: 'showJSONMetadataEditor',
                            v: boolAsString
                        }, function(err, result)
                        {
                            if (err)
                            {
                                console.log(err);
                                bootbox.alert('Error Updating Show JSON Editor...');
                            }
                            else
                            {
                                if (changed.what.showJSONMetadataEditor.val)
                                {
                                    $('.additionalJsonData').show();
                                }
                                else
                                {
                                    $('.additionalJsonData').hide();
                                }

                                settingsViewMeta.fields.general.showJSONMetadataEditor = changed.what.showJSONMetadataEditor.val;
                                global.showJSONMetadataEditor = changed.what.showJSONMetadataEditor.val;

                            }

                        });

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
                            settingsViewMeta.fields.general.showJSONMetadataEditor = global.showJSONMetadataEditor;

                            $('#settingsContent .general').html(util.getViewHtml('settings/generalTab', {
                                wsHost: settingsViewMeta.fields.general.wsHost,
                                showJSONMetadataEditor: settingsViewMeta.fields.general.showJSONMetadataEditor
                            }));

                            $("[name='showJSONMetadataEditorCheckbox']").bootstrapSwitch();

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
                            $('#settingsContent .accounts').html(util.getViewHtml('settings/accountsTab'));

                            module.exports.accounts.refreshAccountsList(result);

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
            refreshAccountsList: function(info)
            {
                $('#accountsListTbody').html(util.getViewHtml('settings/accountList', {
                    accountsList: info.accountsList,
                    hasCredentials: info.hasCredentials,
                    draftPostCounts: info.draftPostCounts,
                    scheduledPostCounts: info.scheduledPostCounts
                }));

                //Update UI encryptdStatus
                $('#settingsContent .accounts .encryptdStatus').hide();

                if (info.isEncrypted)
                {
                    if (info.isUnlocked)
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

            },
            refreshAccountsListRemoved: function()
            {
                //called when Resetting and Passphrase is removed
                $('#accountsListTbody .glyphicon-lock').show();

            },
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

            },
            reset: function()
            {

                bootbox.confirm('Are you sure you want to reset passphrase? This will remove your encrypted credentials and you\'ll need to reenter them to continue using those accounts with this application.', function(result)
                {
                    if (result)
                    {
                        global.removeUnlockModal(); //remove any open unlock modals

                        //put up loading spinner
                        $.LoadingOverlay('show', {
                            zIndex: 2000
                        });

                        irpcRenderer.call('accounts.reset', {}, function(err, result)
                        {
                            if (err)
                            {
                                console.log(err);
                                $.LoadingOverlay('hide'); //hide loading spinner
                                bootbox.alert('Error Resetting Passphrase...');
                            }
                            else if (result && typeof result == 'object' && typeof result.msg == 'string')
                            {
                                if (result.removed)
                                {
                                    $('#settingsContent .accounts .encryptdStatus').hide();
                                    $('#settingsContent .accounts .encryptdNot').show();
                                    $('#accountsLocked').hide();
                                    module.exports.accounts.refreshAccountsListRemoved();
                                }

                                bootbox.alert(result.msg);
                                $.LoadingOverlay('hide'); //hide loading spinner
                            }
                            else
                            {
                                $.LoadingOverlay('hide'); //hide loading spinner
                                bootbox.alert('Error Resetting Passphrase...');
                            }

                        });

                    }

                });

            },
            change: function()
            {
                bootbox.prompt({
                    title: 'Change Passphrase - Enter Current Passphrase',
                    inputType: 'password',
                    callback: function(result)
                    {
                        if (typeof result !== 'undefined' && result !== null)
                        {
                            var passphrase = result;
                            irpcRenderer.call('accounts.checkPassphrase', {
                                passphrase: passphrase
                            }, function(err, result)
                            {
                                if (err)
                                {
                                    console.log(err);
                                    bootbox.alert('Error Checking Passphrase...');
                                }
                                else
                                {
                                    if (result && typeof result == 'object')
                                    {
                                        if (typeof result.msg == 'string')
                                        {
                                            bootbox.alert(result.msg);
                                        }

                                        if (result.isCorrect)
                                        {
                                            var newCredentials = '';

                                            //Passphrase
                                            bootbox.prompt({
                                                title: 'New Passphrase<p class"passphraseInfoText">Please use a passphrase of ten or more random characters, or eight or more worlds.</p>',
                                                inputType: 'password',
                                                callback: function(result)
                                                {
                                                    if (typeof result !== 'undefined' && result !== null)
                                                    {
                                                        newCredentials = result;

                                                        if (result.length > 0)
                                                        {
                                                            //Confirm
                                                            bootbox.prompt({
                                                                title: 'Confirm New Passphrase<p class"passphraseInfoText">Please use a passphrase of ten or more random characters, or eight or more worlds.</p>',
                                                                inputType: 'password',
                                                                callback: function(result)
                                                                {
                                                                    if (typeof result !== 'undefined' && result !== null)
                                                                    {
                                                                        if (newCredentials === result)
                                                                        {
                                                                            //put up loading spinner
                                                                            $.LoadingOverlay('show', {
                                                                                zIndex: 2000
                                                                            });

                                                                            //call changePassphrase
                                                                            irpcRenderer.call('accounts.changePassphrase', {
                                                                                passphrase: passphrase,
                                                                                newPassphrase: newCredentials
                                                                            }, function(err, result)
                                                                            {
                                                                                if (err)
                                                                                {
                                                                                    console.log(err);
                                                                                    $.LoadingOverlay('hide'); //hide loading spinner
                                                                                    bootbox.alert('Error changing passphrase...');
                                                                                }
                                                                                else if (result && typeof result == 'object' && typeof result.msg == 'string')
                                                                                {
                                                                                    bootbox.alert(result.msg);
                                                                                    $.LoadingOverlay('hide'); //hide loading spinner
                                                                                }
                                                                                else
                                                                                {
                                                                                    $.LoadingOverlay('hide'); //hide loading spinner
                                                                                    bootbox.alert('Error changing passphrase...');
                                                                                }

                                                                            });

                                                                        }
                                                                        else
                                                                        {
                                                                            bootbox.alert('New Passphrase and Confirm New Passphrase do not match.');
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

                                    }
                                    else
                                    {
                                        bootbox.alert('Error Checking Passphrase...');
                                    }

                                }

                            });

                        }
                    }
                });

            },
            remove: function()
            {
                bootbox.prompt({
                    title: 'Enter your passphrase to unencrypt account credentials',
                    inputType: 'password',
                    callback: function(result)
                    {
                        if (typeof result !== 'undefined' && result !== null)
                        {
                            var passphrase = result;
                            irpcRenderer.call('accounts.checkPassphrase', {
                                passphrase: passphrase
                            }, function(err, result)
                            {
                                if (err)
                                {
                                    console.log(err);
                                    bootbox.alert('Error Checking Passphrase...');
                                }
                                else
                                {
                                    if (result && typeof result == 'object')
                                    {
                                        if (typeof result.msg == 'string')
                                        {
                                            bootbox.alert(result.msg);
                                        }

                                        if (result.isCorrect)
                                        {
                                            //put up loading spinner
                                            $.LoadingOverlay('show', {
                                                zIndex: 2000
                                            });

                                            irpcRenderer.call('accounts.removePassphrase', {
                                                passphrase: passphrase
                                            }, function(err, result)
                                            {
                                                if (err)
                                                {
                                                    console.log(err);
                                                    $.LoadingOverlay('hide'); //hide loading spinner
                                                    bootbox.alert('Error Removing Passphrase...');
                                                }
                                                else if (result && typeof result == 'object' && typeof result.msg == 'string')
                                                {
                                                    if (result.removed)
                                                    {
                                                        $('#settingsContent .accounts .encryptdStatus').hide();
                                                        $('#settingsContent .accounts .encryptdNot').show();
                                                    }

                                                    bootbox.alert(result.msg);
                                                    $.LoadingOverlay('hide'); //hide loading spinner
                                                }
                                                else
                                                {
                                                    $.LoadingOverlay('hide'); //hide loading spinner
                                                    bootbox.alert('Error Removing Passphrase...');
                                                }

                                            });

                                        }

                                    }
                                    else
                                    {
                                        bootbox.alert('Error Checking Passphrase...');
                                    }

                                }

                            });

                        }
                    }
                });

            }
        },
        switchAccount: function(ele)
        {
            var user = $(ele).text();

            if (typeof user == 'string' && user.length > 0)
            {
                //put up loading spinner
                $.LoadingOverlay('show',
                {
                    zIndex: 2000
                });

                irpcRenderer.call('accounts.switchAccount', {
                    username: user
                }, function(err, result) {
                    if (err)
                    {
                        console.log(err);
                        $.LoadingOverlay('hide'); //hide loading spinner
                        bootbox.alert('Error Switching Accounts...');
                    }
                    else if (result && typeof result == 'object' && typeof result.msg == 'string')
                    {
                        if (result.basicInfo)
                        {
                            global.updateMainUI(result.basicInfo); //update main ui
                        }

                        bootbox.alert(result.msg);
                        $.LoadingOverlay('hide'); //hide loading spinner
                    }
                    else
                    {
                        $.LoadingOverlay('hide'); //hide loading spinner
                        bootbox.alert('Error Switching Accounts...');
                    }

                });

            }

        },
        manageAccountsHelpers:
        {
            addAccountContinueBTN: function()
            {
                var username = $('#addAccountUsername').val(),
                    password = $('#addAccountPassword').val();

                //put up loading spinner
                $.LoadingOverlay('show',
                {
                    zIndex: 2000
                });

                irpcRenderer.call('accounts.addAccount',
                {
                    username: username,
                    password: password
                }, function(err, result)
                {
                    if (err)
                    {
                        console.log(err);
                        $.LoadingOverlay('hide'); //hide loading spinner

                        var msg = 'Error Adding Account...';

                        if (typeof err == 'object' && err.message)
                        {
                            msg += '<br><br>' + err.message;
                        }

                        bootbox.alert({
                            message: msg,
                            className: 'allow-copy'
                        });
                    }
                    else if (result && typeof result == 'object' && typeof result.msg == 'string')
                    {
                        if (result.basicInfo)
                        {
                            module.exports.accounts.refreshAccountsList(result.basicInfo); //update tab view
                            global.updateMainUI(result.basicInfo); //update main ui
                        }

                        if (result.status == 'added')
                        {
                            //hide add account dialog
                            settingsViewMeta.dialogs.addAccountBox.modal('hide');
                        }

                        bootbox.alert(result.msg);
                        $.LoadingOverlay('hide'); //hide loading spinner
                    }
                    else
                    {
                        $.LoadingOverlay('hide'); //hide loading spinner
                        bootbox.alert('Error Adding Account...');
                    }

                });

                return false;
            }
        },
        manageAccounts:
        {
            add: function()
            {
                settingsViewMeta.dialogs.addAccountBox = bootbox.dialog({
                    message: util.getViewHtml('settings/addAccountBox'),
                    title: 'Add Account',
                    closeButton: false,
                    className: 'has-add-account-box',
                    buttons: {
                        cancel: {
                            label: 'Cancel',
                            className: 'btn-danger',
                            callback: function()
                            {
                                settingsViewMeta.dialogs.addAccountBox.modal('hide');
                            }
                        },
                        continue: {
                            label: 'Continue',
                            className: 'btn-success',
                            callback: function()
                            {
                                module.exports.manageAccountsHelpers.addAccountContinueBTN();
                                return false;
                            }
                        }
                    }
                });

                //Fake the close button
                $('.has-add-account-box .modal-header').prepend('<button type="button" class="close" aria-hidden="true">&times;</button>');
                $('.has-add-account-box .modal-header .close').click(function()
                {
                    settingsViewMeta.dialogs.addAccountBox.modal('hide');
                });

            },
            check: function(ele)
            {
                var user = $(ele).attr('data-user');

                if (typeof user == 'string')
                {
                    //put up loading spinner
                    $.LoadingOverlay('show', {
                        zIndex: 2000
                    });

                    irpcRenderer.call('accounts.checkAccount', {
                        username: user
                    }, function(err, result)
                    {
                        if (err)
                        {
                            console.log(err);
                            $.LoadingOverlay('hide'); //hide loading spinner

                            var msg = 'Error Checking Account...';

                            if (typeof err == 'object' && err.message)
                            {
                                msg += '<br><br>' + err.message;
                            }

                            bootbox.alert(msg);
                        }
                        else if (result && typeof result == 'object' && typeof result.msg == 'string')
                        {
                            bootbox.alert(result.msg);
                            $.LoadingOverlay('hide'); //hide loading spinner
                        }
                        else
                        {
                            $.LoadingOverlay('hide'); //hide loading spinner
                            bootbox.alert('Error Checking Account...');
                        }

                    });

                }

            },
            edit: function(ele)
            {
                var user = $(ele).attr('data-user');

                if (typeof user == 'string')
                {
                    settingsViewMeta.dialogs.editAccPassBox = bootbox.prompt({
                        title: 'Enter new password',
                        inputType: 'password',
                        callback: function(result)
                        {
                            if (typeof result !== 'undefined' && result !== null)
                            {
                                //put up loading spinner
                                $.LoadingOverlay('show', {
                                    zIndex: 2000
                                });

                                irpcRenderer.call('accounts.editAccountPassword', {
                                    username: user,
                                    password: result
                                }, function(err, result)
                                {
                                    if (err)
                                    {
                                        console.log(err);
                                        $.LoadingOverlay('hide'); //hide loading spinner

                                        var msg = 'Error Editing Account Password...';

                                        if (typeof err == 'object' && err.message)
                                        {
                                            msg += '<br><br>' + err.message;
                                        }

                                        bootbox.alert(msg);
                                    }
                                    else if (result && typeof result == 'object' && typeof result.msg == 'string')
                                    {
                                        if (result.basicInfo)
                                        {
                                            module.exports.accounts.refreshAccountsList(result.basicInfo); //update tab view
                                            global.updateMainUI(result.basicInfo); //update main ui
                                        }

                                        if (result.status == 'changed')
                                        {
                                            settingsViewMeta.dialogs.editAccPassBox.modal('hide');
                                        }

                                        bootbox.alert(result.msg);
                                        $.LoadingOverlay('hide'); //hide loading spinner
                                    }
                                    else
                                    {
                                        $.LoadingOverlay('hide'); //hide loading spinner
                                        bootbox.alert('Error Editing Account Password...');
                                    }

                                });

                                return false;

                            }
                        }
                    });

                }
            },
            remove: function(ele)
            {
                var user = $(ele).attr('data-user');

                if (typeof user == 'string')
                {
                    bootbox.confirm("Are you sure want to remove this account?", function(result)
                    {
                        if (result)
                        {
                            irpcRenderer.call('accounts.removeAccount', {
                                username: user
                            }, function(err, result) {
                                if (err)
                                {
                                    console.log(err);
                                    $.LoadingOverlay('hide'); //hide loading spinner
                                    bootbox.alert('Error Removing Account...');
                                }
                                else if (result && typeof result == 'object' && typeof result.msg == 'string')
                                {
                                    if (result.basicInfo)
                                    {
                                        module.exports.accounts.refreshAccountsList(result.basicInfo); //update tab view
                                        global.updateMainUI(result.basicInfo); //update main ui
                                    }

                                    bootbox.alert(result.msg);
                                    $.LoadingOverlay('hide'); //hide loading spinner
                                }
                                else
                                {
                                    $.LoadingOverlay('hide'); //hide loading spinner
                                    bootbox.alert('Error Removing Account...');
                                }

                            });

                        }

                    });

                }

            }
        },
        mainContentHolder: {
            view: function(name)
            {
                if (typeof global.viewData.editorViewMeta.viewID == 'string') editorView.autosave(global.viewData.editorViewMeta.viewID);

                global.viewData.lastView = name;

                $('#navMiddleButtons').html('').hide(); //hide main nav buttons

                //returns the view to write to
                var id = uuid.v1().replace(/-/g, '');
                var viewHolderID = 'mainContent_' + id;

                $('#mainContentHolder').prepend('<div id="' + viewHolderID + '" class="viewHolder" style="display: none;"></div>');

                return $('#' + viewHolderID);
            },
            ready: function($viewHolderSelector, cb)
            {
                //$viewHolderSelector is view that is transitioned to
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

                        //using .stop() because if you click really fast, animations finish in the wrong order and the view will stay hidden
                        if (views.length > 0)
                        {
                            views.stop().fadeOut('fast', function()
                            {
                                $(selector).stop().fadeIn('fast');
                                if (typeof cb == 'function') cb('show'); //ui was shown
                            }).remove();
                        }
                        else
                        {
                            $(selector).stop().fadeIn('fast');
                            if (typeof cb == 'function') cb('show'); //ui was shown
                        }

                    }

                }
                else
                {
                    if (typeof cb == 'function') cb(false); //not found
                }

            }
        },
        fadeBetween: function($from, $to, cb)
        {
            $from.fadeOut('fast', function()
            {
                $to.fadeIn('fast');
                if (cb) cb();
            });

        },
        switchBetween: function($from, $to)
        {
            $from.hide();
            $to.show();
        },
        homeBtn: function()
        {
            if (global.viewData.lastView == 'main') //already main
            {
                if (global.viewData.postsViewMeta.lastUser.length > 0)
                {
                    postsView.loadPosts('all');
                }

            }
            else //not already main
            {
                var viewHolder = ui.mainContentHolder.view('main');

                if (global.viewData.currentAcc.length > 0)
                {
                    postsView.load(viewHolder, global.viewData.currentAcc);
                }
                else
                {
                    viewHolder.html(util.getViewHtml('base/noAccountsView'));

                    $('#noAccountsView').click(function(e)
                    {
                        ui.openSettings('accounts');
                    });

                }

                //transition to displaying view
                ui.mainContentHolder.ready(viewHolder);
            }

        },
        unixtime2DatepickerString: function(unixtime)
        {
            return global.moment.unix(unixtime).tz(global.tz).format('MM/DD/YYYY h:mm A');
        },
        datepickerString2Unixtime: function(str, timezone)
        {
            return global.moment.tz(str, 'MM/DD/YYYY h:mm A', timezone).unix();
        },
        dateSelectorDialog: function(options, cb)
        {
            var opts = {
                title: options.title,
                inputType: 'text',
                className: 'dialogDatePicker',
                callback: cb
            };

            if (options.value && typeof options.value == 'string')
            {
                opts.value = options.value;
            }

            var dialog = bootbox.prompt(opts);

            dialog.init(function() {
                $('.dialogDatePicker .bootbox-input').datetimepicker();
            });

        },
        savePost: function(id, editorData, mode)
        {
            $.LoadingOverlay('show', {
                zIndex: 2000
            });

            global.viewData.autosaveOn = false;

            irpcRenderer.call('posts.savePost', {
                mode: mode,
                editorData: editorData
            }, function(err, result)
            {
                if (err)
                {
                    console.log(err);
                    bootbox.alert('Error Saving Post...');
                    global.viewData.autosaveOn = true;
                    $.LoadingOverlay('hide');
                }
                else
                {
                    if (result.reloadView)
                    {
                        $('#' + id).remove();

                        editorView.load(result.author, result.newPermlink, function()
                        {
                            global.viewData.autosaveOn = true;
                            $.LoadingOverlay('hide');
                        });

                    }
                    else
                    {
                        if (result && result.wasSaved)
                        {
                            $('#' + id + " [name='_autosaveHash']").val(editorData.n_AutosaveHash);
                            $('#' + id + " [name='_isNew']").val(0); //no longer new

                            editorUIHelpers.updatePublishPanel(id, result.publishPanel);
                        }
                        else if (result && result.errHome)
                        {
                            ui.homeBtn();
                        }
                        else if (result && result.publishPanel)
                        {
                            editorUIHelpers.updatePublishPanel(id, result.publishPanel);
                        }
                        else if (result && result.noAutosave) //not saved, but also no autosave as already saved as a non autosave revision
                        {
                            editorUIHelpers.updatePublishPanel(id, {
                                autosaveRevison: '' //clear autosave
                            });

                        }

                        global.viewData.autosaveOn = true;
                        $.LoadingOverlay('hide');

                        if (result && result.msg) bootbox.alert(result.msg);
                    }

                }

            });


        }

    };

}());
