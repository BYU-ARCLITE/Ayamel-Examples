/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/19/13
 * Time: 11:01 AM
 * To change this template use File | Settings | File Templates.
 */
var ImageRenderer = (function(){

    function createLayout(holder) {
        var $imgHolder = $('<div id="imgHolder"></div>');

        $(holder).html($imgHolder);

        return {
            $imgHolder: $imgHolder
        };
    }

    function setImage(layout, backgroundUrl, callback) {
        var img = new Image();
        img.src = backgroundUrl;
        img.onload = function() {

            // Set the background
            layout.$imgHolder.css("background-image", "url('" + backgroundUrl + "')");

            // Possibly resize it smaller to the actual size
            if (this.width <= layout.$imgHolder.width() && this.height <= layout.$imgHolder.height()) {
                layout.$imgHolder.css("background-size", "initial");
            }

            callback(img);
        };
    }

    return {
	
		//args: drawable, filter, open, resource, annotate, imgcallback
		// courseId, contentId, holder
        render: function(args) {

            // Load all important information
            var file = ContentRenderer.findFile(args.resource, function(file) {
                return file.representation === "original";
            });

            // Load annotations
			
            ContentRenderer.getAnnotations({
				resource: args.resource,
				courseId: args.courseId,
				contentId: args.contentId,
				permission: "view"
			}, function(manifests) {
                // Create the layout
				var layout = createLayout(args.holder);

                // Load the image and set the background
                setImage(layout, file.downloadUri, function(image) {

                    // Add annotations
                    if(args.annotate) {
                        ImageAnnotator.annotate({
							image: image,
							layout: layout,
							drawable: args.drawable,
							manifests: manifests,
							filter: args.filter,
							open: args.open
						});
                    }

                    if(typeof args.imgcallback === 'function') {
                        args.imgcallback(image, layout);
                    }
                });
            });
        }
    };
}());