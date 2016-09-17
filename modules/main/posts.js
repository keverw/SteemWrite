(function()
{
    var pagination = require('./pagination.js');

    module.exports = {
        postList: function(parameters, cb)
        {
            var output = {};

            function processResults(err, rows)
            {
                if (err) return cb(err);

                output.posts = rows;
                cb(null, output);
            }

            function processCountResult(err, row)
            {
                if (err) return cb(err);

                var postCount = row.posts;

                var myPagination = pagination.init();
                myPagination.setFN('postsView.page');
                myPagination.setPerPage(7);
                myPagination.setTotalItems(postCount);

                myPagination.setPage(parameters.page);
                output.pagination = myPagination.getPagination();

                var fields = 'author, permlink, title, status, date, scheduledDate, tag1, tag2, tag3, tag4, tag5, featuredImg';

                if (parameters.type == 'all')
                {
                    global.db.all("SELECT " + fields + " FROM posts WHERE author = ? ORDER BY date DESC " + myPagination.getLimitSql(), [parameters.username], processResults);
                }
                else
                {
                    global.db.all("SELECT " + fields + " FROM posts WHERE author = ? AND status = ? ORDER BY date DESC " + myPagination.getLimitSql(), [parameters.username, parameters.type], processResults);
                }

            }

            if (parameters.type == 'all')
            {
                global.db.get("SELECT COUNT(*) AS posts FROM posts WHERE author = ?", [parameters.username], processCountResult);
            }
            else
            {
                global.db.get("SELECT COUNT(*) AS posts FROM posts WHERE author = ? AND status = ?", [parameters.username, parameters.type], processCountResult);
            }

        }

    };

}());
