(function()
{
    var path = require('path');

    var util = require(path.resolve('./modules/util.js')),
        textHelpers = require(path.resolve('./modules/textHelpers.js')),
        editorUIHelpers = require(path.resolve('./modules/renderer/editorUIHelpers.js')),
        editorUtility = require(path.resolve('./modules/editorUtility.js')),
        shell = require('electron').shell;

    $(window).resize(function()
    {
        editorUIHelpers.resize();
    });

    module.exports = {
        load: function(author, permlink)
        {
            var viewHolder = ui.mainContentHolder.view('editor');

            var id = viewHolder.attr('id');

            if (id)
            {
                global.viewData.editorViewMeta.viewID = id;

                viewHolder.html(util.getViewHtml('editor/initial', {
                    viewID: id
                }));

                $('#' + id + " [name='postTitle']").on('change keyup paste', function()
                {
                    editorUIHelpers.checkPostTitleLength(id);
                });

                //this should only be checked when done typing, not during
                $('#' + id + " [name='postJSONTextarea']").on('change paste', function()
                {
                    editorUIHelpers.checkAdditionalJSON(id);
                });

                var transitionView = function()
                {
                    ui.switchBetween($('#' + id + ' .basicLoaderScreen'), $('#' + id + ' #editorHolder'));

                    ui.mainContentHolder.ready(viewHolder, function()
                    {
                        //update nav bar buttons
                        if (global.viewData.editorViewMeta.viewID == id)
                        {
                            $('#navMiddleButtons').html(util.getViewHtml('editor/middleNavNew', {
                                current: global.viewData.defaultEditor
                            }));

                        }

                        editorUIHelpers.resize();
                        editorTextHelpers.refresh(editorTextHelpers.getEditorID(id));
                        editorUIHelpers.checkPostBodyLength(id);
                        $('#navMiddleButtons').show();
                        editorView.autosave(id);

                    });

                };

                if (typeof permlink == 'string' && permlink.length > 0)
                {
                    //existing post
                    $('#' + id + " [name='_isNew']").val(0);

                    irpcRenderer.call('posts.loadPost', {
                        author: author,
                        permlink: permlink
                    }, function(err, result) {
                        if (err)
                        {
                            console.log(err);
                            bootbox.alert('Error Loading Editor');
                        }
                        else
                        {
                            if (result.status == 'notfound')
                            {
                                bootbox.alert('Error Loading Editor');
                            }
                            else if (result.status == 'found')
                            {
                                if (typeof result.json_metadata != 'object') result.json_metadata = {};

                                delete result.json_metadata.tags;
                                delete result.json_metadata.users;
                                delete result.json_metadata.image;
                                delete result.json_metadata.links;

                                editorUIHelpers.editorReady(id, {
                                    postStatus: result.postStatus,
                                    author: result.author,
                                    permlink: result.permlink,
                                    title: result.title,
                                    body: result.body,
                                    tags: result.tags,
                                    additionalJSON: result.json_metadata,
                                    autosaveRevison: result.autosaveRevison,
                                    date: result.date,
                                    scheduledDate: result.scheduledDate,
                                    warningMsg: result.warningMsg
                                }, transitionView);

                            }

                        }

                    });

                }
                else
                {
                    //new post
                    $('#' + id + " [name='_isNew']").val(1);

                    editorUIHelpers.editorReady(id, {
                        author: author,
                        postStatus: 'drafts',
                        autosaveRevison: '',
                        date: 0,
                        scheduledDate: 0
                    }, transitionView);

                }

            }

        },
        switchEditor: function(type)
        {
            var reqViewID = global.viewData.editorViewMeta.viewID;

            if ($('#' + reqViewID).length)
            {
                var len = editorUIHelpers.getPostBodyLength(reqViewID);

                if (len === 0 && (type == 'html' || type == 'md'))
                {
                    global.viewData.defaultEditor = type;

                    irpcRenderer.call('kvs.set', {
                        k: 'defaultEditor',
                        v: type
                    }, function(err, result) {
                        //update editor type used
                        editorTextHelpers.insertEditor(reqViewID, type, function()
                        {
                            editorUIHelpers.checkPostBodyLength(reqViewID);
                        }, function init()
                        {
                            editorUIHelpers.checkPostBodyLength(reqViewID);
                            editorUIHelpers.resize();
                        });

                        //update nav bar buttons
                        if (global.viewData.editorViewMeta.viewID == reqViewID)
                        {
                            $('#navMiddleButtons').html(util.getViewHtml('editor/middleNavNew', {
                                current: global.viewData.defaultEditor
                            })).show();

                        }

                    });

                }

            }

        },
        switchMode: function(mode)
        {
            var reqViewID = global.viewData.editorViewMeta.viewID;

            if ($('#' + reqViewID).length)
            {
                //can't preview if empty
                if (mode == 'preview' && editorUIHelpers.getPostBodyLength(reqViewID) === 0) return;

                //switch view
                $('#navMiddleButtons .editorTabHasContent li').removeClass('active');

                $('#' + reqViewID + ' .previewTab').html();
                $('#' + reqViewID + ' .editorHolderTabs').hide();

                if (mode == 'edit')
                {
                    $('#' + reqViewID + ' .editorTab').show();
                    $('#navMiddleButtons .editorTabHasContent .edittab').addClass('active');
                }
                else if (mode == 'preview')
                {
                    var bodyStr = editorTextHelpers.getContent(editorTextHelpers.getEditorID(reqViewID)).trim();

                    if (!bodyStr) bodyStr = ''; //incase null

                    var tagsArr = $('#' + reqViewID + " [name='postTags']").val();

                    tagsArr = (typeof tagsArr == 'string') ? util.splitRemoveEmpties(' ', tagsArr) : [];

                    if (tagsArr.length === 0) tagsArr.push('uncategorized');

                    $('#' + reqViewID + ' .previewTab').html(util.getViewHtml('editor/preview', {
                        title: $('#' + reqViewID + " [name='postTitle']").val().trim(),
                        body: textHelpers.youtubePreview(textHelpers.preview(bodyStr)),
                        author: $('#' + reqViewID + " [name='_author']").val().trim(),
                        category: tagsArr[0],
                        tagList: tagsArr
                    }));

                    //transition to view
                    $('#' + reqViewID + ' .previewTab').show();
                    $('#navMiddleButtons .editorTabHasContent .previewtab').addClass('active');
                }
                else if (mode == 'revisions')
                {
                    //transition to view
                    $('#' + reqViewID + ' .revisionsTab').show();
                    $('#navMiddleButtons .editorTabHasContent .revisionsTab').addClass('active');
                }

            }

        },
        autosave: function(id, cb)
        {
            //cb - err
            var data = editorUIHelpers.getEditorData(id);

            if (data.found)
            {
                var autosaveInterval = 250; //A quarter of a second

                if (global.viewData.autosaveOn)
                {
                    if (data.c_AutosaveHash == data.n_AutosaveHash)
                    {
                        //no change
                        setTimeout(function()
                        {
                            editorView.autosave(id);
                        }, autosaveInterval);

                        if (cb) cb();
                    }
                    else
                    {
                        //changed
                        irpcRenderer.call('posts.savePost', {
                            mode: 'autosave',
                            editorData: data
                        }, function(err, result)
                        {
                            if (err)
                            {
                                console.log(err);
                                bootbox.alert('Error Auto Saving Post...');
                            }
                            else if (!result.locked && result.saved)
                            {
                                //was saved
                                $('#' + id + " [name='_autosaveHash']").val(data.n_AutosaveHash);
                                $('#' + id + " [name='_isNew']").val(0); //no longer new

                                editorUIHelpers.updatePublishPanel(id, {
                                    autosaveRevison: result.autosaveRevison
                                });

                            }

                            setTimeout(function()
                            {
                                editorView.autosave(id);
                            }, autosaveInterval);

                            if (cb) cb();
                        });
                    }

                }
                else
                {
                    setTimeout(function()
                    {
                        editorView.autosave(id);
                    }, autosaveInterval);

                    if (cb) cb();
                }

            }
            else
            {
                if (cb) cb();
            }

        },
        viewOnSteem: function(id)
        {
            var data = editorUIHelpers.getEditorData(id);

            if (data.found && data.postStatus == 'published')
            {
                shell.openExternal(['https://steemit.com', util.splitRemoveEmpties(' ', data.tags)[0], '@' + data.author, data.permlink].join('/'));
            }

        },
        dismissWarning: function(id)
        {
            var data = editorUIHelpers.getEditorData(id);

            if (data.found)
            {
                irpcRenderer.call('posts.dismissWarning', {
                    author: data.author,
                    permlink: data.permlink
                }, function(err, result)
                {
                    if (err)
                    {
                        console.log(err);
                        bootbox.alert('Error Dismissing...');
                    }
                    else
                    {
                        $('#' + id + ' .postWarningAlert').alert('close');
                    }

                });

            }

        },
        changeAuthor: function(id)
        {
            var data = editorUIHelpers.getEditorData(id);

            if (data.found)
            {

                irpcRenderer.call('accounts.accountList', {}, function(err, result)
                {
                    if (err)
                    {
                        console.log(err);
                        bootbox.alert('Error Loading Accounts...');
                    }
                    else
                    {
                        var options = util.array2BootboxSelectOptions(result.accountsList);

                        bootbox.prompt({
                            title: "Change Author",
                            inputType: "select",
                            inputOptions: options,
                            value: data.author,
                            callback: function(value)
                            {
                                if (value)
                                {
                                    if (data.author != value)
                                    {
                                        alert('change to: ' + value);
                                    }

                                }

                            }
                        });

                    }

                });

            }

            // todo: code this
        },
        saveDraft: function(id)
        {
            // todo: code this
            alert('saveDraft later');
        },
        scheduledSetDate: function(id)
        {
            // todo: code this
            alert('scheduledSetDate later');
        },
        scheduledChangeDate: function(id)
        {
            // todo: code this
            alert('scheduledChangeDate later');
        },
        scheduledCancel: function(id)
        {
            // todo: code this
            alert('scheduledCancel later');
        },
        trashPost: function()
        {
            // todo: code this
            alert('trashPost later');
        },
        restoreTrashed: function(id)
        {
            // todo: code this
            alert('restoreTrashed later');
        },
        deleteTrashed: function(id)
        {
            // todo: code this
            alert('deleteTrashed later');
        },
        publishPost: function(id)
        {
            // todo: code this
            alert('publishPost later');
        },
        updatePost: function(id)
        {
            // todo: code this
            alert('updatePost later');
        }

    };

})();
