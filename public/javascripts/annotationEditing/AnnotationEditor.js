/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/19/13
 * Time: 4:39 PM
 * To change this template use File | Settings | File Templates.
 */
var AnnotationEditor = (function() {
    "use strict";

    /*
     * ==========================
     *   Active Annotation Form
     * ==========================
     */

    var AnnotationForm = (function() {
        var annotationFormTemplate =
            '<div class="well" id="activeAnnotation">' +
                '<h2>Active Annotation</h2>' +
                '<form>' +
                    '{{>optionalFields}}' +
                    '<div class="control-group">' +
                        '<label class="control-label" for="annotationType">Annotation Type</label>' +
                        '<div class="controls">' +
                            '<select id="annotationType">' +
                                '<option value="text">Text/HTML</option>' +
                                '<option value="image">Image</option>' +
                                '<option value="content">Content</option>' +
                            '</select>' +
                        '</div>' +
                    '</div>' +
                    '<div class="control-group">' +
                        '<label class="control-label" for="annotationValue">Value</label>' +
                        '<div class="controls">' +
                            '<input id="annotationValue" type="text" />' +
                        '</div>' +
                    '</div>' +
                    '<div class="control-group">' +
                        '<div class="controls">' +
                            '<button class="btn btn-blue" id="updateAnnotation"><i class="icon-refresh"></i> Update</button> ' +
                            '<button class="btn btn-magenta" id="deleteAnnotation"><i class="icon-trash"></i> Delete</button>' +
                        '</div>' +
                    '</div>' +
                '</form>' +
            '</div>';

        var locationFieldTemplate =
            '<input type="hidden" id="x1">' +
            '<input type="hidden" id="y1">' +
            '<input type="hidden" id="x2">' +
            '<input type="hidden" id="y2">';

        var regexFieldTemplate =
            '<div class="control-group">' +
                '<label class="control-label" for="regex">Regular Expression</label>' +
                '<div class="controls">' +
                    '<input type="text" id="regex" name="regex" placeholder="Regular Expression">' +
                '</div>' +
            '</div>';

        function generateElement(type) {
            var fields = "";
            if (type === "image") {
                fields = locationFieldTemplate;
            }
            if (type === "text") {
                fields = regexFieldTemplate;
            }
            return $(Mustache.to_html(annotationFormTemplate, {}, {optionalFields: fields}));
        }

        function AnnotationForm(type) {
            var _this = this;

            function getAnnotation() {
                var data = {
                    value: _this.$element.find("#annotationValue").val(),
                    type: _this.$element.find("#annotationType").val()
                };

                if (type === "text") {
                    var regex = _this.$element.find("#regex").val();
                    return new TextAnnotation(new RegExp(regex), data);
                }
                if (type === "image") {
                    var x1 = Number(_this.$element.find("#x1").val());
                    var y1 = Number(_this.$element.find("#y1").val());
                    var x2 = Number(_this.$element.find("#x2").val());
                    var y2 = Number(_this.$element.find("#y2").val());
                    return new ImageAnnotation([[x1, y1], [x2, y2]], data);
                }
                return null;
            }

            function setAnnotation(annotation) {
                _this.$element.find("#annotationValue").val(annotation.data.value);
                _this.$element.find("#annotationType").val(annotation.data.type);

                if (type === "text") {
                    _this.$element.find("#regex").val(annotation.regex.source);
                }
                if (type === "image") {
                    _this.$element.find("#x1").val(annotation.location[0][0]);
                    _this.$element.find("#y1").val(annotation.location[0][1]);
                    _this.$element.find("#x2").val(annotation.location[1][0]);
                    _this.$element.find("#y2").val(annotation.location[1][1]);
                }
            }

            this.$element = generateElement(type);

            // Set up the button functionality
            this.$element.find("#updateAnnotation").click(function(e) {
                e.stopPropagation();

                // Create and dispatch an event
                var newEvent = document.createEvent('HTMLEvents');
                newEvent.initEvent("annotationupdate", true, true);
                _this.$element[0].dispatchEvent(newEvent);

                return false;
            });
            this.$element.find("#deleteAnnotation").click(function(e) {
                e.stopPropagation();

                // Create and dispatch an event
                var newEvent = document.createEvent('HTMLEvents');
                newEvent.initEvent("annotationdelete", true, true);
                _this.$element[0].dispatchEvent(newEvent);

                return false;
            });

            Object.defineProperties(this, {
                annotation: {
                    get: function() {
                        return getAnnotation();
                    },
                    set: function(val) {
                        setAnnotation(val);
                    }
                },
                visible: {
                    set: function(val) {
                        if (val)
                            _this.$element.show();
                        else
                            _this.$element.hide();
                    }
                }
            });
        }

        AnnotationForm.prototype.addEventListener = function(event, callback) {
            this.$element[0].addEventListener(event, callback);
        };

        return AnnotationForm;
    }());

    /*
     * ========================
     *   Content Display Pane
     * ========================
     */

    function generateElement(args) {
        var $element;
        if (args.type === "text") {
            $element = $("<div></div>");
        }
        if (args.type === "image") {
            $element = $("<div></div>");
        }
        return $element;
    }

    var ContentDisplayPane = (function() {

        function ContentDisplayPane(args) {

            var _this = this;
            var activeAnnotation = null;
            var startCoords = [];
            var manifest = args.manifest;
            var transcriptPlayer;

            this.$element = generateElement(args);

            function findAnnotation(otherAnnotation) {
                var theAnnotation = null;
                manifest.annotations.forEach(function (annotation) {
                    if (annotation.isEqualTo(otherAnnotation)) {
                        theAnnotation = annotation;
                    }
                });
                return theAnnotation;
            }

            function findMatchingAnnotation(text, data) {
                var theAnnotation = null;
                manifest.annotations.forEach(function (annotation) {
                    if (annotation.regex.test(text) && annotation.data.type === data.type && annotation.data.value === data.value) {
                        theAnnotation = annotation;
                    }
                });
                return theAnnotation;
            }

            function setupImageAnnotations(args) {
                // Annotate the image, making the canvas drawable
                var tempBox;
                var canvas = ImageAnnotator.annotate({
                    drawable: true,
                    image: args.image,
                    layout: args.layout,
                    manifests: [manifest],
                    filter: function(box, data) {
                        var preResizeAnnotation = null;
                        box.resizable = true;
                        box.selectable = true;

                        // Set up the select event
                        box.addEventListener("select", function(event) {
                            // Transform the event so downstream it can be handled correctly
                            var boxPosition = box.position;
                            var location = [
                                [boxPosition.x1, boxPosition.y1],
                                [boxPosition.x2, boxPosition.y2]
                            ];
                            activeAnnotation = new ImageAnnotation(location, data);
                            event.annotation = activeAnnotation;
                        });
                        box.addEventListener("resizestart", function (event) {
                            var boxPosition = box.position;
                            var location = [
                                [boxPosition.x1, boxPosition.y1],
                                [boxPosition.x2, boxPosition.y2]
                            ];
                            preResizeAnnotation = new ImageAnnotation(location, data);
                        });
                        box.addEventListener("resizeend", function (event) {
                            var boxPosition = box.position;
                            var location = [
                                [boxPosition.x1, boxPosition.y1],
                                [boxPosition.x2, boxPosition.y2]
                            ];

                            var theAnnotation = findAnnotation(preResizeAnnotation);
                            theAnnotation.location = location;
                        });
                    }
                });

                // Set up canvas drawing
                canvas.addEventListener("drawstart", function (event) {
                    var x = event.drawX;
                    var y = event.drawY;
                    startCoords = [x, y];
                    tempBox = canvas.drawBox(x, y, x, y, ["annotationBox"]);
                });
                canvas.addEventListener("drawupdate", function (event) {
                    tempBox.position = {
                        x1: Math.max(Math.min(event.drawX, startCoords[0]), 0),
                        y1: Math.max(Math.min(event.drawY, startCoords[1]), 0),
                        x2: Math.min(Math.max(event.drawX, startCoords[0]), 1),
                        y2: Math.min(Math.max(event.drawY, startCoords[1]), 1)
                    };
                });
                canvas.addEventListener("drawend", function (event) {
                    // Check that we didn't click
                    var size = Math.sqrt(Math.pow(event.drawX - startCoords[0], 2) + Math.pow(event.drawY - startCoords[1], 2));
                    if (size < 0.05) {
                        activeAnnotation.$element.remove();
                        tempBox = null;
                        return;
                    }

                    // Create an annotation from the box
                    var boxPosition = tempBox.position;
                    var location = [
                        [boxPosition.x1, boxPosition.y1],
                        [boxPosition.x2, boxPosition.y2]
                    ];
                    activeAnnotation = new ImageAnnotation(location, {type: "text", value: ""});
                    manifest.annotations.push(activeAnnotation);

                    // Delete the drawing box
                    tempBox.$element.remove();
                    tempBox = null;
                    renderAnnotations();
                });
            }

            function setupTextAnnotations(textAnnotator, $element) {
                textAnnotator.annotate($element);

                $element.mouseup(function (event) {
                    // Get the text selection
                    var text = window.getSelection().toString().trim();

                    // Create an annotation if not empty
                    if (text !== '') {
                        var regex = new RegExp(text);
                        var annotation = new TextAnnotation(regex, {type: "text", value: ""});
                        manifest.annotations.push(annotation);

                        renderAnnotations();
                    }
                });
            }

            function renderAnnotations() {
                if (args.type === "text") {
                    // Set up the text annotator
                    var textAnnotator = new TextAnnotator({
                        manifests: [manifest],
                        filter: function ($annotation, annotation) {
                            // Show the annotations in a popover
                            var content = annotation.data.value;
                            if (annotation.data.type === "image") {
                                content = '<img src="' + annotation.data.value + '">';
                            }
                            $annotation.popover({
                                placement: "bottom",
                                html: true,
                                title: annotation.regex.toString(),
                                content: content,
                                container: "body",
                                trigger: "hover"
                            });
                        }
                    });

                    textAnnotator.addEventListener("textAnnotationClick", function (event) {
                        activeAnnotation = event.annotation;

                        // Create and dispatch an event
                        var newEvent = document.createEvent('HTMLEvents');
                        newEvent.initEvent("select", true, true);
                        newEvent.annotation = event.annotation;
                        _this.$element[0].dispatchEvent(newEvent);
                    });

                    // Render the text
                    if (args.content.contentType === "text") {
                        ContentRenderer.render({
                            content: args.content,
                            holder: _this.$element[0],
                            annotate: false,
                            callback: function(args) {
                                setupTextAnnotations(textAnnotator, args.layout.$textHolder);
                            }
                        });
                    } else {
//                        var display = new TranscriptDisplay({
//                            transcripts: args.transcripts,
//                            $holder: _this.$element,
//                            filter: function (cue, $cue) {
//                                setupTextAnnotations(textAnnotator, $cue);
//                            }
//                        });


                        async.map(args.transcripts, function(resource, callback) {
                            Ayamel.utils.loadCaptionTrack(resource, function(track) {
                                callback(null, track);
                            });
                        }, function(err, captionTracks) {

                            // Keep track on where we were
//                            var visible = $(".transcriptContent:visible")[0];
//                            if (visible) {
//                                var index = $(".transcriptContent").toArray().indexOf(visible);
//                                var scrollTop = visible.scrollTop;
//                            }

                            if (transcriptPlayer) {
                                transcriptPlayer.update();
                            } else {
                                transcriptPlayer = new TranscriptPlayer2({
                                    captionTracks: captionTracks,
                                    $holder: _this.$element,
                                    filter: function(cue, $cue) {
                                        setupTextAnnotations(textAnnotator, $cue);
                                    }
                                });
                            }

                            // Go back to where we were
//                            if (visible) {
//                                player.activeTranscript = index;
//                                $(".transcriptContent:visible")[0].scrollTop = scrollTop;
//                            }
                        });
                    }
                }
                if (args.type === "image") {
                    ContentRenderer.render({
                        content: args.content,
                        holder: _this.$element[0],
                        annotate: false,
                        callback: function(args) {
                            setupImageAnnotations(args);
                        }
                    });
                }
            }

            function updateActiveAnnotation(updatedAnnotation) {
                // Match the active annotation with one in the manifest
                var theAnnotation = findAnnotation(activeAnnotation);

                // Check if we are actually deleting the annotation
                if (updatedAnnotation === null) {

                    var index = manifest.annotations.indexOf(theAnnotation);
                    manifest.annotations.splice(index, 1);

                } else {

                    // Now update it!
                    theAnnotation.data = updatedAnnotation.data;
                    if (args.type === "image") {
                        theAnnotation.location = updatedAnnotation.location;
                    }
                    if (args.type === "text") {
                        theAnnotation.regex = updatedAnnotation.regex;
                    }
                    activeAnnotation = theAnnotation;
                }
            }

            renderAnnotations();

            Object.defineProperties(this, {
                activeAnnotation: {
                    set: function(val) {
                        // Update the annotation
                        updateActiveAnnotation(val);

                        // Redraw
                        renderAnnotations();
                    }
                }
            });
        }

        ContentDisplayPane.prototype.addEventListener = function(event, callback) {
            this.$element[0].addEventListener(event, callback);
        };

        return ContentDisplayPane;
    }());

    /*
     * =============================
     *   Annotation document saver
     * =============================
     */

    var AnnotationSaver = (function() {

        var template =
            '<form method="post" action="/content/{{id}}/annotations{{courseQuery}}">' +
                '<input type="hidden" name="resourceId" value="{{resourceId}}">' +
                '<div class="control-group">' +
                    '<label class="control-label" for="title">Title</label>' +
                    '<div class="controls">' +
                        '<input type="text" id="title" name="title" placeholder="Title" value="{{title}}">' +
                    '</div>' +
                '</div>' +
                '<div class="control-group">' +
                    '<label class="control-label" for="language">Language</label>' +
                    '<div class="controls">' +
                        '<select id="language" name="language"></select>' +
                    '</div>' +
                '</div>' +
                '<div class="control-group">' +
                    '<div class="controls">' +
                        '<input type="submit" id="saveAnnotations" href="#" class="btn btn-blue" value="Save Changes" />' +
                        '<a class="btn pad-left-med" href="/content/{{id}}">Cancel</a>' +
                    '</div>' +
                '</div>' +
            '</form>';

        function generateDoc(args) {
            var annotations = args.manifest.annotations;
            if (args.type === "text") {
                annotations = args.manifest.annotations.map(function (annotation) {
                    return {
                        regex: annotation.regex.source,
                        data: annotation.data
                    };
                });
            }
            return {
                meta: {
                    scheme: {
                        name: "simple",
                        version: 1.2
                    },
                    target: args.type
                },
                annotations: annotations
            };
        }

        function AnnotationSaver(args) {
            var _this = this;
            var html = Mustache.to_html(template, {
                title: args.resource ? args.resource.title : "",
                id: args.content.id,
                courseQuery: args.courseId ? "?course=" + args.courseId : "",
                resourceId: args.resource ? args.resource.id : ""
            });
            this.$element = $(html);

            // Include the languages
            var $select = this.$element.find("select");
            Object.keys(Ayamel.utils.p1map).forEach(function (p1) {
                var code = Ayamel.utils.p1map[p1];
                var name = Ayamel.utils.getLangName(code);
                $select.append("<option value='" + code + "'>" + name + "</option>");
            });
            if (args.resource) {
                $select.val(args.resource.languages[0]);
            }

            this.$element.find("#saveAnnotations").click(function (event) {
                var $form = _this.$element;

                if (args.filename.length > 0) {
                    $form.append('<input id="filename" type="hidden" name="filename"/>').children("#filename").val(args.filename);
                }

                // Serialize the annotations and save the data in the form
                var doc = JSON.stringify(generateDoc(args));
                $form.append('<input type="hidden" id="annotations" name="annotations"/>').children("#annotations").val(doc);
            });
        }

        return AnnotationSaver;

    }());

    /*
     * =====================
     *   Annotation Editor
     * =====================
     */

    return (function() {

        var template =
            '<div class="row-fluid">' +
                '<div class="span8"></div>' +
                '<div class="span4"></div>' +
            '</div>';

        function generateLayout() {
            var html = Mustache.to_html(template);
            var $element = $(html);
            return {
                $element: $element,
                $contentDisplayPane: $element.find(".span8"),
                $annotationForm: $element.find(".span4")
            };
        }

        function getParameterByName(name){
            name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
            var regexS = "[\\?&]" + name + "=([^&#]*)";
            var regex = new RegExp(regexS);
            var results = regex.exec(window.location.search);
            if(results == null)
                return "";
            else
                return decodeURIComponent(results[1].replace(/\+/g, " "));
        }

        function loadManifest(args, callback) {
            var docId = getParameterByName("doc");
            if (docId.length > 0) {

                // Load the annotation document
                ResourceLibrary.load(docId, function (resource) {
                    var docUrl = resource.content.files[0].downloadUri;
                    AnnotationLoader.load(docUrl, function(manifest) {
                        callback({
                            manifest: manifest,
                            resource: resource,
                            filename: docUrl.substr(docUrl.lastIndexOf("/") + 1)
                        });
                    });
                });
            } else {

                // No annotation document. Create a new manifest
                var manifest = new AnnotationManifest(args.type, []);
                manifest.language = "eng";
                callback({
                    manifest: manifest,
                    resource: null,
                    filename: ""
                });
            }
        }

        function loadTranscripts(args, callback) {
            if (args.content.contentType === "video" || args.content.contentType === "audio") {
                ResourceLibrary.load(args.content.resourceId, function (resource) {
                    ContentRenderer.getTranscripts({
                        userId: args.userId,
                        owner: args.owner,
                        teacher: args.teacher,
                        courseId: args.courseId,
                        content: args.content,
                        resource: resource
                    }, callback);
                });

            } else {
                callback([]);
            }
        }

        function AnnotationEditor(args) {
            var _this = this;

            // Load the manifest
            loadManifest(args, function (manifestData) {
                args.manifest = manifestData.manifest;
                args.resource = manifestData.resource;
                args.filename = manifestData.filename;

                loadTranscripts(args, function (transcripts) {
                    args.transcripts = transcripts;

                    args.type = args.content.contentType === "image" ? "image" : "text";
                    _this.annotationForm = new AnnotationForm(args.type);
                    _this.annotationForm.visible = false;
                    _this.contentDisplayPane = new ContentDisplayPane(args);
                    _this.annotationSaver = new AnnotationSaver(args);

                    // Set up the editor
                    var layout = generateLayout();
                    layout.$contentDisplayPane.append(_this.contentDisplayPane.$element);
                    layout.$annotationForm
                        .append(_this.annotationForm.$element)
                        .append(_this.annotationSaver.$element);
                    _this.$element = layout.$element;

                    args.$container.append(_this.$element);

                    // Set up interactions
                    _this.contentDisplayPane.addEventListener("select", function (event) {
                        _this.annotationForm.annotation = event.annotation;
                        _this.annotationForm.visible = true;
                    });
                    _this.annotationForm.addEventListener("annotationupdate", function (event) {
                        _this.contentDisplayPane.activeAnnotation = _this.annotationForm.annotation;
                    });
                    _this.annotationForm.addEventListener("annotationdelete", function (event) {
                        _this.contentDisplayPane.activeAnnotation = null;
                        _this.annotationForm.visible = false;
                    });
                });
            });
        }

        return AnnotationEditor;
    }());
}());