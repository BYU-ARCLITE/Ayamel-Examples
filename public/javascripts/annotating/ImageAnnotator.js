/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/19/13
 * Time: 11:02 AM
 * To change this template use File | Settings | File Templates.
 */
var ImageAnnotator = (function() {
    return {
        annotate: function (args) {
            var canvas = new BoxDrawingCanvas(args.image, args.layout.$imgHolder);

            args.manifests.forEach(function (manifest) {
                manifest.annotations.forEach(function (annotation) {
                    annotation.annotate(canvas, args.filter);
                });
            });
        }
    };
}());