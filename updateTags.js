//this is meant to run by a dev to update the tags.json file that's shipped with the app

//connect to blockchain
global.bc = null; //BC connection
global.bcReady = false; //BC connection ready
global.bcHardfork = '';

var util = require('./modules/util.js');

var fs = require('fs');

var mem = {
    updated: '',
    count: 0,
    tags: []
};

util.enhancedBCConnect({}, function(err)
{
    if (err) throw err;
    loadFile();
});

function loadFile()
{
    fs.readFile('./tags.json', 'utf8', function(err, data)
    {
        if (err)
        {
            if (err.code === 'ENOENT') //no file
            {
                download();
            }
            else
            {
                throw err;
            }

        }
        else
        {
            mem = JSON.parse(data);
            download();
        }

    });

}

function saveFile()
{
    mem.updated = new Date();

    fs.writeFile('./tags.json', JSON.stringify(mem), 'utf8', function(err)
    {
        if (err) throw err;
        process.exit();
    });

}

function download()
{
    console.log(mem);

    // updated: '',
    // count: 0,
    // tags: []

    saveFile();
}
