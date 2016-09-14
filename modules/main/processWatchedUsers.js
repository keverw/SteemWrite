(function()
{
    module.exports = {
        processItem: function(reqMeta, resultData, cb)
        {
            //note: should account for duplicated results

            //process modes updater, posts

            console.log(resultData);
            cb();
        }
    };

}());
