(function()
{
    var path = require('path');

    var shell = require('electron').shell,
        textHelpers = require(path.resolve('./modules/textHelpers.js')),
        editorUIHelpers = require(path.resolve('./modules/renderer/editorUIHelpers.js')),
        validator = require('validator');

    var defaultEditor = 'md'; //markdown is md, html is html

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

                //$('#' + reqViewID + ' #editorHolder')

                viewHolder.html(util.getViewHtml('editor/initial', {
                    viewID: id
                }));

                $('#' + id + " [name='postTitle']").on('change keyup paste', function()
                {
                    editorUIHelpers.checkPostTitleLength(id);
                });

                if (typeof permlink == 'string' && permlink.length > 0)
                {
                    //existing post

                }
                else
                {
                    //new post
                    irpcRenderer.call('kvs.read', {
                        k: 'defaultEditor'
                    }, function(err, result)
                    {
                        if (!err && (result && typeof result == 'object'))
                        {
                            defaultEditor = result.v;
                        }

                        //todo: load in editor based on defaultEditor val

                        //tmp
                        ui.switchBetween($('#' + id + ' .basicLoaderScreen'), $('#' + id + ' #editorHolder'));

                        // editorTextEditHelpers.insertEditor(id, 'md', function change()
                        editorTextEditHelpers.insertEditor(id, 'html', function change()
                        {
                            editorUIHelpers.checkPostBodyLength(id);
                        }, function init()
                        {
                            editorUIHelpers.checkPostBodyLength(id); //use on exisiting posts

                            tagEditor.init(id, $('#' + id + " [name='postTags']").val());

                            editorUIHelpers.checkPostTitleLength(id); //use on exisiting posts

                            //update nav bar buttons
                            if (global.viewData.editorViewMeta.viewID == id)
                            {
                                $('#navMiddleButtons').html(util.getViewHtml('editor/middleNavNew', {
                                    current: defaultEditor
                                })).show();

                            }

                            //transition to displaying view
                            ui.mainContentHolder.ready(viewHolder, function()
                            {
                                editorUIHelpers.resize();
                            });

                        });

                    });

                }

            }

            // console.log(author, permlink);
            // console.log(typeof author, typeof permlink);

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

                    //todo: populate the author with the real author
                    $('#' + reqViewID + ' .previewTab').html(util.getViewHtml('editor/preview', {
                        title: $('#' + reqViewID + " [name='postTitle']").val().trim(),
                        body: textHelpers.youtubePreview(textHelpers.preview(bodyStr)),
                        author: 'todo',
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

                    //transition too view
                    $('#' + reqViewID + ' .previewTab').show();
                    $('#navMiddleButtons .editorTabHasContent .previewtab').addClass('active');
                }

            }

        }

    };

})();
