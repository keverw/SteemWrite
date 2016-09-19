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

                irpcRenderer.call('posts.postList', {
                    type: type,
                    username: global.viewData.viewMeta.postsView.lastUser,
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
                            username: global.viewData.viewMeta.postsView.lastUser,
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
            module.exports.loadPosts(global.viewData.viewMeta.postsView.lastTab, pageNum);
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
