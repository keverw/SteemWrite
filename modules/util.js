(function ()
{
    var crypto = require('crypto'),
        fs = require('fs'),
        path = require('path'),
        jade = require('jade');

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
        }
    };

}());
