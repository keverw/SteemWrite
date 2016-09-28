(function()
{

    var path = require('path');

    var shell = require('electron').shell,
        textHelpers = require(path.resolve('./modules/textHelpers.js')),
        editorUIHelpers = require(path.resolve('./modules/renderer/editorUIHelpers.js')),
        editorUtility = require(path.resolve('./modules/renderer/editorUtility.js')),
        validator = require('validator');

    var defaultEditor = 'md'; //markdown is md, html is html

    $(window).resize(function()
    {
        editorUIHelpers.resize();
    });

    function updateSlugUI()
    {
        //
    }

    function editorReady(id, parameters, cb)
    {
        if (!parameters.tags) parameters.tags = '';

        irpcRenderer.call('kvs.read', {
            k: 'defaultEditor'
        }, function(err, result)
        {
            if (!err && (result && typeof result == 'object'))
            {
                defaultEditor = result.v;
            }

            if (!parameters.title) parameters.title = 'Untitled';
            if (!parameters.additionalJSON) parameters.additionalJSON = '';

            $('#' + id + " [name='postTitle']").val(parameters.title);

            if (parameters.postStatus)
            {
                $('#' + id + " [name='_postStatus']").val(parameters.postStatus);
            }

            if (parameters.permlink && typeof parameters.permlink == 'string' && parameters.permlink.length > 0)
            {
                editorReadyStep2(id, parameters, cb);
            }
            else
            {
                editorUtility.createMainPermlink(parameters.title, parameters.author, function(err, permlink)
                {
                    if (err)
                    {
                        console.log(err);
                        bootbox.alert('Error Loading Editor');
                    }
                    else
                    {
                        parameters.permlink = permlink;
                        editorReadyStep2(id, parameters, cb);
                    }

                });

            }

        });

    }

    function editorReadyStep2(id, parameters, cb)
    {
        if (!parameters.body) parameters.body = '';

        var bodyType = textHelpers.isHtml(parameters.body) ? 'html' : 'md';

        editorTextEditHelpers.insertEditor(id, bodyType, function change()
        {
            editorUIHelpers.checkPostBodyLength(id);
        }, function init()
        {
            editorUIHelpers.checkPostTitleLength(id);

            editorTextEditHelpers.setContent(editorTextEditHelpers.getEditorID(id), parameters.body);

            tagEditor.init(id, parameters.tags);

            $('#' + id + " [name='_author']").val(parameters.author);
            $('#' + id + " [name='_permalink']").val(parameters.permlink);
            $('#' + id + " [name='postJSONTextarea']").val(parameters.additionalJSON);

            //transition to displaying view
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
                        editorTextEditHelpers.refresh(editorTextEditHelpers.getEditorID(id));
                        editorUIHelpers.checkPostBodyLength(id);
                        $('#navMiddleButtons').show();

                    });

                };

                if (typeof permlink == 'string' && permlink.length > 0)
                {
                    //existing post
                    //todo: have loading existing posts
                    editorReady(id, {
                        author: author,
                        body: 'Hi!',
                        tags: $('#' + id + " [name='postTags']").val()
                    }, transitionView);
                }
                else
                {
                    //new post
                    editorReady(id, {
                        author: author,
                        postStatus: 'drafts'
                    }, transitionView);

                }

            }

            //if no permlink, new post
            //console.log(author, permlink);

        },
        switchEditor: function(type)
        {
            var reqViewID = global.viewData.editorViewMeta.viewID;

            if ($('#' + reqViewID).length)
            {
                var len = editorUIHelpers.getPostBodyLength(reqViewID);

                if (len === 0)
                {
                    if (type == 'html' || type == 'md')
                    {
                        defaultEditor = type;

                        irpcRenderer.call('kvs.set', {
                            k: 'defaultEditor',
                            v: type
                        }, function(err, result) {
                            //update editor type used
                            editorTextEditHelpers.insertEditor(reqViewID, type, function()
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

            }

        },
        switchMode: function(mode)
        {
            var reqViewID = global.viewData.editorViewMeta.viewID;

            if ($('#' + reqViewID).length)
            {
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
                    var editorID = editorTextEditHelpers.getEditorID(reqViewID);

                    var bodyStr = editorTextEditHelpers.getContent(editorID);

                    if (!bodyStr) bodyStr = ''; //incase null
                    bodyStr = bodyStr.trim();

                    var tagsArr = $('#' + reqViewID + " [name='postTags']").val();

                    if (typeof tagsArr == 'string')
                    {
                        tagsArr = tagEditor.textStr2Array(tagsArr);
                    }
                    else
                    {
                        tagsArr = [];
                    }

                    if (tagsArr.length === 0)
                    {
                        tagsArr.push('uncategorized');
                    }

                    $('#' + reqViewID + ' .previewTab').html(util.getViewHtml('editor/preview', {
                        title: $('#' + reqViewID + " [name='postTitle']").val().trim(),
                        body: textHelpers.youtubePreview(textHelpers.preview(bodyStr)),
                        author: $('#' + reqViewID + " [name='_author']").val().trim(),
                        category: tagsArr[0],
                        tagList: tagsArr
                    }));

                    //attach play button to data-youtubeid
                    $('[data-youtubeid]').click(function()
                    {
                        var youTubeID = $(this).attr('data-youtubeid');

                        var iframeSrc = 'https://www.youtube.com/embed/' + youTubeID + '?autoplay=1&autohide=1';
                        var iframeHtml = '<iframe width="640" height="480" src="' + iframeSrc + '" frameBorder="0" allowFullScreen="true"></iframe>';

                        $(this).replaceWith(iframeHtml);
                    });

                    //attach open in browser to links
                    $('#' + reqViewID + ' .previewTab a').click(function(event)
                    {
                        event.preventDefault();

                        var href = $(this).attr('href');

                        if (typeof href == 'string' && validator.isURL(href))
                        {
                            shell.openExternal(href);
                        }

                    });

                    //transition to view
                    $('#' + reqViewID + ' .previewTab').show();
                    $('#navMiddleButtons .editorTabHasContent .previewtab').addClass('active');
                }

            }

        }

    };

})();
