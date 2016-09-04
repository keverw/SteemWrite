(function()
{

    module.exports = {
        read: function(parameters, cb)
        {
            if (parameters && typeof parameters == 'object' && parameters.k)
            {
                global.isDBReady(function(err)
                {
                    if (err) return cb(err);

                    global.db.get("SELECT * FROM kvs WHERE k = ? LIMIT 1", [parameters.k], function(err, row)
                    {
                        if (err) return cb(err);
                        cb(err, row);
                    });

                });

            }
            else
            {
                var badInput = new Error('Missing k');
                badInput.type = 'db';
                badInput.code = 'badInput';
                cb(badInput);
            }

        },
        set: function(parameters, cb)
        {
            if (parameters && typeof parameters == 'object' && parameters.k && parameters.v)
            {
                global.isDBReady(function(err)
                {
                    if (err) return cb(err);

                    global.db.run("REPLACE INTO kvs (`k`, `v`) VALUES (?, ?)", [parameters.k, parameters.v], function(err)
                    {
                        cb(err);
                    });
                });
            }
            else
            {
                var badInput = new Error('Missing k and/or v');
                badInput.type = 'db';
                badInput.code = 'badInput';
                cb(badInput);
            }

        },
        delete: function(parameters, cb)
        {
            if (parameters && typeof parameters == 'object' && parameters.k)
            {
                global.isDBReady(function(err)
                {
                    if (err) return cb(err);

                    global.db.run("DELETE FROM kvs WHERE k = ?", [parameters.k], function(err)
                    {
                        cb(err);
                    });

                });

            }
            else
            {
                var badInput = new Error('Missing k');
                badInput.type = 'db';
                badInput.code = 'badInput';
                cb(badInput);
            }

        }
    };

}());
