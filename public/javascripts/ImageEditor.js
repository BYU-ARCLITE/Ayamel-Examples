var ImageEditor = (function () {
    "use strict";

    var canvas;

    // Boxes
    var top;
    var left;
    var bottom;
    var right;
    var outline;

    var start = [0, 0];
    var crop = [0, 0, 1, 1];

    var updateCallback;

    function updateResults() {
        updateCallback({
            top: crop[1],
            left: crop[0],
            bottom: crop[3],
            right: crop[2]
        });
    }

    function updateShadeBoxes() {
        top.position = {x1: 0, y1: 0, x2: 1, y2: crop[1]};
        left.position = {x1: 0, y1: crop[1], x2: crop[0], y2: crop[3]};
        bottom.position = {x1: 0, y1: crop[3], x2: 1, y2: 1};
        right.position = {x1: crop[2], y1: crop[1], x2: 1, y2: crop[3]};
    }

    function updateOutlineBox() {
        outline.position = {x1: crop[0], y1: crop[1], x2: crop[2], y2: crop[3]};
    }

    function startDraw(event) {
        start[0] = crop[0] = crop[2] = event.drawX;
        start[1] = crop[1] = crop[3] = event.drawY;
        updateShadeBoxes();
        updateOutlineBox();
    }

    function updateDraw(event) {
        crop[0] = Math.max(Math.min(event.drawX, start[0]), 0);
        crop[1] = Math.max(Math.min(event.drawY, start[1]), 0);
        crop[2] = Math.min(Math.max(event.drawX, start[0]), 1);
        crop[3] = Math.min(Math.max(event.drawY, start[1]), 1);
        updateShadeBoxes();
        updateOutlineBox();
    }

    function endDraw(event) {
        crop[0] = Math.max(Math.min(event.drawX, start[0]), 0);
        crop[1] = Math.max(Math.min(event.drawY, start[1]), 0);
        crop[2] = Math.min(Math.max(event.drawX, start[0]), 1);
        crop[3] = Math.min(Math.max(event.drawY, start[1]), 1);
        updateShadeBoxes();
        updateOutlineBox();

        // Send out the results
        updateResults();
    }

    function outlineResize(event) {
        crop = [
            event.size.x1,
            event.size.y1,
            event.size.x2,
            event.size.y2
        ];
        updateShadeBoxes();
    }

    return {
        attach: function($element, image, callback) {
            canvas = new BoxDrawingCanvas(image, $element);
            canvas.drawable = true;
            canvas.addEventListener("drawstart", startDraw);
            canvas.addEventListener("drawupdate", updateDraw);
            canvas.addEventListener("drawend", endDraw);

            top = canvas.drawBox(0, 0, 1, 0, ["cropShader"]);
            left = canvas.drawBox(0, 0, 0, 1, ["cropShader"]);
            bottom = canvas.drawBox(0, 1, 1, 1, ["cropShader"]);
            right = canvas.drawBox(1, 0, 1, 1, ["cropShader"]);
            outline = canvas.drawBox(0, 0, 1, 1, ["cropOutline"]);
            outline.resizable = true;
            outline.addEventListener("resize", outlineResize);

            updateCallback = callback;
        },
        reset: function() {
            crop = [0, 0, 1, 1];
            updateShadeBoxes();
            updateOutlineBox();
            updateResults();
        }
    };
}());