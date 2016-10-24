(function()
{

    module.exports = {
        insert: function(parameters, cb)
        {
            var names = [];
            var placeholders = [];
            var values = [];

            for (var key in parameters)
            {
                if (parameters.hasOwnProperty(key))
                {
                    names.push('`' + key + '`');
                    placeholders.push('?');
                    values.push(parameters[key]);
                }

            }

            cb('(' + names.join(', ') + ') VALUES (' + placeholders.join(', ') + ')', values);

        },
        update: function(parameters, cb)
        {
            var pairs = [];
            var values = [];

            for (var key in parameters)
            {
                if (parameters.hasOwnProperty(key))
                {
                    pairs.push(key + '=?');
                    values.push(parameters[key]);
                }
            }

            cb(pairs.join(', '), values);
        },
        inParam: function(sql, arr)
        {
            //thanks https://github.com/mapbox/node-sqlite3/issues/527
            return sql.replace('?#', arr.map(() => '?').join(',')); // jshint ignore:line
        }


    };

})();
