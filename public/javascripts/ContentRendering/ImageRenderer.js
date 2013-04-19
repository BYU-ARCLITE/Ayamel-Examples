/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/19/13
 * Time: 11:01 AM
 * To change this template use File | Settings | File Templates.
 */
var ImageRenderer = (function(ContentRenderer){

    function createLayout(args) {
        var $imgHolder = $('<div id="imgHolder"></div>');

        $(args.holder).html($imgHolder);

        return {
            $imgHolder: $imgHolder
        };
    }

    function setImage(args, callback) {
        var img = new Image();
        img.src = args.backgroundUrl;
        img.onload = function () {

            // Set the background
            args.layout.$imgHolder.css("background-image", "url('" + args.backgroundUrl + "')");

            // Possibly resize it smaller to the actual size
            if (this.width <= args.layout.$imgHolder.width() && this.height <= args.layout.$imgHolder.height()) {
                args.layout.$imgHolder.css("background-size", "initial");
            }

            callback(img);
        };
    }

    return {
        render: function(args) {

            // Load all important information
            var file = ContentRenderer.findFile(args.resource, function (file) {
                return file.representation === "original";
            });

            // Load annotations
            ContentRenderer.getAnnotations(args, function (manifests) {
                args.manifests = manifests;

                // Create the layout
                args.layout = createLayout(args);

                // Load the image and set the background
                args.backgroundUrl = file.downloadUri;
                setImage(args, function (image) {
                    args.image = image;

                    // Add annotations
                    ImageAnnotator.annotate(args);

                    if (args.callback) {
                        args.callback();
                    }
                });
            });
        }
    };
}(ContentRenderer));