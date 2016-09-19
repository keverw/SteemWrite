(function()
{
    module.exports = {
        load: function(viewHolder, username)
        {
            var id = viewHolder.attr('id');

            if (id)
            {
                global.viewData.postsViewMeta.viewID = id;

                if (global.viewData.postsViewMeta.lastUser != username)
                {
                    global.viewData.postsViewMeta.lastPage = 1;
                    global.viewData.postsViewMeta.lastTab = 'all';
                    global.viewData.postsViewMeta.lastUser = username;
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
            var reqViewID = global.viewData.postsViewMeta.viewID;
            if ($('#' + reqViewID).length)
            {
                if (global.viewData.postsViewMeta.lastTab != type)
                {
                    global.viewData.postsViewMeta.lastPage = page;
                    global.viewData.postsViewMeta.lastTab = type;
                }

                ////////////////////////////////////////////////////////////
                $('#navMiddleButtons').html(util.getViewHtml('posts/middleNav', {
                    current: type
                })).show();

                irpcRenderer.call('posts.postList', {
                    type: type,
                    username: global.viewData.postsViewMeta.lastUser,
                    page: page
                }, function(err, result)
                {
                    if (err)
                    {
                        console.log(err);
                        bootbox.alert('Error Loading Posts...');
                    }
                    else
                    {
                        $('#' + reqViewID + ' #postsList .paginationInfo').html(result.pagination.formattedText);

                        $('#' + reqViewID + ' #postsList .postListCards').html(util.getViewHtml('posts/list', {
                            username: global.viewData.postsViewMeta.lastUser,
                            posts: result.posts
                        }));

                        $('#' + reqViewID + ' #postsList .paginationHolder').html(result.pagination.html);
                        $('#' + reqViewID + ' .postcard').matchHeight({
                            byRow: false
                        });

                        ui.switchBetween($('#' + reqViewID + ' .basicLoaderScreen'), $('#' + reqViewID + ' #postsList'));

                    }

                });

            }

        },
        page: function(pageNum)
        {
            module.exports.loadPosts(global.viewData.postsViewMeta.lastTab, pageNum);
        },
        openEditor: function(ele)
        {
            var author = $(ele).attr('data-author'),
                permlink = $(ele).attr('data-permlink');

            if (typeof author == 'string' && author.length > 0)
            {

                if (typeof permlink == 'string' && permlink.length > 0)
                {
                    //existing post
                    editorView.load(author, permlink);
                }
                else
                {
                    //new post
                    editorView.load(author);
                }

            }

        }

    };

})();
