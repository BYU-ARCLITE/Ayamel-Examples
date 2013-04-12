var ImageEditor = (function () {
    "use strict";

    var active = false;
    var startPos = {x: 0, y: 0};
    var endPos = {x: 0, y: 0};
    var size;
    var position;
    var $cropOverlay;
    var cropChildren;
    var updateCallback;

    function restrictOverlaySize() {
        if (endPos.x < position.left) {
            endPos.x = position.left;
        }
        if (endPos.x > position.left + size.width) {
            endPos.x = position.left + size.width;
        }
        if (endPos.y < position.top) {
            endPos.y = position.top;
        }
        if (endPos.y > position.top + size.height) {
            endPos.y = position.top + size.height;
        }
    }

    function computeRenderedSize(image, $imgHolder) {
        if (image.width <= $imgHolder.width() && image.height <= $imgHolder.height()) {

            // Rendering the image as it is
            return {
                width: image.width,
                height: image.height
            }
        } else {

            // Figure out the scale factor
            var xScale = $imgHolder.width() / image.width;
            var yScale = $imgHolder.height() / image.height;
            var scale = Math.min(xScale, yScale);

            return {
                width: image.width * scale,
                height: image.height * scale
            }
        }
    }

    function renderCropOverlay() {
        var top = Math.min(startPos.y, endPos.y) - position.top;
        var left = Math.min(startPos.x, endPos.x) - position.left;
        var bottom = size.height - Math.max(startPos.y, endPos.y) + position.top;
        var right = size.width - Math.max(startPos.x, endPos.x) + position.left;
        var height = Math.abs(startPos.y - endPos.y);
        var width = Math.abs(startPos.x - endPos.x);

        cropChildren.$top.height(top);
        cropChildren.$bottom.height(bottom);
        cropChildren.$left
            .width(left)
            .height(height)
            .css("top", top + "px");
        cropChildren.$right
            .width(right)
            .height(height)
            .css("top", top + "px");
        cropChildren.$highlight
            .width(width)
            .height(height)
            .css("top", top)
            .css("left", left);
    }

    function setupCropOverlay($element) {
        // Create a parent container with children
        $cropOverlay = $('<div id="cropOverlay"></div>');
        cropChildren = {
            $top: $('<div></div>'),
            $left: $('<div></div>'),
            $bottom: $('<div></div>'),
            $right: $('<div></div>'),
            $highlight: $('<div class="highlight"></div>')
        };
        $cropOverlay
            .append(cropChildren.$top)
            .append(cropChildren.$left)
            .append(cropChildren.$bottom)
            .append(cropChildren.$right)
            .append(cropChildren.$highlight);

        // Add the overlay the parent and set up the cursor
        $element.append($cropOverlay).css("cursor", "crosshair");
    }

    function setupOverlaySize() {
        $cropOverlay
            .width(size.width)
            .height(size.height)
            .css("left", position.left)
            .css("top", position.top);

        // Set up the non-changing properties in the children
        cropChildren.$top
            .css("left", 0)
            .css("top", 0)
            .width(size.width);
        cropChildren.$bottom
            .css("left", 0)
            .css("bottom", 0)
            .width(size.width);
        cropChildren.$left.css("left", 0);
        cropChildren.$right.css("right", 0);
    }

    function triggerUpdate() {
        if (updateCallback) {
            var data = {
                top: (Math.min(startPos.y, endPos.y) - position.top) / size.height,
                bottom: (Math.max(startPos.y, endPos.y) - position.top) / size.height,
                left: (Math.min(startPos.x, endPos.x) - position.left) / size.width,
                right: (Math.max(startPos.x, endPos.x) - position.left) / size.width
            };
            updateCallback(data)
        }
    }

    return {
        attach: function($element, image, callback) {
            var offset;

            // Figure out the size and position of the rendered image
            size = computeRenderedSize(image, $element);
            position = {
                left: ($element.width() / 2) - (size.width / 2),
                top: ($element.height() / 2) - (size.height / 2)
            };
            updateCallback = callback;

            // Set up the drawing interface
            setupCropOverlay($element);

            // Size the overlay
            startPos = {
                x: position.left,
                y: position.top
            };
            endPos = {
                x: position.left + size.width,
                y: position.top + size.height
            };
            setupOverlaySize();
            renderCropOverlay();

            // Set up the draw functionality
            offset = $element.offset();
            $element
                .mousedown(function (e) {
                    var clickPosition = {
                        x: e.pageX - offset.left,
                        y: e.pageY - offset.top
                    };

                    // Ignore this click if not on the image
                    if (clickPosition.x >= position.left && clickPosition.x <= position.left + size.width
                        && clickPosition.y >= position.top && clickPosition.y <= position.top + size.height) {
                        startPos = endPos = clickPosition;
                        active = true;
                    }
                }).mouseup(function (e) {
                    endPos = {
                        x: e.pageX - offset.left,
                        y: e.pageY - offset.top
                    };
                    active = false;
                }).mousemove(function (e) {
                    if (active) {
                        endPos = {
                            x: e.pageX - offset.left,
                            y: e.pageY - offset.top
                        };
                        restrictOverlaySize();
                        renderCropOverlay();
                        triggerUpdate();
                    }
                });
        },
        reset: function() {
            startPos = {
                x: position.left,
                y: position.top
            };
            endPos = {
                x: position.left + size.width,
                y: position.top + size.height
            };
            renderCropOverlay();
            triggerUpdate();
        }
    };
}());