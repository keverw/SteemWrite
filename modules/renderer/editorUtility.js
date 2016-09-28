(function()
{
    var getSlug = require('speakingurl'),
        base58 = require('bs58'),
        secureRandom = require('secure-random'),
        sha1 = require('sha1');

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
        },
        hashContent: function(title, body, tags, additionalJSON)
        {
            if (typeof tags == 'object') tags = tags.join(' ');

            return sha1([title, body, tags, additionalJSON].join('$'));
        },
        getEditorData: function(id)
        {
            var result = {
                found: false
            };

            if ($('#' + id).length)
            {
                var foundCount = 0;

                result.additionalJSON = $('#' + id + " [name='postJSONTextarea']").val();
                if (typeof result.additionalJSON == 'string') foundCount++;

                result.author = $('#' + id + " [name='_author']").val();
                if (typeof result.author == 'string') foundCount++;

                result.body = editorTextEditHelpers.getContent(editorTextEditHelpers.getEditorID(id));
                if (typeof result.body == 'string') foundCount++;

                result.permlink = $('#' + id + " [name='_permalink']").val();
                if (typeof result.permlink == 'string') foundCount++;

                result.postStatus = $('#' + id + " [name='_postStatus']").val();
                if (typeof result.postStatus == 'string') foundCount++;

                result.tags = $('#' + id + " [name='postTags']").val();
                if (typeof result.tags == 'string') foundCount++;

                result.title = $('#' + id + " [name='postTitle']").val();
                if (typeof result.title == 'string') foundCount++;

                result.c_AutosaveHash = $('#' + id + " [name='_autosaveHash']").val();
                if (typeof result.c_AutosaveHash == 'string') foundCount++;

                if (foundCount == 8)
                {
                    result.found = true;
                    result.n_AutosaveHash = module.exports.hashContent(result.title, result.body, result.tags, result.additionalJSON)
                }
            }

            return result;
        }

    };

})();
