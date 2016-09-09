(function()
{
    module.exports = {
        init: function(viewHolder, username)
        {
            // viewHolder.html(util.getViewHtml('posts/loading', {
            //     username: username
            // }));

            viewHolder.html(util.getViewHtml('posts/list', {
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

            //todo: write loader in then update with drafts, etc
            //todo: load in base tpl

            //todo: then load in counts, posts, etc
            $('#navMiddleButtons').html(util.getViewHtml('posts/middleNav', {})).show();
            //todo: set the current tab as active 



        }

    };

})();
