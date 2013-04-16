/**
 * The SimpleAnnotator is an object which annotate.
 * Uses JQuery for simple HTML manipulation.
 * It handles simple annotations (thus the name), but does not do:
 * <ul>
 *     <li>Overlapping annotations</li>
 *     <li>Annotating complex/nested DOM objects</li>
 * </ul>
 * @author Joshua Monson
 */
var SimpleAnnotator = (function () {
    "use strict";

    function TextAnnotation(regex, data) {
        this.regex = regex;
        this.data = data;
    }

    TextAnnotation.prototype.annotate = function ($content, renderer) {
        // Get the matches
        var text = $content.text();
        var match;
        var newText;

        // Add a tags around each match
        match = this.regex.exec(text);
        if (match !== null) {

            // Create the annotation and process it
            var $annotation = $("<span class='annotation'>" + match[0] + "</span>");
            $annotation = renderer($annotation, this.data);

            // Replace the html with the annotated html
            newText = text.split(this.regex);
            $content.html(newText[0]).append($annotation).append(newText[1]);
        }
    };

    function ImageAnnotation(location, data) {
        this.location = location;
        this.data = data;
    }

    ImageAnnotation.prototype.annotate = function($content, renderer) {
        var $annotation = $("<div></div>");
        $annotation = renderer($annotation, this.data);

        $annotation
            .css("left",   (this.location[0][0] * 100) + "%")
            .css("top",    (this.location[0][1] * 100) + "%")
            .css("right",  ((1 - this.location[1][0]) * 100) + "%")
            .css("bottom", ((1 - this.location[1][1]) * 100) + "%")
            .css("z-index", 50)
            .css("position", "absolute");

        $content.append($annotation);
    };

    function TimeAnnotation(start, end, data) {
        this.start = start;
        this.end = end;
        this.data = data;
    }

    TimeAnnotation.prototype.annotate = function($content, renderer) {
        console.log("Time annotations are not yet implemented.");
    };

    var AnnotationManifest = function AnnotationManifest(target, annotations) {
        this.target = target;
        this.annotations = annotations;
    };

    AnnotationManifest.prototype.annotate = function ($content, renderer) {
        this.annotations.forEach(function (annotation) {
            annotation.annotate($content, renderer);
        });
    };

    function loadDocument(doc) {
        var target = doc.meta.target;
        var annotations;

        if (target === "text") {
            annotations = doc.annotations.map(function (obj) {
                var regex = new RegExp(obj.regex);
                return new TextAnnotation(regex, obj.data);
            });
        }
        if (target === "image") {
            annotations = doc.annotations.map(function (obj) {
                return new ImageAnnotation(obj.location, obj.data);
            });
        }
        if (target === "time") {
            annotations = doc.annotations.map(function (obj) {
                return new TimeAnnotation(obj.start, obj.end, obj.data);
            });
        }

        return new AnnotationManifest(target, annotations);
    }

    // The SimpleAnnotator object
    return {

        /**
         * Annotates a DOM element
         * @param manifests An array of AnnotationManifest objects
         * @param content The content to be annotated. This is a DOM Element
         * @param renderer This is a function which is called when the annotation is clicked
         */
        annotate: function annotate(manifests, content, renderer) {
            manifests.forEach(function (manifest) {
                manifest.annotate($(content), renderer);
            });
        },

        load: function(source, callback) {
            if (typeof source === "object") {
                callback(loadDocument(source));
            }
            if (typeof source === "string") {
                $.ajax(source, {
                    dataType: "json",
                    success: function (data) {
                        callback(loadDocument(data));
                    }
                })
            }
        },

        AnnotationManifest: AnnotationManifest

    };
}());