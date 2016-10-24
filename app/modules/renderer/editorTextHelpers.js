(function()
{
    var textHelpers = require(global.mainPath + '/modules/textHelpers.js');

    var shell = require('electron').shell;

    module.exports = {
        getEditorID: function(reqViewID)
        {
            return reqViewID + 'Editor';
        },
        insertEditor: function(reqViewID, type, onChange, onInit)
        {
            var editorHolder = $('#' + reqViewID + ' .editorHolder');
            var editorID = module.exports.getEditorID(reqViewID);

            console.log('editorID: ', editorID);

            //destory old Simplemde
            if (global.viewData.editorViewMeta.SimpleMDE)
            {
                global.viewData.editorViewMeta.SimpleMDE.toTextArea();
                global.viewData.editorViewMeta.SimpleMDE = null;
            }

            //destory old TinyMCE
            if (tinymce.get(editorID) !== null)
            {
                tinymce.get(editorID).remove();
            }

            //add new text area
            editorHolder.html('<div class="editorHeight editor-type-' + type + '"><textarea name="' + editorID + '", id="' + editorID + '" data-type="' + type + '"></textarea></div>');

            if (type == 'html')
            {
                tinymce.init({
                    selector: '#' + editorID,
                    browser_spellcheck: true,
                    menubar: false,
                    formats: {
                        underline: {}
                    },
                    style_formats: [
                        {
                            title: "Header 1",
                            format: "h1"
                        },
                        {
                            title: "Header 2",
                            format: "h2"
                        },
                        {
                            title: "Header 3",
                            format: "h3"
                        },
                        {
                            title: "Header 4",
                            format: "h4"
                        },
                        {
                            title: "Header 5",
                            format: "h5"
                        },
                        {
                            title: "Header 6",
                            format: "h6"
                        }
                    ],
                    toolbar: 'styleselect | bold italic strikethrough | alignleft aligncenter alignright | blockquote bullist numlist | link unlink | image | hr | table | code fullscreen',
                    plugins: ["autolink link image lists spellchecker code fullscreen table paste hr"],
                    statusbar: false,
                    init_instance_callback: function(editor)
                    {
                        //editor loaded
                        $('.mce-first .mce-txt').text('H');

                        if (onInit) onInit();
                    },
                    setup: function(ed) {
                        ed.on('keydown', function(event) {
                            if (event.keyCode == 9) { // tab pressed
                                if (event.shiftKey) {
                                    ed.execCommand('Outdent');
                                }
                                else {
                                    ed.execCommand('Indent');
                                }

                                event.preventDefault();
                                return false;
                            }
                        });

                        ed.on('keyup', function(e)
                        {
                            if (onChange) onChange();
                        });

                        ed.on('change', function(e)
                        {
                            if (onChange) onChange();
                        });
                    }

                });

            }
            else if (type == 'md')
            {

                global.viewData.editorViewMeta.SimpleMDE = new SimpleMDE({
                    element: document.getElementById(editorID),
                    hideIcons: ['preview'],
                    toolbar: ['heading', "|", 'bold', 'italic', 'strikethrough', 'code', "|", 'quote', 'unordered-list', 'ordered-list', '|', 'link', '|', 'image', '|', 'horizontal-rule', '|', 'table', '|', 'side-by-side', 'fullscreen', '|', {
                        name: 'guide',
                        action: function customFunction(editor)
                        {
                            shell.openExternal('https://simplemde.com/markdown-guide');
                        },
                        className: 'fa fa-question-circle',
                        title: 'Markdown Guide'
                    }],
                    shortcuts: {
                        togglePreview: null
                    },
                    status: false,
                    previewRender: function(plainText) {
                        return '<div class="previewRender markdownPreviewRender allow-copy">' + textHelpers.youtubePreview(textHelpers.preview(plainText)) + '</div>';
                    }
                });

                if (onInit) onInit();

                global.viewData.editorViewMeta.SimpleMDE.codemirror.on('change', function()
                {
                    if (onChange) onChange();
                });


                $('.editor-type-md .editor-toolbar a').tooltip({
                    animation: false,
                    placement: 'bottom'
                });

                $('.editor-type-md .editor-toolbar a').click(function()
                {
                    $('.editor-type-md .editor-toolbar a').tooltip('hide');
                });

            }

        },
        getContent: function(editorID)
        {
            //return string if found, else null
            if ($('#' + editorID).length > 0)
            {
                var type = $('#' + editorID).attr('data-type');

                if (type == 'md')
                {
                    if (global.viewData.editorViewMeta.SimpleMDE)
                    {
                        return global.viewData.editorViewMeta.SimpleMDE.value();
                    }
                    else
                    {
                        return null;
                    }

                }
                else if (type == 'html')
                {
                    if (tinymce.get(editorID) === null)
                    {
                        return null;
                    }
                    else
                    {
                        return '<html>\n' + tinymce.get(editorID).getContent() + '\n</html>';
                    }
                }
                else
                {
                    return null;
                }

            }
            else
            {
                return null;
            }

        },
        setContent: function(editorID, text)
        {
            //true if set, false if not
            if ($('#' + editorID).length > 0)
            {
                var type = $('#' + editorID).attr('data-type');

                if (type == 'md')
                {
                    if (global.viewData.editorViewMeta.SimpleMDE)
                    {
                        global.viewData.editorViewMeta.SimpleMDE.value(text);
                        return true;
                    }
                    else
                    {
                        return false;
                    }
                }
                else if (type == 'html')
                {
                    if (tinymce.get(editorID) === null)
                    {
                        return false;
                    }
                    else
                    {
                        text = text.trim();

                        //remove from start of string
                        if (text.substring(0, 6) == '<html>')
                        {
                            text = text.substring(6);
                        }

                        //remove from end of string
                        if (text.substring(text.length - 7) == '</html>')
                        {
                            text = text.substring(0, text.length - 7);
                        }

                        //trim again
                        text = text.trim();
                        tinymce.get(editorID).setContent(text);

                        return true;
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

        },
        refresh: function(editorID)
        {

            if ($('#' + editorID).length > 0)
            {
                var type = $('#' + editorID).attr('data-type');

                if (type == 'md')
                {
                    if (global.viewData.editorViewMeta.SimpleMDE)
                    {
                        global.viewData.editorViewMeta.SimpleMDE.codemirror.refresh();
                    }

                }

            }

        }

    };

})();
