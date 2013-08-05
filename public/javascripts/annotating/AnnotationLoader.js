/**
 * Given a JSON structure of an AnnotationManifest, this creates it anew with the proper classes so that their method
 * are available.
 */
var AnnotationLoader = (function(){

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
//                return new TimeAnnotation(obj.start, obj.end, obj.data);
            });
        }

        return new AnnotationManifest(target, annotations);
    }

    return {

        /**
         * Loads an annotation manifest from a source
         * @param source Either a URL or an object
         * @param callback A callback where the newly generated AnnotationManifest will be passed
         */
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
        }
    };
}());