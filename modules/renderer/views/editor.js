(function()
{
    var path = require('path');

    var util = require(path.resolve('./modules/util.js')),
        textHelpers = require(path.resolve('./modules/textHelpers.js')),
        editorUIHelpers = require(path.resolve('./modules/renderer/editorUIHelpers.js')),
        editorUtility = require(path.resolve('./modules/editorUtility.js'));

    var defaultEditor = 'md'; //markdown is md, html is html

    $(window).resize(function()
    {
        editorUIHelpers.resize();
    });

    function updatePermlinkUI()
    {
        //...
    }

    function editorReady(id, parameters, cb)
    {
        if (!parameters.tags) parameters.tags = '';

        irpcRenderer.call('kvs.read', {
            k: 'defaultEditor'
        }, function(err, result)
        {
            if (!err && (result && typeof result == 'object')) defaultEditor = result.v;

            if (!parameters.title) parameters.title = 'Untitled';
            if (!parameters.additionalJSON) parameters.additionalJSON = {};

            $('#' + id + " [name='postTitle']").val(parameters.title);
            $('#' + id + " [name='postJSONTextarea']").val(JSON.stringify(parameters.additionalJSON));

            if (parameters.postStatus) $('#' + id + " [name='_postStatus']").val(parameters.postStatus);

            if (parameters.permlink && typeof parameters.permlink == 'string' && parameters.permlink.length > 0)
            {
                editorReadyStep2(id, parameters, cb);
            }
            else
            {

                irpcRenderer.call('posts.createMainPermlink', {
                    author: parameters.author,
                    title: parameters.title
                }, function(err, result)
                {
                    if (err)
                    {
                        console.log(err);
                        bootbox.alert('Error Loading Editor');
                    }
                    else
                    {
                        parameters.permlink = result.permlink;
                        editorReadyStep2(id, parameters, cb);
                    }

                });

            }

        });

    }

    function editorReadyStep2(id, parameters, cb)
    {
        if (!parameters.body) parameters.body = '';

        var editorType = defaultEditor;

        if (parameters.body.length > 0) editorType = textHelpers.isHtml(parameters.body) ? 'html' : 'md';

        editorTextHelpers.insertEditor(id, editorType, function change()
        {
            editorUIHelpers.checkPostBodyLength(id);
        }, function init()
        {
            editorTextHelpers.setContent(editorTextHelpers.getEditorID(id), parameters.body);

            editorUIHelpers.checkAdditionalJSON(id);
            editorUIHelpers.checkPostTitleLength(id);

            tagEditor.init(id, parameters.tags);

            $('#' + id + " [name='_author']").val(parameters.author);
            $('#' + id + " [name='_permalink']").val(parameters.permlink);
            $('#' + id + " [name='_autosaveHash']").val(editorUtility.hashContent(parameters.title, parameters.body, parameters.tags, parameters.additionalJSON));

            //transition to displaying view
            editorUIHelpers.initPublishPanel(id, parameters);
            cb();
        });

    }

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
                    //todo: call updatePermlinkUI/write that function
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
                                current: defaultEditor
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

                                editorReady(id, {
                                    postStatus: result.postStatus,
                                    author: result.author,
                                    permlink: result.permlink,
                                    title: result.title,
                                    body: result.body,
                                    tags: result.tags,
                                    additionalJSON: result.json_metadata,
                                    autosaveRevison: result.autosaveRevison,
                                    date: result.date,
                                    scheduledDate: result.scheduledDate
                                }, transitionView);

                            }

                        }

                    });

                }
                else
                {
                    //new post
                    $('#' + id + " [name='_isNew']").val(1);

                    editorReady(id, {
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
                    defaultEditor = type;

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
                                current: defaultEditor
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

            }

        },
        autosave: function(id, cb)
        {
            //cb - err
            var data = editorUIHelpers.getEditorData(id);

            if (data.found)
            {
                var autosaveInterval = 1000; //1 sec

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

        }

    };

})();
