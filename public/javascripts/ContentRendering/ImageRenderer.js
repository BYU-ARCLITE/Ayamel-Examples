/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/19/13
 * Time: 11:01 AM
 * To change this template use File | Settings | File Templates.
 */
var ImageRenderer = (function(){

    function createLayout() {
        return {

        };
    }

    function setImage(args, callback) {
        var img = new Image();
        img.src = url;
        img.onload = function () {

            // Set the background
            args.layout.$imgHolder.css("background-image", "url('" + args.url + "')");

            // Possibly resize it smaller to the actual size
            if (this.width <= args.layout.$imgHolder.width() && this.height <= args.layout.$imgHolder.height()) {
                args.layout.$imgHolder.css("background-size", "initial");
            }

            if (callback) {
                callback(image);
            }
        };
    }

    return {
        render: function(args) {

            // Load all important information
            var file = ContentRenderer.findFile(args.resource, function (file) {
                return file.representation === "original";
            });
            // TODO: Load annotations

            // Create the layout
            args.layout = createLayout();

            // Load the image and set the background
            args.backgroundUrl = file.downloadUri;
            setImage(args, function (image) {

                // TODO: Load annotations

                if (args.callback) {
                    args.callback();
                }
            });
        }
    };
}());