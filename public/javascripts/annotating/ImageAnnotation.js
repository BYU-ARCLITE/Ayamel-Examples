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

    ImageAnnotation.prototype.annotate = function(canvas, filter, open) {

        // Create the box annotation
        var x1 = this.location[0][0];
        var y1 = this.location[0][1];
        var x2 = this.location[1][0];
        var y2 = this.location[1][1];
        var box = canvas.drawBox(x1, y1, x2, y2, ["annotationBox"]);
        box.annotation = this;

        // Fill the contents appropriately
        if (this.data.type === "image") {
            box.$element
                .html("")
                .css("background-size", "contain")
                .css("background-position", "center")
                .css("background-repeat", "no-repeat")
                .css("background-image", "url('" + this.data.value + "')")

            if (open) {
                box.$element
                    .css("cursor", "pointer")
                    .click(function() {
                        window.open(box.annotation.data.value);
                    });
            }
        }
        if (this.data.type === "text") {
            box.$element.html(this.data.value);
        }
        if (this.data.type === "content") {
            ContentCache.load(this.data.value, function(content) {
                var thumbnail = ContentThumbnails.resolve(content);
                box.$element
                    .html("")
                    .css("background-size", "contain")
                    .css("background-position", "center")
                    .css("background-repeat", "no-repeat")
                    .css("background-image", "url('" + thumbnail + "')");

                if (open) {
                    box.$element
                        .css("cursor", "pointer")
                        .click(function() {
                            window.location = "/content/" + content.id;
                        });
                }
            });
        }

        if (filter) {
            filter(box, this.data);
        }
    };

    ImageAnnotation.prototype.isEqualTo = function(annotation) {
        var locationsMatch =
            this.location[0][0] === annotation.location[0][0] &&
            this.location[0][1] === annotation.location[0][1] &&
            this.location[1][0] === annotation.location[1][0] &&
            this.location[1][1] === annotation.location[1][1];
        var dataMatch = this.data.type == annotation.data.type && this.data.value == annotation.data.value;
        return locationsMatch && dataMatch;
    };

    return ImageAnnotation;
}());