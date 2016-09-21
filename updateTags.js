//this is meant to run by a dev to update the tags.json file that's shipped with the app

//connect to blockchain
global.bc = null; //BC connection
global.bcReady = false; //BC connection ready
global.bcHardfork = '';

var util = require('./modules/util.js'),
    categorySelectorValidation = require('./modules/steemit/CategorySelectorValidation.js');

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
    global.bc.database_api().exec('get_trending_tags', ['', '5']) //50000 - -1 seems to work too
        .then(function(res)
        {
            if (res.length > 0)
            {
                for (var t in res)
                {
                    if (res.hasOwnProperty(t))
                    {
                        var tag = res[t].tag;

                        if (typeof tag == 'string')
                        {

                            if (tag.charAt(0) == '#')
                            {
                                tag = tag.slice(1);
                            }

                            if (!categorySelectorValidation.validateCategory(tag)) //is null, no error
                            {
                                console.log(tag);
                            }

                        }

                    }

                }

            }
            else {
                throw new Error('No data downloaded');
            }

            saveFile();

        })
        .catch(function(e)
        {
            throw e;
        });

    //console.log(mem);

    // count: 0,
    // tags: []


}
