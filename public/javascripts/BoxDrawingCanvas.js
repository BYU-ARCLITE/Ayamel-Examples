/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/17/13
 * Time: 12:36 PM
 * To change this template use File | Settings | File Templates.
 */
var BoxDrawingCanvas = (function(){
    "use strict";

    function computeRenderedMetrics(image, $imgHolder) {

        // Figure out the scale factor
        var xScale = $imgHolder.width() / image.width;
        var yScale = $imgHolder.height() / image.height;
        var scale = Math.min(xScale, yScale);

        // If the image is smaller than the holder then the scale factor is 1
        if (image.width <= $imgHolder.width() && image.height <= $imgHolder.height()) {
            scale = 1;
        }

        // Compute the metrics and return them
        var width = image.width * scale;
        var height = image.height * scale;
        var top  = ($imgHolder.height() - height) / 2;
        var left = ($imgHolder.width() - width) / 2;
        return {
            width: width,
            height: height,
            top: top,
            left: left
        }
    }

    function BoxDrawingCanvas(image, $imgHolder) {
        var metrics = computeRenderedMetrics(image, $imgHolder);
        var drawable = false;
        var drawing = false;
        var _this = this;

        this.$element =
            $("<div class='boxDrawingCanvas'></div>")
                .css("position", "absolute")
                .width(metrics.width)
                .height(metrics.height)
                .css("top", metrics.top + "px")
                .css("left", metrics.left + "px");

        $imgHolder.append(this.$element);

        this.$element.mousedown(function (event) {
            if (drawable && !drawing) {
                var pos = $(this).offset();
                var x = event.pageX - pos.left;
                var y = event.pageY - pos.top;
                drawing = true;

                // Create and dispatch an event
                var newEvent = document.createEvent('HTMLEvents');
                newEvent.initEvent("drawstart", true, true);
                newEvent.drawX = x / $(this).width();
                newEvent.drawY = y / $(this).height();
                this.dispatchEvent(newEvent);
            }
        });
        $("body")
            .mousemove(function (event) {
                if (drawing) {
                    var pos = _this.$element.offset();
                    var x = event.pageX - pos.left;
                    var y = event.pageY - pos.top;

                    // Create and dispatch an event
                    var newEvent = document.createEvent('HTMLEvents');
                    newEvent.initEvent("drawupdate", true, true);
                    newEvent.drawX = x / _this.$element.width();
                    newEvent.drawY = y / _this.$element.height();
                    _this.$element[0].dispatchEvent(newEvent);
                }
            }).mouseup(function (event) {
                if (drawing) {
                    var pos = _this.$element.offset();
                    var x = event.pageX - pos.left;
                    var y = event.pageY - pos.top;
                    drawing = false;

                    // Create and dispatch an event
                    var newEvent = document.createEvent('HTMLEvents');
                    newEvent.initEvent("drawend", true, true);
                    newEvent.drawX = x / _this.$element.width();
                    newEvent.drawY = y / _this.$element.height();
                    _this.$element[0].dispatchEvent(newEvent);
                }
            });

        Object.defineProperties(this, {
            drawable: {
                get: function() {
                    return drawable;
                },
                set: function(val) {
                    drawable = val;
                    if (drawable) {
                        _this.$element.addClass("drawable");
                    } else {
                        _this.$element.removeClass("drawable");
                    }
                }
            }
        });
    }

    BoxDrawingCanvas.prototype.addEventListener = function(eventName, handler) {
        this.$element[0].addEventListener(eventName, handler);
    };

    function placeElement($element, x1, y1, x2, y2) {
        $element
            .css("left",   (x1 * 100) + "%")
            .css("top",    (y1 * 100) + "%")
            .css("right",  ((1 - x2) * 100) + "%")
            .css("bottom", ((1 - y2) * 100) + "%");
    }

    function getParentPosition(event, $parent) {
        var pos = $parent.offset();

        // Figure out where the point is in pixels
        var parentX = event.pageX - pos.left;
        var parentY = event.pageY - pos.top;

        // Convert it to percentage;
        return [
            parentX / $parent.width(),
            parentY / $parent.height()
        ];
    }

    BoxDrawingCanvas.prototype.drawBox = function(x1, y1, x2, y2, classes, content) {
        var box = new Box(x1, y1, x2, y2, classes, content);
        this.$element.append(box.$element);
        return box;
    };

    function Box(x1, y1, x2, y2, classes, content) {
        var resizable = false;
        var resizeDir = 0;
        var resizing = false;
        var resizeStart = [0,0];
        var resizeStartState = [0,0,1,1];
        var selectable = false;
        var _this = this;

        this.$element = $("<div></div>")
            .css("z-index", 50)
            .css("position", "absolute")
            .css("cursor", "inherit");
        placeElement(this.$element, x1, y1, x2, y2);

        if (classes && classes.length) {
            this.$element.addClass(classes.join(" "));
        }

        if (content) {
            this.$element.html(content);
        }

        // Set up the mouse functionality
        this.$element
            .mousemove(function (event) {
                var x = event.offsetX;
                var y = event.offsetY;

                // Only do stuff if resizing is enabled
                if (!resizing && resizable) {

                    // How close are we to the edge
                    var width = $(this).width();
                    var height = $(this).height();
                    var buffer = 10;

                    resizeDir = 0;

                    if (x <= buffer) {
                        resizeDir = 1;
                        $(this).css("cursor", "w-resize");
                    }
                    if (x >= (width - buffer)) {
                        resizeDir = 3;
                        $(this).css("cursor", "e-resize");
                    }
                    if (y <= buffer) {
                        resizeDir = 2;
                        $(this).css("cursor", "n-resize");
                    }
                    if (y >= (height - buffer)) {
                        resizeDir = 4;
                        $(this).css("cursor", "s-resize");
                    }

                    if (resizeDir === 0) {
                        $(this).css("cursor", "inherit");
                    } else {
                        event.stopPropagation();

                        // Create and dispatch an event
                        var newEvent = document.createEvent('HTMLEvents');
                        newEvent.initEvent("resizestart", true, true);
                        newEvent.box = _this;
                        this.dispatchEvent(newEvent);
                    }
                }
            }).mousedown(function (event) {
                if (resizeDir) {
                    event.stopPropagation();

                    // Figure out at what percentage we are starting to resize
                    resizeStart = getParentPosition(event, $(this).parent());
                    resizeStartState = [x1, y1, x2, y2];
                    resizing = true;
                }
            }).click(function (event) {
                if (selectable && !resizing) {
                    event.stopPropagation();

                    // Create and dispatch an event
                    var newEvent = document.createEvent('HTMLEvents');
                    newEvent.initEvent("select", true, true);
                    newEvent.box = _this;
                    this.dispatchEvent(newEvent);
                }
            });
        $("body")
            .mousemove(function (event) {
                if (resizing) {

                    var pos = getParentPosition(event, _this.$element.parent());
                    if (resizeDir === 1) {
                        x1 = Math.min(Math.max(pos[0] - (resizeStart[0] - resizeStartState[0]), 0), x2);
                    }
                    if (resizeDir === 2) {
                        y1 = Math.min(Math.max(pos[1] - (resizeStart[1] - resizeStartState[1]), 0), y2);
                    }
                    if (resizeDir === 3) {
                        x2 = Math.max(Math.min(pos[0] + (resizeStartState[2] - resizeStart[0]), 1), x1);
                    }
                    if (resizeDir === 4) {
                        y2 = Math.max(Math.min(pos[1] + (resizeStartState[3] - resizeStart[1]), 1), y1);
                    }
                    placeElement(_this.$element, x1, y1, x2, y2);

                    // Create and dispatch an event
                    var newEvent = document.createEvent('HTMLEvents');
                    newEvent.initEvent("resizeupdate", true, true);
                    newEvent.size = {
                        x1: x1,
                        y1: y1,
                        x2: x2,
                        y2: y2
                    };
                    _this.$element[0].dispatchEvent(newEvent);
                }
            }).mouseup(function (event) {
                if (resizing) {
                    resizing = false;
                    resizeDir = 0;

                    // Create and dispatch an event
                    var newEvent = document.createEvent('HTMLEvents');
                    newEvent.initEvent("resizeend", true, true);
                    newEvent.size = {
                        x1: x1,
                        y1: y1,
                        x2: x2,
                        y2: y2
                    };
                    _this.$element[0].dispatchEvent(newEvent);
                }
            });

        Object.defineProperties(this, {
            resizable: {
                get: function() {
                    return resizable;
                },
                set: function(val) {
                    resizable = val;
                }
            },
            selectable: {
                get: function() {
                    return selectable;
                },
                set: function(val) {
                    selectable = val;
                }
            },
            position: {
                get: function() {
                    return {
                        x1: x1,
                        y1: y1,
                        x2: x2,
                        y2: y2
                    }
                },
                set: function(val) {
                    x1 = val.x1;
                    y1 = val.y1;
                    x2 = val.x2;
                    y2 = val.y2;
                    placeElement(_this.$element, x1, y1, x2, y2);
                }
            }
        });
    }

    Box.prototype.addEventListener = function(eventName, handler) {
        this.$element[0].addEventListener(eventName, handler);
    };

    return BoxDrawingCanvas;
}());