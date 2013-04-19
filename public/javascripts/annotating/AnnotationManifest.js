/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/19/13
 * Time: 11:52 AM
 * To change this template use File | Settings | File Templates.
 */
var AnnotationManifest = (function() {
    var AnnotationManifest = function AnnotationManifest(target, annotations) {
        this.target = target;
        this.annotations = annotations;
    };

    AnnotationManifest.prototype.annotate = function ($content, renderer) {
        this.annotations.forEach(function (annotation) {
            annotation.annotate($content, renderer);
        });
    };

    return AnnotationManifest;
}());