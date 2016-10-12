(function()
{
    var Remarkable = require('remarkable'),
        sanitize = require('sanitize-html'),
        HtmlReady = require('../modules/steemit/HtmlReady.js'),
        SanitizeConfig = require('../modules/steemit/SanitizeConfig.js');

    var remarkable = new Remarkable({
        html: true, // remarkable renders first then sanitize runs...
        breaks: true,
        linkify: false, // linkify is done locally,
        typographer: false, // https://github.com/jonschlinkert/remarkable/issues/142#issuecomment-221546793
        quotes: '“”‘’'
    });

    function startsWithHtml(str)
    {
        if (str.substring(0, 1) == '<')
        {
            var tags = str.split(/></g);

            if (tags.length > 0) //at least 1 lines
            {
                var line1F5 = tags[0].substring(0, 4).toLowerCase();

                if (line1F5 == 'html' || line1F5 == '<htm')
                {
                    return true;
                }
                else if (tags.length > 1) //at least 2 lines
                {
                    var line2F5 = tags[1].substring(0, 4).toLowerCase();
                    return (line2F5 == 'html' || line1F5 == '<htm');
                }
                else
                {
                    return false;
                }

            }
            else
            {
                return false;
            }

        }
        else
        {
            return false;
        }

    }

    function getContext(text)
    {
        // Strip out HTML comments. "JS-DOS" bug.
        text = text.replace(/<!--([\s\S]+?)(-->|$)/g, '(html comment removed: $1)');

        //get rid of span tags
        text = text.replace(/<\/?span[^>]*>/g, ''); //thanks http://stackoverflow.com/a/18464575/458642

        return (module.exports.isHtml(text)) ? text : remarkable.render(text);
    }

    module.exports = {
        isHtml: function(str)
        {
            str = str.replace(/\s+/, '');
            return (startsWithHtml(str)) ? (str.substr(-7).toLowerCase() == '</html>') : false;
        },
        metadata: function(text)
        {
            text = getContext(text);

            var rtags = HtmlReady.default(text, {
                mutate: false
            });

            rtags.sanitizeErrorsWarning = '';
            rtags.tagsWarning = '';

            var allowedTags = SanitizeConfig.allowedTags;

            allowedTags.forEach(function(tag)
            {
                rtags.htmltags.delete(tag);
            });

            rtags.htmltags.delete('html');

            if (rtags.htmltags.size)
            {
                rtags.tagsWarning = 'Please remove the following tags from your post: ' + Array.from(rtags.htmltags).join(', ');
            }

            //handle sanitizeWarning
            var sanitizeErrors = [];
            sanitize(text, SanitizeConfig.default({
                sanitizeErrors: sanitizeErrors
            }));

            if (sanitizeErrors.length) rtags.sanitizeErrorsWarning = sanitizeErrors.join('.  ');

            //Convert the Set to regular arrays
            rtags.hashtags = Array.from(rtags.hashtags);
            rtags.usertags = Array.from(rtags.usertags);
            rtags.htmltags = Array.from(rtags.htmltags);
            rtags.images = Array.from(rtags.images);
            rtags.links = Array.from(rtags.links);

            return rtags;
        },
        preview: function(text)
        {
            text = getContext(text);
            text = HtmlReady.default(text).html;

            var cleanText = sanitize(text, SanitizeConfig.default({
                large: true,
                highQualityPost: true,
                noImage: false
            }));

            if (/<\s*script/ig.test(cleanText)) {
                // Not meant to be complete checking, just a secondary trap and red flag (code can change)
                console.error('Refusing to render script tag in post text', cleanText);
                return '<div></div>';
            }

            return cleanText;

        },
        youtubePreview: function(html)
        {
            var youTubePlaces = html.split('~~~ youtube:');

            for (var section in youTubePlaces)
            {
                if (youTubePlaces.hasOwnProperty(section))
                {
                    var youtubeID = youTubePlaces[section].split(' ')[0];

                    var replace = '<div class="youtube" data-youtubeID="' + youtubeID + '"><div class="play"></div><img src="http://img.youtube.com/vi/' + youtubeID + '/0.jpg" style="width: 640px; max-width: 640px; height: 480px; max-height: 480px;"></div>';

                    html = html.replace('~~~ youtube:' + youtubeID + ' ~~~', replace);
                }

            }

            return html;

        }

    };

}());
