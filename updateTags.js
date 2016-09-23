//this is meant to run by a dev to update the tags.json file that's shipped with the app

//connect to blockchain
global.bc = null; //BC connection
global.bcReady = false; //BC connection ready
global.bcHardfork = '';

var util = require('./modules/util.js'),
    fs = require('fs'),
    _ = require('underscore'),
    categorySelectorValidation = require('./modules/steemit/CategorySelectorValidation.js');

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
    global.bc.database_api().exec('get_trending_tags', ['', '-1'])
        .then(function(res)
        {
            if (res.length > 0)
            {
                for (var t in res)
                {
                    if (res.hasOwnProperty(t))
                    {
                        var tag = res[t].tag;
                        var top_posts = res[t].top_posts;

                        if (typeof tag == 'string' && top_posts >= 5) //5 posts or more using the tag
                        {

                            if (tag.charAt(0) == '#')
                            {
                                tag = tag.slice(1);
                            }

                            if (!categorySelectorValidation.validateCategory(tag)) //is null, no error
                            {
                                //check if not in list, add...
                                if (!_.contains(mem.tags, tag))
                                {
                                    mem.tags.push(tag);
                                }

                            }

                        }

                    }

                }

            }
            else {
                throw new Error('No data downloaded');
            }

            ////////////
            mem.tags = _.uniq(mem.tags);
            mem.tags = _.sortBy(mem.tags, function(name) {
                return name;
            });

            mem.count = mem.tags.length;

            saveFile();

        })
        .catch(function(e)
        {
            throw e;
        });

}
