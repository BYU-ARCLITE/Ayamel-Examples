/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/19/13
 * Time: 11:02 AM
 * To change this template use File | Settings | File Templates.
 */
var TextAnnotator = (function() {

    function TextAnnotator(manifests, filter) {
        this.filter = filter;
        this.manifests = manifests;
    }

    TextAnnotator.prototype.annotate = function(content) {
        var _this = this;
        this.manifests.forEach(function (manifest) {
            manifest.annotations.forEach(function (annotation) {
                annotation.annotate(content, _this.filter);
            });
        });
    };

    TextAnnotator.prototype.addEventListener = function(event, callback) {
        this.manifests.forEach(function (manifest) {
            manifest.annotations.forEach(function (annotation) {
                annotation.addEventListener(event, callback);
            });
        });
    };

    return TextAnnotator;
}());