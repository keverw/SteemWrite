(function()
{
    var getSlug = require('speakingurl'),
        base58 = require('bs58'),
        secureRandom = require('secure-random');

    function cleanPermlink(permlink)
    {
        //Over STEEMIT_MAX_PERMLINK_LENGTH
        if (permlink.length > 255) permlink = permlink.substring(permlink.length - 255, permlink.length);

        // only letters numbers and dashes shall survive
        permlink = permlink.toLowerCase().replace(/[^a-z0-9-]+/g, '');
        return permlink;
    }

    function createPermlink(title, author, parent_author, parent_permlink, cb)
    {
        var permlink = '';

        if (title && title.trim() !== '')
        {
            var s = module.exports.slug(title.toLowerCase());

            if (s === '') s = base58.encode(secureRandom.randomBuffer(4));

            //ensure the permlink(slug) is unique
            var prefix = '';

            irpcRenderer.call('posts.bcGetContent', {
                author: author,
                permlink: s
            }, function(err, result)
            {
                if (err) return cb(err);

                if (result.body !== '') //post already for that slug
                {
                    // make sure slug is unique
                    prefix = base58.encode(secureRandom.randomBuffer(4)) + '-';
                }

                permlink = prefix + s;
                cb(null, cleanPermlink(permlink));
            });

        }
        else
        {
            // comments: re-parentauthor-parentpermlink-time
            var timeStr = new Date().toISOString().replace(/[^a-zA-Z0-9]+/g, '');
            parent_permlink = parent_permlink.replace(/(-\d{8}t\d{9}z)/g, '');
            permlink = 're-' + parent_author + '-' + parent_permlink + '-' + timeStr;

            cb(null, cleanPermlink(permlink));
        }

    }

    module.exports = {
        slug: function(text) {
            return getSlug(text, {
                truncate: 128
            });
        },
        createMainPermlink: function(title, author, cb)
        {
            createPermlink(title, author, '', '', cb);
        },
        createReplyPermlink: function(parent_author, parent_permlink, cb)
        {
            createPermlink('', '', parent_author, parent_permlink, cb);
        }
    };

})();
