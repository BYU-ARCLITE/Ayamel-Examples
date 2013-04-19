/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/19/13
 * Time: 11:17 AM
 * To change this template use File | Settings | File Templates.
 */
var ImageAnnotation = (function(){

    /**
     * An image annotation.
     * @param location The location of the annotation on the image
     * @param data The content of the annotation
     * @constructor
     */
    function ImageAnnotation(location, data) {
        this.location = location;
        this.data = data;
    }

    ImageAnnotation.prototype.annotate = function(canvas, filter) {

        // Create the box annotation
        var box = canvas.drawBox(x1, y1, x2, y2, ["annotationBox"]);

        // Fill the contents appropriately
        if (this.data.type === "image") {
            box.$element
                .html("")
                .css("background-size", "contain")
                .css("background-position", "center")
                .css("background-repeat", "no-repeat")
                .css("background-image", "url('" + data.value + "')");
        }
        if (data.type === "text") {
            box.$element.html(this.data.value);
        }

        if (filter) {
            filter(box, this.data);
        }
    };

    return ImageAnnotation;
}());