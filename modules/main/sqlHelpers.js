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

            cb(names.join(', '), placeholders.join(', '), values);

        }
    }

})();
