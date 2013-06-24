/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 6/24/13
 * Time: 5:16 PM
 * To change this template use File | Settings | File Templates.
 */
var ScreenAdapter = (function() {

    var ScreenAdapter = {
        fitHeight: function($element, aspectRatio, subtract) {
            var position = $element.offset();
            var height = $element.height();
            subtract = subtract || 0;

            // Available height = screen height - top - subtract buffer
            var newHeight = this.height - (position.top + subtract);
            if (newHeight < height || !height) {
                $element.height(newHeight);
            }

            if (aspectRatio) {
                $element.width($element.height() * aspectRatio);
            }
        },

        containByHeight: function($element, aspectRatio, buffer) {
            var height = $element.height();
            buffer = buffer || 0;

            // Resize if bigger than the available space or if  hasn't been initialized yet
            if (height > this.height || !height) {
                $element.height(this.height - buffer);
                if (aspectRatio) {
                    $element.width($element.height() * aspectRatio)
                }
            }
        }
    };

    Object.defineProperties(ScreenAdapter, {
        height: {
            get: function() {
                return window.innerHeight;
            }
        },
        width: {
            get: function() {
                return window.innerWidth;
            }
        }
    });

    return ScreenAdapter;
})();