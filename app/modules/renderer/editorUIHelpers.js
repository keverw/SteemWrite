(function()
{
    var textHelpers = require(global.mainPath + '/modules/textHelpers.js'),
        editorUtility = require(global.mainPath + '/modules/editorUtility.js');

    function getPostAsStr(viewID)
    {
        var str = editorTextHelpers.getContent(editorTextHelpers.getEditorID(viewID));
        return (str) ? str : ''; //if null will give a blank string
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
        editorReady: function(id, parameters, cb)
        {
            //set onPubAutoVote and onPubPayoutType based on parameters, then failback to parameters.postDefaultSettingsResult
            if (parameters.onPubAutoVote === null || parameters.onPubAutoVote === undefined) parameters.onPubAutoVote = parameters.postDefaultSettingsResult.lastSelectedAutovotePref;
            if (parameters.onPubPayoutType === null || parameters.onPubPayoutType === undefined) parameters.onPubPayoutType = parameters.postDefaultSettingsResult.lastSelectedPayoutPrecent;

            if (!parameters.tags) parameters.tags = '';

            if (!parameters.additionalJSON) parameters.additionalJSON = {};

            $('#' + id + " [name='postTitle']").val(parameters.title);
            $('#' + id + " [name='postJSONTextarea']").val(JSON.stringify(parameters.additionalJSON));

            if (parameters.postStatus) $('#' + id + " [name='_postStatus']").val(parameters.postStatus);

            var warningMsgObj = {};

            if (parameters.warningMsg && typeof parameters.warningMsg == 'string' && parameters.warningMsg.length > 0)
            {
                try {
                    warningMsgObj = JSON.parse(parameters.warningMsg);
                } catch (err)
                {
                    console.log(err);
                }

            }

            if (!parameters.body) parameters.body = '';

            var editorType = parameters.postDefaultSettingsResult.lastSelectedEditor;

            if (parameters.body.length > 0) editorType = textHelpers.isHtml(parameters.body) ? 'html' : 'md';

            editorTextHelpers.insertEditor(id, editorType, function change()
            {
                module.exports.checkPostBodyLength(id);
            }, function init()
            {
                editorTextHelpers.setContent(editorTextHelpers.getEditorID(id), parameters.body);

                module.exports.checkAdditionalJSON(id);
                module.exports.checkPostTitleLength(id);

                tagEditor.init(id, parameters.tags);

                $('#' + id + " [name='_author']").val(parameters.author);
                $('#' + id + " [name='_permalink']").val(parameters.permlink);
                $('#' + id + " [name='_autosaveHash']").val(editorUtility.hashContent(parameters.title, parameters.body, parameters.tags, parameters.additionalJSON));

                //transition to displaying view
                parameters.warningMsgObj = warningMsgObj;
                module.exports.initPublishPanel(id, parameters);
                cb();
            });

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
                if (typeof result.additionalJSON == 'string')
                {
                    result.additionalJSON = result.additionalJSON.trim();
                    foundCount++;
                }

                result.author = $('#' + id + " [name='_author']").val();
                if (typeof result.author == 'string') foundCount++;

                result.body = editorTextHelpers.getContent(editorTextHelpers.getEditorID(id));
                if (typeof result.body == 'string') foundCount++;

                result.permlink = $('#' + id + " [name='_permalink']").val();
                if (typeof result.permlink == 'string') foundCount++;

                result.postStatus = $('#' + id + " [name='_postStatus']").val();
                if (typeof result.postStatus == 'string') foundCount++;

                result.tags = $('#' + id + " [name='postTags']").val();
                if (typeof result.tags == 'string') foundCount++;

                result.title = $('#' + id + " [name='postTitle']").val();
                if (typeof result.title == 'string')
                {
                    result.title = result.title.trim();
                    foundCount++;
                }

                result.onPubPayoutType = $('#' + id + " [name='onPubPayoutTypeSelect']").val();
                if (typeof result.onPubPayoutType == 'string')
                {
                    result.onPubPayoutType = parseInt(result.onPubPayoutType);
                    foundCount++;
                }

                result.onPubAutoVote = $('#' + id + " [name='onPubAutoVoteCheckbox']").is(':checked');
                if (typeof result.onPubAutoVote == 'boolean') foundCount++;

                var _isNew = $('#' + id + " [name='_isNew']").val();

                if (typeof _isNew == 'string')
                {
                    result.isNew = (_isNew == '1');
                    foundCount++;
                }

                result.c_AutosaveHash = $('#' + id + " [name='_autosaveHash']").val();
                if (typeof result.c_AutosaveHash == 'string') foundCount++;

                if (foundCount == 11)
                {
                    result.found = true;
                    result.n_AutosaveHash = editorUtility.hashContent(result.title, result.body, result.tags, result.additionalJSON);
                }
            }

            return result;
        },
        checkPostTitleLength: function(viewID)
        {
            var text = $('#' + viewID + " [name='postTitle']").val().trim();

            var errMsg = editorUtility.validate.postTitleLength(text);

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
            return editorUtility.getPostStrLen(getPostAsStr(viewID));
        },
        checkPostBodyLength: function(viewID)
        {
            var text = getPostAsStr(viewID);
            var len = editorUtility.getPostStrLen(text);

            var errMsg = editorUtility.validate.postBody(text, len);

            //update tab view
            if (len > 0)
            {
                $('#navMiddleButtons .editorTabHasContent li').removeClass('active');
                $('#navMiddleButtons .editorTabHasContent .edittab').addClass('active');

                $('#navMiddleButtons .editorTabNoContent').hide();
                $('#navMiddleButtons .editorTabHasContent').show();

                $('#' + viewID + ' .previewPostBtn').show();
            }
            else
            {
                $('#navMiddleButtons .editorTabHasContent').hide();
                $('#navMiddleButtons .editorTabNoContent').show();

                $('#' + viewID + ' .previewPostBtn').hide();
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
        },
        checkAdditionalJSON: function(viewID)
        {
            var text = $('#' + viewID + " [name='postJSONTextarea']").val().trim();

            var errMsg = editorUtility.validate.additionalJSONParse(text).errMsg;

            //update errors view
            if (errMsg)
            {
                if ($('#' + viewID + ' .bodyError .jsonError').length === 0) $('#' + viewID + ' .bodyError').append('<div class="alert alert-warning jsonError" role="alert">' + errMsg + '</div>');
            }
            else
            {
                $('#' + viewID + ' .bodyError .jsonError').remove();
            }

            return errMsg;
        },
        initPublishPanel: function(id, parameters)
        {
            if ($('#' + id).length)
            {
                $('#' + id + " [name='_publishActionsMetadata']").val(JSON.stringify({
                    postStatus: parameters.postStatus,
                    autosaveRevison: parameters.autosaveRevison,
                    date: parameters.date,
                    scheduledDate: parameters.scheduledDate,
                    warningMsgObj: parameters.warningMsgObj,
                    onPubAutoVote: parameters.onPubAutoVote,
                    onPubPayoutType: parameters.onPubPayoutType
                }));

                module.exports.updatePublishPanel(id);
            }

        },
        updatePublishPanel: function(id, parameters)
        {
            parameters = (parameters && typeof parameters == 'object') ? parameters : {};

            if ($('#' + id).length)
            {
                var author = $('#' + id + " [name='_author']").val();
                var permalink = $('#' + id + " [name='_permalink']").val();
                var len = module.exports.getPostBodyLength(id);

                var meta = JSON.parse($('#' + id + " [name='_publishActionsMetadata']").val());

                if (parameters.postStatus) meta.postStatus = parameters.postStatus;
                if (typeof parameters.autosaveRevison == 'string') meta.autosaveRevison = parameters.autosaveRevison;
                if (parameters.date) meta.date = parameters.date;
                if (parameters.scheduledDate) meta.postStatus = parameters.scheduledDate;
                if (parameters.warningMsgObj) meta.warningMsgObj = parameters.warningMsgObj;

                if (typeof parameters.onPubAutoVote == 'boolean') meta.onPubAutoVote = parameters.onPubAutoVote;
                if (typeof parameters.onPubPayoutType == 'number') meta.onPubPayoutType = parameters.onPubPayoutType;

                $('#' + id + " [name='_publishActionsMetadata']").val(JSON.stringify(meta));

                //add data that not saved to json
                meta.bodyLen = len;
                meta.author = author;
                meta.permalink = permalink;
                meta.id = id;

                //update ui
                $('#' + id + ' .publishActions').html(util.getViewHtml('editor/publishPanelActions', meta));
                $("[name='onPubAutoVoteCheckbox']").bootstrapSwitch();

            }

        }

    };

})();
