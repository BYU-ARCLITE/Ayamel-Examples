/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/10/13
 * Time: 2:41 PM
 * To change this template use File | Settings | File Templates.
 */
AnnotationPopupEditor = (function() {

    var templateUrl = "/assets/templates/annotatorPopup.tmpl.html";

    var contentCache = {
        cache: {},
        load: function(id, callback) {
            if (contentCache.cache[id])
                callback(contentCache.cache[id]);
            else
                $.ajax("/content/" + id + "/json", {
                    dataType: "json",
                    success: function (data) {
                        contentCache.cache[id] = data;
                        callback(data);
                    }
                });
        }
    };

    function AnnotationPopupEditor(callback) {
        var _this = this;
        var annotation = null;
        var listeners = {};

        function emit(event, data) {
            if (listeners[event]) {
                data = data || {};
                listeners[event].forEach(function(callback) {
                    callback(data);
                });
            }
        }

        // Create from the template
        TemplateEngine.render(templateUrl, {}, function($element, attach) {
            $("body").append($element);
            $(attach.popup).hide();

            /*
             * Setup UI functionality
             */

            // Setup the WYSIWYG editor
            $(attach.editor).wysihtml5();

            // Cancel button closes the popup
            $(attach.cancel).click(function() {
                $(attach.popup).hide();
            });

            // Save button closes the popup and sends an "update" event
            $(attach.save).click(function() {
                $(attach.popup).hide();
                emit("update");
            });

            // Save button closes the popup and sends an "delete" event
            $(attach.delete).click(function() {
                $(attach.popup).hide();
                emit("delete");
            });

            // Image updates with URL
            $(attach.url).change(function() {
                $(attach.imageImg).css("background-image", "url(" + this.value + ")");
            });

            // Annotation type switching with content pane hiding/showing
            var contentPanes = {
                text: $(attach.text),
                image: $(attach.image),
                content: $(attach.content)
            };
            function showContentPane() {
                // Hide all the content editors then show the right one
                contentPanes.text.hide();
                contentPanes.image.hide();
                contentPanes.content.hide();
                contentPanes[$(attach.type).val()].show();
            }
            $(attach.type).change(showContentPane.bind(null));

            // Content selection
            var content = null;
            var thumbnailMap = {
                "video": function(c){return !!c.thumbnail ? c.thumbnail : "http://ayamel.byu.edu/assets/images/videos/placeholder.jpg";},
                "image": function(c){return c.thumbnail},
                "audio": function(c){return !!c.thumbnail ? c.thumbnail : "http://ayamel.byu.edu/assets/images/audio/placeholder.jpg";},
                "text": function(c){return !!c.thumbnail ? c.thumbnail : "http://ayamel.byu.edu/assets/images/text/placeholder.jpg";},
                "questions": function(c){return !!c.thumbnail ? c.thumbnail : "http://ayamel.byu.edu/assets/images/questions/placeholder.jpg";}
            };
            $(attach.button).click(function() {
                PopupBrowser.selectContent(function (_content) {
                    contentCache.cache[_content.id] = _content;
                    content = _content;
                    var thumbnail = thumbnailMap[content.contentType](content);
                    $(attach.contentImg).css("background-image", "url(" + thumbnail + ")");
                    $(attach.title).text(content.name);
                });
            });

            /*
             * Update functions
             */

            function updateAnnotation() {
                annotation.regex = new RegExp($(attach.word).val());
                annotation.data.type = $(attach.type).val();

                // Check the data type
                if (annotation.data.type === "text") {
                    // Update from the text editor
                    annotation.data.value = editor.getValue();
                } else if (annotation.data.type === "image") {
                    // Update from the URL text input
                    annotation.data.value = $(attach.url).val();
                } else if (annotation.data.type === "content") {
                    // Update from the selected content
                    annotation.data.value = !!content ? content.id : 0;
                }
            }

            function updateForm() {
                if (annotation instanceof TextAnnotation) {
                    // Load the annotation data into the form
                    $(attach.word).val(annotation.regex.source);
                    $(attach.type).val(annotation.data.type);
                    showContentPane();

                    // First clear all the content data
                    editor.setValue("");
                    $(attach.url).val(annotation.data.value);
                    $(attach.imageImg).css("background-image", "");
                    $(attach.contentImg).css("background-image", "");
                    content = null;

                    // Check the data type
                    if (annotation.data.type === "text") {
                        // Update the text editor
                        editor.setValue(annotation.data.value);

                    } else if (annotation.data.type === "image") {
                        // Update the URL text input
                        $(attach.url).val(annotation.data.value);
                        $(attach.imageImg).css("background-image", "url("+annotation.data.value+")");

                    } else if (annotation.data.type === "content") {
                        // Load the content
                        contentCache.load(annotation.data.value, function(_content) {
                            content = _content;
                            var thumbnail = thumbnailMap[content.contentType](content);
                            $(attach.contentImg).css("background-image", "url(" + thumbnail + ")");
                            $(attach.title).text(content.name);
                        });
                    } else {
                        throw new Error("Unrecognized annotation data.");
                    }
                } else {
                    throw new Error("Text annotations supported only.");
                }
            }

            Object.defineProperties(_this, {
                show: {
                    value: function ($target) {
                        var pos = $target.offset();
                        attach.popup.style.left = (pos.left + ($target.width() / 2) - 46) + "px";
                        attach.popup.style.top  = (pos.top + $target.height() + 20) + "px";
                        $(attach.popup).show();
                    }
                },
                annotation: {
                    get: function() {
                        updateAnnotation();
                        return annotation;
                    },
                    set: function(value) {
                        annotation = value;
                        updateForm();
                    }
                }
            });

            callback && callback(_this);
        });

        Object.defineProperty(this, "on", {
            value: function(event, callback) {
                if (listeners[event] instanceof Array) {
                    listeners[event].push(callback);
                } else {
                    listeners[event] = [callback];
                }
            }
        });
    }

    return AnnotationPopupEditor;
})();