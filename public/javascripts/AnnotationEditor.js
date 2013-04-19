/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/17/13
 * Time: 12:45 PM
 * To change this template use File | Settings | File Templates.
 */
var AnnotationEditor = (function() {

    var canvas;
    var contentType;
    var docUrl;
    var annotations = [];

    // For text transcripts
    var contentTranscripts;
    var annotationManifest;

    // For text documents
    var contentObj;

    var start = [0, 0];
    var activeAnnotation;

    var $activeAnnotation;
    var $annotationType;
    var $annotationValue;
    var $regex;

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

    function generateDoc() {
        var meta = {
            scheme: {
                name: "simple",
                version: 1.2
            },
            target: contentType
        };
        if (contentType === "image") {
            return {
                meta: meta,
                annotations: annotations.map(function(box) {
                    var pos = box.position;
                    return {
                        location: [
                            [pos.x1, pos.y1],
                            [pos.x2, pos.y2]
                        ],
                        data: {
                            type: box.annotationType,
                            value: box.annotationValue
                        }
                    };
                })
            };
        }
        if (contentType === "text") {
            return {
                meta: meta,
                annotations: annotations.map(function(annotation) {
                    return {
                        regex: annotation.regex.source,
                        data: annotation.data
                    };
                })
            };
        }
        return null;
    }

    $(function() {
        $activeAnnotation = $("#activeAnnotation").hide();
        $annotationType = $("#annotationType");
        $annotationValue = $("#annotationValue");
        $regex = $("#regex");

        $("#deleteAnnotation").click(function(event) {
            event.stopPropagation();

            if (activeAnnotation) {
                if (contentType === "image") {
                    activeAnnotation.$element.remove();
                    setActiveBoxAnnotation(null);
                    annotations.splice(annotations.indexOf(activeAnnotation), 1);
                }
                if (contentType === "text") {
                    setActiveTextAnnotation(null);
                    annotations.splice(annotations.indexOf(activeAnnotation), 1);
                    renderText();
                }
            }

            return false;
        });

        $("#updateAnnotation").click(function(event) {
            event.stopPropagation();

            if (contentType === "image") {
                imageUpdateClick();
            }
            if (contentType === "text") {
                updateTextAnnotation();
            }

            return false;
        });

        $("#saveAnnotationsForm").submit(function() {
            var doc = JSON.stringify(generateDoc());
            $("#saveAnnotations").val(doc);
        });

        $("#updateAnnotationsForm").submit(function() {
            var doc = JSON.stringify(generateDoc());
            var filename = docUrl.substr(docUrl.lastIndexOf("/") + 1);
            $("#updateAnnotations").val(doc);
            $("#filename").val(filename);
        });
    });

    function renderText() {
        if (contentObj) {
            renderDoc();
        } else {
            renderTranscript();
        }
    }

    /*
     * ===================
     *   Text Annotating
     * ===================
     */

    function renderDoc() {
        ContentRenderer.render({
            content: contentObj,
            holder: $("#transcriptHolder")[0],
            annotate: false,
            callback: function(data) {

                // Annotate the document
                SimpleAnnotator.annotate(annotationManifest, data.$textHolder[0], AnnotationRenderers.video);

                // Setup the select functionality
                data.$textHolder.mouseup(function () {
                    // Get the text selection
                    var text = window.getSelection().toString().trim();

                    // Create an annotation if not empty
                    if (text !== '') {
                        var regex = new RegExp(text);
                        var data = {
                            type: "text",
                            value: ""
                        };
                        var annotation = new SimpleAnnotator.TextAnnotation(regex, data);
                        annotations.push(annotation);
                        setActiveTextAnnotation(annotation);
                        renderDoc();
                    }
                });
            }
        });
    }

    /*
     * =====================
     *    Video Annotating
     * =====================
     */

    function renderTranscript() {
        TranscriptRenderer.add(contentTranscripts, $("#transcriptHolder"), null, function ($cue) {
            SimpleAnnotator.annotate(annotationManifest, $cue[0], AnnotationRenderers.video);

            // Setup the select functionality
            $cue.mouseup(function () {
                // Get the text selection
                var text = window.getSelection().toString().trim();

                // Create an annotation if not empty
                if (text !== '') {
                    var regex = new RegExp(text);
                    var data = {
                        type: "text",
                        value: ""
                    };
                    var annotation = new SimpleAnnotator.TextAnnotation(regex, data);
                    annotations.push(annotation);
                    setActiveTextAnnotation(annotation);
                    renderTranscript();
                }
            });
        });
    }

    function findAnnotation($annotation, data) {
        if ($annotation === null)
            return null;

        var text = $annotation.text();
        for(var i=0; i<annotations.length; i++) {
            var annotation = annotations[i];
            var regex = new RegExp(annotation.regex);
            if (regex.test(text) && data.type === annotation.data.type && data.value === annotation.data.value) {
                return annotation;
            }
        }
        return null;
    }

    function setActiveTextAnnotation(annotation, data) {

        // Find the right annotation
        if (!annotation || annotation[0] !== undefined) {
            activeAnnotation = findAnnotation(annotation, data);
        } else {
            activeAnnotation = annotation;
        }

        if (activeAnnotation === null) {
            $activeAnnotation.hide();
        } else {
            $activeAnnotation.show();
            $annotationType.val(activeAnnotation.data.type);
            $annotationValue.val(activeAnnotation.data.value);
            $regex.val(activeAnnotation.regex.source);
        }
    }

    function updateTextAnnotation() {
        activeAnnotation.regex = new RegExp($regex.val());
        activeAnnotation.data = {
            type: $annotationType.val(),
            value: $annotationValue.val()
        };

        // Rerender the annotations
        renderText();
        AnnotationRenderers.videoRenderAnnotation(activeAnnotation.data);
    }

    /*
     * =====================
     *    Image Annotating
     * =====================
     */

    function imageUpdateClick() {
        activeAnnotation.annotationValue = $annotationValue.val();
        activeAnnotation.annotationType = $annotationType.val();

        AnnotationRenderers.image(activeAnnotation.$element, {
            type: activeAnnotation.annotationType,
            value: activeAnnotation.annotationValue
        });
    }

    function setActiveBoxAnnotation(box) {

        // Deselect the currently active box
        if (activeAnnotation) {
            activeAnnotation.$element.removeClass("activeAnnotation");
        }

        activeAnnotation = box;
        if (box === null) {
            $activeAnnotation.hide();
        } else {
            box.$element.addClass("activeAnnotation");
            $activeAnnotation.show();
            $annotationType.val(box.annotationType);
            $annotationValue.val(box.annotationValue);
        }
    }

    function setupBox(box) {
        box.resizable = true;
        box.selectable = true;
        box.addEventListener("select", function (event) {
            setActiveBoxAnnotation(event.box);
        });
    }

    function drawStart(event) {

        // Create a new box at the start position
        start = [event.drawX, event.drawY];
        var box = canvas.drawBox(event.drawX, event.drawY, event.drawX, event.drawX, ["annotationBox activeAnnotation"]);
        box.annotationType = "text";
        box.annotationValue = "";

        // Select the new box
        setActiveBoxAnnotation(box);
    }

    function drawUpdate(event) {
        // Update the size of the box
        activeAnnotation.position = {
            x1: Math.max(Math.min(event.drawX, start[0]), 0),
            y1: Math.max(Math.min(event.drawY, start[1]), 0),
            x2: Math.min(Math.max(event.drawX, start[0]), 1),
            y2: Math.min(Math.max(event.drawY, start[1]), 1)
        };
    }

    function drawEnd(event) {
        // If the box is too small then don't count it
        var size = Math.sqrt(Math.pow(event.drawX - start[0], 2) + Math.pow(event.drawY - start[1], 2));
        if (size < 0.05) {
            activeAnnotation.$element.remove();
            setActiveBoxAnnotation(null);
            return;
        }

        // Update the size of the box
        activeAnnotation.position = {
            x1: Math.max(Math.min(event.drawX, start[0]), 0),
            y1: Math.max(Math.min(event.drawY, start[1]), 0),
            x2: Math.min(Math.max(event.drawX, start[0]), 1),
            y2: Math.min(Math.max(event.drawY, start[1]), 1)
        };

        setupBox(activeAnnotation);
        annotations.push(activeAnnotation);
    }

    /*
     * =======================================
     *   Return the annotation editor object
     * =======================================
     */

    function loadAnnotationDoc(resourceLibraryUrl, callback) {
        var docId = getParameterByName("doc");
        if (docId.length > 0) {

            // Load the annotation document
            var url = resourceLibraryUrl + "/" + docId;
            ResourceLibrary.load(url, function (resource) {
                docUrl = resource.content.files[0].downloadUri;
                SimpleAnnotator.load(docUrl, function(manifest) {
                    callback(manifest);
                });
            });
            $("#saveAnnotationsForm").hide();
        } else {
            $("#updateAnnotationsForm").hide();
            callback(null);
        }
    }

    return {
        bindImage: function(content, data, resourceLibraryUrl) {
            contentType = "image";
            canvas = new BoxDrawingCanvas(data.image, data.$imgHolder);
            canvas.drawable = true;
            canvas.addEventListener("drawstart", drawStart);
            canvas.addEventListener("drawupdate", drawUpdate);
            canvas.addEventListener("drawend", drawEnd);

            // Check if we are loading an annotation doc
            loadAnnotationDoc(resourceLibraryUrl, function (manifest) {
                if (manifest) {
                    manifest.annotations.forEach(function(annotation) {
                        var box = canvas.drawBox(annotation.location[0][0], annotation.location[0][1], annotation.location[1][0], annotation.location[1][1], ["annotationBox"]);
                        box.annotationType = annotation.data.type;
                        box.annotationValue = annotation.data.value;
                        setupBox(box);

                        AnnotationRenderers.image(box.$element, annotation.data);

                        annotations.push(box);
                    });
                }
            });
        },

        bindMedia: function(content, resourceLibraryUrl) {
            contentType = "text";

            // Load all the transcripts
            var url = resourceLibraryUrl + "/" + content.resourceId;
            ResourceLibrary.load(url, function (resource) {
                resource.getTranscripts(function (transcripts) {

                    // Check if we are loading an annotation doc
                    loadAnnotationDoc(resourceLibraryUrl, function (manifest) {
                        if (manifest) {
                            annotations = manifest.annotations;
                            manifest = [manifest];
                        } else {
                            manifest = [
                                new SimpleAnnotator.AnnotationManifest("text", annotations)
                            ];
                        }

                        AnnotationRenderers.init($("#annotationHolder"), null, setActiveTextAnnotation);
                        contentTranscripts = transcripts;
                        annotationManifest = manifest;
                        renderTranscript();
                    });
                });
            });
        },

        bindText: function(content, resourceLibraryUrl) {
            contentType = "text";
            contentObj = content;
            contentHolder = $("#transcriptHolder")[0];

            AnnotationRenderers.init($("#annotationHolder"), null, setActiveTextAnnotation);

            // Check if we are loading an annotation doc
            loadAnnotationDoc(resourceLibraryUrl, function (manifest) {
                if (manifest) {
                    annotations = manifest.annotations;
                    manifest = [manifest];
                } else {
                    manifest = [
                        new SimpleAnnotator.AnnotationManifest("text", annotations)
                    ];
                }
                annotationManifest = manifest;

                renderDoc();
            });
        }
    };
}());