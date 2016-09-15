var sqlHelpers = require('../modules/main/sqlHelpers.js');

sqlHelpers.insert({
    test: 'testing...',
    lol: 'hi'
}, function(string, values)
{
    console.log(string, values);
});
