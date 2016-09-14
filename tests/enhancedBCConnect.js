//connect to blockchain
global.bc = null; //BC connection
global.bcReady = false; //BC connection ready
global.bcHardfork = '';

var util = require('../modules/util.js');

////Test Code
util.enhancedBCConnect({}, function(err)
{
    if (!err)
    {
        test();
    }

});

function test()
{
    console.log('Hello!');
}
