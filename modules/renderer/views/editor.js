(function()
{
    var defaultEditor = 'md'; //markdown is md, html is html

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

                        editorHelpers.insertEditor(id, 'md', function()
                        {
                            console.log('Changed');
                        });

                        editorHelpers.insertEditor(id, 'html', function()
                        {
                            console.log('Changed');
                        });

                        tagEditor.init(id, $('#' + id + " [name='postTags']").val());

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
                        editorHelpers.insertEditor(reqViewID, type, function()
                        {
                            console.log('Changed');
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
