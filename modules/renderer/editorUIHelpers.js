(function()
{
    var path = require('path');

    var textHelpers = require(path.resolve('./modules/textHelpers.js')),
        htmlToText = require('html-to-text');

    function getPostAsStr(viewID)
    {
        var editorID = editorTextEditHelpers.getEditorID(viewID);
        var str = editorTextEditHelpers.getContent(editorID);

        if (!str) str = ''; //incase null
    }

    function getPostStrLen(str)
    {
        str = str.trim();
        return (textHelpers.isHtml(str)) ? htmlToText.fromString(str).trim().length : str.length;
    }

    module.exports = {
        resize: function()
        {
            var windowWidth = $(window).width(); //retrieve current window width
            var windowHeight = $(window).height(); //retrieve current window height

            var sidebarSize = 300;
            var paddingTopSize = 60;

            var titleBoxHeight = $('.editorLeft .form-group').outerHeight(true);

            $('#editorHolder .editorLeft').width((windowWidth - sidebarSize - 15) + 'px');
            $('#editorHolder .editorRight').width((sidebarSize - 15) + 'px');

            $('#editorHolder .editorRight').height((windowHeight - paddingTopSize) + 'px');

            var editorHolderHeight = windowHeight - (paddingTopSize + titleBoxHeight);

            editorHolderHeight = editorHolderHeight - 36; //toolbar size

            $('#editorHolder .editorHolder').height(editorHolderHeight + 'px');
        },
        checkPostTitleLength: function(viewID)
        {
            var errMsg = null;
            var len = $('#' + viewID + " [name='postTitle']").val().trim().length;

            if (len > 0)
            {
                if (len > 255)
                {
                    errMsg = 'Please shorten title';
                }

            }
            else
            {
                errMsg = 'Title is required';
            }

            if (errMsg)
            {
                if ($('#' + viewID + ' .titleError .postTitleLength').length === 0) $('#' + viewID + ' .titleError').append('<div class="alert alert-warning postTitleLength" role="alert">' + errMsg + '</div>');
            }
            else
            {
                $('#' + viewID + ' .titleError .postTitleLength').remove();
            }

            return errMsg;
        },
        getPostBodyLength: function(viewID)
        {
            var str = getPostAsStr(viewID);
            return getPostStrLen(str);
        },
        checkPostBodyLength: function(viewID)
        {
            var errMsg = null;
            var maxKb = 100;

            var len = module.exports.getPostBodyLength(viewID);

            if (len > 0)
            {
                if (len > maxKb * 1024)
                {
                    errMsg = 'Exceeds maximum length (' + maxKb + 'KB)';
                }

            }
            else
            {
                errMsg = 'Message is required';
            }

            //update tab view
            if (len > 0)
            {
                $('#navMiddleButtons .editorTabHasContent li').removeClass('active');
                $('#navMiddleButtons .editorTabHasContent .edittab').addClass('active');

                $('#navMiddleButtons .editorTabNoContent').hide();
                $('#navMiddleButtons .editorTabHasContent').show();
            }
            else
            {
                $('#navMiddleButtons .editorTabHasContent').hide();
                $('#navMiddleButtons .editorTabNoContent').show();
            }

            //update errors view
            if (errMsg)
            {
                if ($('#' + viewID + ' .bodyError .postBodyLength').length === 0) $('#' + viewID + ' .bodyError').append('<div class="alert alert-warning postBodyLength" role="alert">' + errMsg + '</div>');
            }
            else
            {
                $('#' + viewID + ' .bodyError .postBodyLength').remove();
            }

            return errMsg;
        }

    };

})();
