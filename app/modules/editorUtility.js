(function()
{
    var textHelpers = require(global.mainPath + '/modules/textHelpers.js'),
        htmlToText = require('html-to-text'),
        getSlug = require('speakingurl'),
        sha1 = require('sha1');

    module.exports = {
        slug: function(text) {
            return getSlug(text, {
                truncate: 128
            });
        },
        hashContent: function(title, body, tags, additionalJSON)
        {
            var blankHtml = '<html>\n\n</html>';

            if (body == blankHtml) body = '';

            if (typeof tags == 'object') tags = tags.join(' ');
            if (typeof additionalJSON == 'object') additionalJSON = JSON.stringify(additionalJSON);
            additionalJSON = additionalJSON.trim();

            if (additionalJSON.length === 0) additionalJSON = '{}';

            body = textHelpers.preview(body);

            return sha1([title, body, tags, additionalJSON].join('$'));
        },
        getPostStrLen: function(str)
        {
            str = str.trim();
            return (textHelpers.isHtml(str)) ? htmlToText.fromString(str).trim().length : str.length;
        },
        validate: {
            savePostCheck: function(editorData, tags)
            {
                //check title
                var titleCheck = module.exports.validate.postTitleLength(editorData.title);
                if (titleCheck) return titleCheck;

                //no title return, check body
                var bodyCheck = module.exports.validate.postBody(editorData.body);
                if (bodyCheck) return bodyCheck;

                //no body return, check tags
                return (tags.length === 0) ? 'At least one tag is required.' : null;
            },
            postTitleLength: function(text)
            {
                var errMsg = null;
                var len = text.length;

                if (len === 0)
                {
                    errMsg = 'Title is required';
                }
                else if (len > 255)
                {
                    errMsg = 'Please shorten title';
                }

                return errMsg;
            },
            postBody: function(text, len)
            {
                if (typeof len != 'number') len = module.exports.getPostStrLen(text);

                var errMsg = null;
                var maxKb = 100;

                if (len > 0)
                {
                    if (len > maxKb * 1024)
                    {
                        errMsg = 'Exceeds maximum length (' + maxKb + 'KB)';
                    }
                    else
                    {
                        var metadata = textHelpers.metadata(text);

                        var errorStrings = [];

                        if (metadata.tagsWarning.length > 0) errorStrings.push('<p>' + metadata.tagsWarning + '</p>');
                        if (metadata.sanitizeErrorsWarning.length > 0) errorStrings.push('<p>' + metadata.sanitizeErrorsWarning + '</p>');

                        //set errMsg if errorStrings not empty
                        if (errorStrings.length > 0) errMsg = errorStrings.join('<br>');
                    }

                }
                else
                {
                    errMsg = 'Message is required';
                }

                return errMsg;
            },
            additionalJSONParse: function(text)
            {
                var result = {
                    errMsg: null,
                    decoded: {}
                };

                if (text.length > 0)
                {
                    try {
                        var jsonData = JSON.parse(text);

                        if (typeof jsonData == 'object')
                        {
                            var errorStrings = [];

                            if (jsonData.hasOwnProperty('tags')) errorStrings.push('<p><code>tags</code> key is automatically added and is not allowed</p>');
                            if (jsonData.hasOwnProperty('users')) errorStrings.push('<p><code>users</code> key is automatically added and is not allowed</p>');
                            if (jsonData.hasOwnProperty('image')) errorStrings.push('<p><code>image</code> key is automatically added and is not allowed</p>');
                            if (jsonData.hasOwnProperty('links')) errorStrings.push('<p><code>links</code> key is automatically added and is not allowed</p>');

                            if (errorStrings.length > 0)
                            {
                                result.errMsg = errorStrings.join('<br>');
                            }
                            else
                            {
                                result.decoded = jsonData;
                            }

                        }
                        else
                        {
                            result.errMsg = 'Invaild JSON Data';
                        }

                    } catch (err)
                    {
                        result.errMsg = 'Invaild JSON Data';
                    }
                }

                return result;
            }

        }

    };

})();
