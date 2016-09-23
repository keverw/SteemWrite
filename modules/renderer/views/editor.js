(function()
{
    var path = require('path'),
        _ = require('underscore');

    var defaultEditor = 'md'; //markdown is md, html is html
    var categorySelectorValidation = require(path.resolve('./modules/steemit/CategorySelectorValidation.js'));

    function resize()
    {
        var windowWidth = $(window).width(); //retrieve current window width
        var windowHeight = $(window).height(); //retrieve current window height

        var sidebarSize = 300;
        $('#editorHolder .editorLeft').width((windowWidth - sidebarSize - 15) + 'px');
        $('#editorHolder .editorRight').width((sidebarSize - 15) + 'px');

        $('#editorHolder .editorRight').height((windowHeight - 60) + 'px');
        $('#editorHolder .editorHolder').height((windowHeight - 149) + 'px');
    }

    $(window).resize(function() {
        resize();
    });

    function tagEditorRenderLabels(reqViewID, tags)
    {
        if (typeof tags == 'string')
        {
            tags = tags.split(' ');
            tags = tags.filter(function(v) {
                return v !== '';
            });
        }

        $('#' + reqViewID + ' .tagsList').html(util.getViewHtml('editor/tagsList', {
            tags: tags,
            viewID: reqViewID
        }));
    }

    module.exports = {
        tagEditor: {
            addTagForm: function(formSelector)
            {
                var form = $(formSelector).serializeJSON();
                $('#' + form._tagViewID + ' .tagsUIArea :input, #' + form._tagViewID + ' .tagsUIArea :button').attr('disabled', true);

                if ($('#' + form._tagViewID).length > 0)
                {
                    var spaceOrCommaErr = 'Use only lowercase letters, digits and one dash';

                    var tagVal = form._tagName.replace(/\s+/g, ' ');
                    tagVal = tagVal.trim();

                    if (tagVal.indexOf(' ') > -1 || tagVal.indexOf(',') > -1)
                    {
                        bootbox.alert({
                            title: 'Add Tag',
                            message: spaceOrCommaErr
                        });

                    }
                    else
                    {
                        var validationResult = categorySelectorValidation.validateCategory(tagVal);

                        if (validationResult) //not null - error
                        {
                            bootbox.alert({
                                title: 'Add Tag',
                                message: validationResult
                            });
                        }
                        else
                        {
                            var tagsArray = $('#' + form._tagViewID + " [name='postTags']").val();

                            if (typeof tagsArray == 'string')
                            {
                                tagsArray = tagsArray.split(' ');
                                tagsArray = tagsArray.filter(function(v) {
                                    return v !== '';
                                });

                                if (_.contains(tagsArray, tagVal))
                                {
                                    bootbox.alert({
                                        title: 'Add Tag',
                                        message: tagVal + ' already added'
                                    });

                                }
                                else
                                {
                                    if (tagsArray.length == 5)
                                    {
                                        bootbox.alert({
                                            title: 'Add Tag',
                                            message: 'Please use only five categories'
                                        });

                                    }
                                    else
                                    {
                                        tagsArray.push(tagVal);
                                        $('#' + form._tagViewID + " [name='postTags']").val(tagsArray.join(' '));
                                        $('#' + form._tagViewID + " [name='_tagName']").val('');
                                    }

                                }

                                //update tags ui
                                tagEditorRenderLabels(form._tagViewID, tagsArray);

                            }

                        }

                    }

                }

                $('#' + form._tagViewID + ' .tagsUIArea :input, #' + form._tagViewID + ' .tagsUIArea :button').attr('disabled', false);
                return false;
            },
            removeTagBtn: function(btnSelector)
            {
                var viewID = $(btnSelector).attr('data-viewID');
                var tag = $(btnSelector).attr('data-tag');

                if (typeof viewID == 'string' && typeof tag == 'string')
                {
                    if ($('#' + viewID).length > 0)
                    {
                        $('#' + viewID + ' .tagsUIArea :input, #' + viewID + ' .tagsUIArea :button').attr('disabled', true);

                        var tagsArray = $('#' + viewID + " [name='postTags']").val();

                        if (typeof tagsArray == 'string')
                        {
                            tagsArray = tagsArray.split(' ');
                            tagsArray = tagsArray.filter(function(v) {
                                return v !== '';
                            });

                            tagsArray = _.without(tagsArray, tag);
                            $('#' + viewID + " [name='postTags']").val(tagsArray.join(' '));

                            //update tags ui
                            tagEditorRenderLabels(viewID, tagsArray);
                        }

                        $('#' + viewID + ' .tagsUIArea :input, #' + viewID + ' .tagsUIArea :button').attr('disabled', false);

                    }

                }

            }
        },
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
                        resize();
                        ui.switchBetween($('#' + id + ' .basicLoaderScreen'), $('#' + id + ' #editorHolder'));

                        editorHelpers.insertEditor(id, 'md');
                        //editorHelpers.insertEditor(id, 'html');

                        tagEditorRenderLabels(id, $('#' + id + " [name='postTags']").val());

                        //update nav bar buttons
                        if (global.viewData.editorViewMeta.viewID == id)
                        {
                            $('#navMiddleButtons').html(util.getViewHtml('editor/middleNavNew', {
                                current: defaultEditor
                            })).show();

                        }

                    });

                }

                //transition to displaying view
                ui.mainContentHolder.ready(viewHolder);
            }

            new window.Awesomplete(document.querySelector('#' + id + ' .tagsAutoCompleteBox'), {
                list: global.tags,
                minChars: 1,
                maxItems: 15
            });

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
                //todo: only switch if body is empty

                if (type == 'html' || type == 'md')
                {
                    defaultEditor = type;

                    irpcRenderer.call('kvs.set', {
                        k: 'defaultEditor',
                        v: type
                    }, function(err, result) {
                        //update editor type used;

                        //update nav bar buttons
                        if (global.viewData.editorViewMeta.viewID == reqViewID)
                        {
                            $('#navMiddleButtons').html(util.getViewHtml('editor/middleNavNew', {
                                current: defaultEditor
                            })).show();

                        }

                        editorHelpers.insertEditor(reqViewID, type);

                    });

                }

            }

        }

    };

})();
