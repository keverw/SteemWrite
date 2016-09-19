(function()
{
    module.exports = {
        load: function(author, permlink)
        {
            var viewHolder = ui.mainContentHolder.view('editor');

            var id = viewHolder.attr('id');

            if (id)
            {
                global.viewData.editorViewMeta.viewID = id;


                //transition to displaying view
                ui.mainContentHolder.ready(viewHolder);
            }




            // console.log(author, permlink);
            // console.log(typeof author, typeof permlink);

            //if no permlink, new post
            //console.log(author, permlink);

            ///
        }

    };

})();
