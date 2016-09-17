(function()
{
    module.exports = {
        load: function(viewHolder, username)
        {
            var id = viewHolder.attr('id');

            if (id)
            {
                global.viewData.viewMeta.postsView.viewID = id;

                if (global.viewData.viewMeta.postsView.lastUser != username)
                {
                    global.viewData.viewMeta.postsView.lastPage = 1;
                    global.viewData.viewMeta.postsView.lastTab = 'all';
                    global.viewData.viewMeta.postsView.lastUser = username;
                }

                viewHolder.html(util.getViewHtml('posts/initial', {
                    username: username
                }));

                module.exports.loadPosts('all', 1);
            }

        },
        loadPosts: function(type, page)
        {
            //type: all, published, scheduled, drafts, trash

            if (typeof page != 'number')
            {
                page = 1;
            }

            //check if div exists
            var reqViewID = global.viewData.viewMeta.postsView.viewID;
            if ($('#' + reqViewID).length)
            {
                if (global.viewData.viewMeta.postsView.lastTab != type)
                {
                    global.viewData.viewMeta.postsView.lastPage = page;
                    global.viewData.viewMeta.postsView.lastTab = type;
                }

                ////////////////////////////////////////////////////////////
                $('#navMiddleButtons').html(util.getViewHtml('posts/middleNav', {
                    current: type
                })).show();

                ui.fadeBetween($('#' + reqViewID + ' .postsList'), $('#' + reqViewID + ' .basicLoaderScreen'));

                //pretend fetch happend from DB
                setTimeout(function()
                {
                    $('#' + reqViewID + ' .postsList .postListCards').html(util.getViewHtml('posts/list', {
                        posts: [
                            {
                                title: 'Foo',
                                featuredImg: 'https://i.imgsafe.org/8f38637a9f.png'
                            },
                            {
                                title: 'Bar',
                                featuredImg: 'http://i.imgsafe.org/6546ce5557.jpg'
                            }
                        ]
                    }));

                    ui.fadeBetween($('#' + reqViewID + ' .basicLoaderScreen'), $('#' + reqViewID + ' .postsList'));

                }, 2000);

            }

        }

    };

})();
