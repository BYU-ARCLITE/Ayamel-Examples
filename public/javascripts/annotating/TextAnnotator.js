/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/19/13
 * Time: 11:02 AM
 * To change this template use File | Settings | File Templates.
 */
var TextAnnotator = (function() {

    function TextAnnotator(args) {
        this.filter = args.filter;
        this.manifests = args.manifests;
    }

    TextAnnotator.prototype.annotate = function($content) {
        var _this = this;
        this.manifests.forEach(function (manifest) {
            manifest.annotations.forEach(function (annotation) {
                annotation.annotate($content, _this.filter);
            });
        });
    };

    return TextAnnotator;
}());