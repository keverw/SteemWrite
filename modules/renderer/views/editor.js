(function()
{
    var path = require('path');

    var textHelpers = require(path.resolve('./modules/textHelpers.js')),
        editorUIHelpers = require(path.resolve('./modules/renderer/editorUIHelpers.js'));

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
                //todo: only switch if body is empty

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

    };

})();
