/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/16/13
 * Time: 3:44 PM
 * To change this template use File | Settings | File Templates.
 */
var AnnotationRenderers = (function() {
    "use strict";

    var renderCallback;
    var clickCallback;
    var $annotationContent;

    function videoRenderAnnotation(data) {
        if (data.type === "image") {
            var image = new Image();
            image.src = data.value;
            $annotationContent.html(image);
        }

        if (data.type === "text") {
            $annotationContent.html(data.value);
        }

        if (data.type === "content") {
            ContentRenderer.render(+data.value, $annotationContent);
        }
    }

    function videoRenderer($annotation, data) {
        // Associate the data with the annotation
        $annotation.click(function () {
            videoRenderAnnotation(data);

            if (clickCallback) {
                clickCallback($annotation, data);
            }
        });

        if (renderCallback) {
            renderCallback($annotation, data);
        }

        return $annotation;
    }

    function imageRenderer($annotation, data) {
        $annotation.addClass("annotationBox");

        // For now only allow image and text annotations on images

        if (data.type === "image") {
            $annotation
                .html("")
                .css("background-size", "contain")
                .css("background-position", "center")
                .css("background-repeat", "no-repeat")
                .css("background-image", "url('" + data.value + "')");
        }

        if (data.type === "text") {
            $annotation.html(data.value);
        }

        if (renderCallback) {
            renderCallback($annotation, data);
        }

        return $annotation;
    }


    return {
        init: function($content, callback1, callback2) {
            $annotationContent = $content;
            renderCallback = callback1;
            clickCallback = callback2;
        },

        videoRenderAnnotation: videoRenderAnnotation,

        video: videoRenderer,
        image: imageRenderer
    };
}());