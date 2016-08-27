(function ()
{
    var crypto = require('crypto'),
        fs = require('fs'),
        path = require('path'),
        jade = require('jade'),
        url = require('url'),
        _ = require('underscore');

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
            var tplPath = path.join(__dirname, '../views', name + '.jade');
            var fn = jade.compile(fs.readFileSync(tplPath, 'utf-8'));
            return fn(locals);
        },
        toObject: function(error)
        {
            var alt = {};

            Object.getOwnPropertyNames(error).forEach(function (key) {
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
            var protocols = ['ws+unix:', 'ws:', 'wss:', 'http', 'https'];

            ////////////////////////////
            var serverUrl = url.parse(address);
            return (_.contains(protocols, serverUrl.protocol) && serverUrl.host) ? true : false;
        }

    };

}());
