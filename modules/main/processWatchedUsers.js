(function()
{
    var _ = require('underscore');

    module.exports = {
        processItem: function(reqMeta, resultData, cb)
        {
            //note: should account for duplicated results

            //process modes updater, posts
            var updaterMode = _.contains(reqMeta.modes, 'updater');
            var postsMode = _.contains(reqMeta.modes, 'posts');

            var totalTasks = updaterMode + postsMode; //true or false can be added up just like numbers
            var doneTasks = 0;
            var lastErr = null;

            console.log(resultData);

            ////////////////////////////////////////////////////////////
            if (updaterMode)
            {
                module.exports.processUpdaterMode(reqMeta, resultData, function(err)
                {
                    if (err) lastErr = err;
                    doneTasks++;
                });

            }

            if (postsMode)
            {
                module.exports.processPostsMode(reqMeta, resultData, function(err)
                {
                    if (err) lastErr = err;
                    doneTasks++;
                });
            }

            //check when tasks are done:
            var isDone = setInterval(function()
            {
                if (totalTasks == doneTasks)
                {
                    clearInterval(isDone);
                    cb(lastErr);
                }

            }, 1);

        },
        processUpdaterMode: function(reqMeta, resultData, cb)
        {
            //check for a post indicating a new version

            var reqID = reqMeta.modes;
            var username = reqMeta.username;

            if (username == 'steemwrite')
            {
                //todo: actually write this if it's a new post and over current version
                cb();
            }
            else
            {
                cb();
            }

        },
        processPostsMode: function(reqMeta, resultData, cb)
        {
            //process new posts, etc
            var reqID = reqMeta.modes;
            var username = reqMeta.username;

            //todo: write this
            cb();
        }
    };

}());
