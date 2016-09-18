(function()
{
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

    //todo: write a getLinks, getImages, getPreview

    module.exports = {
        isHtml: function(str)
        {
            str = str.replace(/\s+/, "");

            if (startsWithHtml(str))
            {
                return (str.substr(-7).toLowerCase() == '</html>');
            }
            else
            {
                return false;
            }

        },
        getLinks: function(html)
        {
            //convert markdown to html
            if (!module.exports.isHtml(html))
            {

            }

            //
        },
        getImages: function(htmlOrArray)
        {
            //
        },
        getPreview: function(str)
        {
            //
        }

    };

}());
