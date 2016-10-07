(function()
{
    var crypto = require('crypto'),
        fs = require('fs'),
        path = require('path'),
        pug = require('pug'),
        url = require('url'),
        _ = require('underscore'),
        steemClient = require('steem-rpc').Client,
        DiffMatchPatch = require('diff-match-patch');

    var dmp = new DiffMatchPatch();

    module.exports = {
        encrypt: function(data, key)
        {
            var cipher = crypto.createCipher('aes-256-cbc', key);
            var encrypted_data = cipher.update(data, 'utf8', 'base64');
            encrypted_data += cipher.final('base64');

            return encrypted_data;
        },
        decrypt: function(data, key)
        {
            var decipher = crypto.createDecipher('aes-256-cbc', key);
            var decrypted_data = decipher.update(data, 'base64', 'utf8');
            decrypted_data += decipher.final('utf8');

            return decrypted_data;
        },
        getViewHtml: function(name, locals)
        {
            var tplPath = path.join(__dirname, '../views', name + '.pug');
            var fn = pug.compile(fs.readFileSync(tplPath, 'utf-8'));
            return fn(locals);
        },
        toObject: function(error)
        {
            var alt = {};

            Object.getOwnPropertyNames(error).forEach(function(key) {
                if (error[key] && typeof error[key] == 'object')
                {
                    alt[key] = module.toObject(error[key]);
                }
                else
                {
                    alt[key] = error[key];
                }

            });

            return alt;
        },
        isWS: function(address)
        {
            var protocols = ['ws+unix:', 'ws:', 'wss:', 'http:', 'https:'];

            ////////////////////////////
            var serverUrl = url.parse(address);
            return (_.contains(protocols, serverUrl.protocol) && serverUrl.host) ? true : false;
        },
        time: function()
        {
            //returns unixtime, like PHP's time() function
            return Math.floor(Date.now() / 1000);
        },
        enhancedBCConnect: function(options, cb)
        {
            if (!global.enhancedBCConnectInited)
            {
                global.enhancedBCConnectInited = true;

                var hasReadyLogicRan = false;

                var checkHardforkVersion = function()
                {
                    global.bc.database_api().exec('get_hardfork_version', []).then(function(res)
                    {
                        //console.log('get_hardfork_version res', res);

                        if (!hasReadyLogicRan)
                        {
                            hasReadyLogicRan = true;

                            global.bcHardfork = res;
                            global.bcReady = true;

                            if (cb) cb();

                            // Pulse the websocket every 20 seconds for get_hardfork_version, just to make
                            // sure the websocket doesn't disconnect.

                            var pulse = setInterval(function()
                            {
                                if (global.isAppClosing)
                                {
                                    clearInterval(pulse);
                                    return;
                                }

                                checkHardforkVersion();
                            }, 20000);

                        }

                    }).catch(function(e) {
                        //console.log('get_hardfork_version res', e);

                        //retry on an error
                        setTimeout(function()
                        {
                            checkHardforkVersion();
                        }, 1000);
                    });

                };

                global.bc = steemClient.get(options, true);

                global.bc.initPromise.then(function(res)
                {
                    //console.log('*** Connected to', res, '***');

                    //Detect hardfork version
                    checkHardforkVersion();

                }).catch(function(err)
                {
                    //console.log('Connection error:', err);
                    if (cb) cb(err);
                });

            }

        },
        createPatch: function(oldText, newText, lessSpace)
        {
            var patches = dmp.patch_make(oldText, newText);
            var patch = dmp.patch_toText(patches);

            if (lessSpace)
            {
                // Putting body into buffer will expand Unicode characters into their true length
                if (patch && patch.length < new Buffer(newText, 'utf-8').length)
                {
                    //patch is less than newText
                    return patch;
                }
                else
                {
                    //patch is more than newText
                    return newText;
                }

            }
            else
            {
                return patch;
            }

        },
        applyPatch: function(originalText, patchText)
        {
            try {
                var fromText = dmp.patch_fromText(patchText);

                if (fromText.length > 0)
                {
                    return dmp.patch_apply(fromText, originalText)[0];
                }
                else
                {
                    return patchText; //replace
                }

            }
            catch (e) {
                return patchText; //replace
            }

        },
        splitRemoveEmpties: function(delimiter, str)
        {
            var tags = str.split(delimiter);
            tags = tags.filter(function(v) {
                return v !== '';
            });

            return tags;
        },
        array2BootboxSelectOptions: function(list)
        {
            var options = [];

            for (var item in list)
            {
                if (list.hasOwnProperty(item))
                {
                    options.push(
                    {
                        value: list[item],
                        text: list[item]
                    });

                }

            }

            return options;
        }

    };

}());
