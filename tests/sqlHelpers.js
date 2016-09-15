var sqlHelpers = require('../modules/main/sqlHelpers.js');

sqlHelpers.insert({
    test: 'testing...',
    lol: 'hi'
}, function(names, placeholders, values)
{
    console.log(names, placeholders, values);
});
