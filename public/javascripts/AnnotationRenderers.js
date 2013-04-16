/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/16/13
 * Time: 3:44 PM
 * To change this template use File | Settings | File Templates.
 */
var AnnotationRenderers = (function() {
    "use strict";

    var $annotationTab;
    var $annotationContent;

    function videoRenderer($annotation, data) {
        // Associate the data with the annotation
        $annotation.click(function () {
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

            // Flip to the annotation tab
            $annotationTab.tab("show");
        });

        return $annotation;
    }

    function imageRenderer($annotation, data) {
        $annotation
            .css("background-color", "rgba(0,0,0,0.5)")
            .css("color", "white");

        // For now only allow image and text annotations on images

        if (data.type === "image") {
            $annotation
                .css("background-size", "contain")
                .css("background-position", "center")
                .css("background-repeat", "no-repeat")
                .css("background-image", "url('" + data.value + "')");
        }

        if (data.type === "text") {
            $annotation.html(data.value);
        }

        return $annotation;
    }


    return {
        init: function($tab, $content) {
            $annotationTab = $tab;
            $annotationContent = $content;
        },

        video: videoRenderer,
        image: imageRenderer
    };
}());