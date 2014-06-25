/**
 * An annotation manifest is basically a container for annotations.
 */
var AnnotationManifest = (function() {
    var AnnotationManifest = function AnnotationManifest(target, annotations) {
        this.target = target;
        this.annotations = annotations;
    };

    AnnotationManifest.prototype.annotate = function (content, renderer) {
        this.annotations.forEach(function (annotation) {
            annotation.annotate(content, renderer);
        });
    };

    return AnnotationManifest;
}());