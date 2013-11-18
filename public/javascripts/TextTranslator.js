var TextTranslator = (function () {
    "use strict";

    /**
     * The text translator object
     * @constructor
     */
    function TextTranslator(){ this.e = document.createElement("div"); }

    /**
     * This takes a DOM element and sets it up so selecting text will invoke the translator.
     * @param DOMNode
     * @param srcLang
     * @param destLang
     * @param eventData
     */
    //TODO: Integrate with the generic text manipulation widget so we don't have to attach ad-hoc like this
    TextTranslator.prototype.attach = function attach(DOMNode, srcLang, destLang, eventData) {
        var _this = this;

        // Because translation engines look for two-letter codes, make sure that's what we are dealing with
        if (srcLang.length === 3)
            srcLang = Ayamel.utils.downgradeLangCode(srcLang);
        if (destLang.length === 3)
            destLang = Ayamel.utils.downgradeLangCode(destLang);

        function translate(text) {
            // Translate it if it's not empty
            if (text !== '') {
                _this.translate(text, srcLang, destLang);

                // Dispatches a translate event
                var event = document.createEvent("HTMLEvents");
                event.initEvent("translate", true, true);
                event.text = text;
                event.sourceElement = DOMNode;
                event.data = eventData;
                _this.e.dispatchEvent(event);
            }
        }

        if (Ayamel.utils.mobile.isMobile) {
            var doubleTapTime = 500; // A half second max between taps;
            var taps = 0;

            DOMNode.addEventListener("touchstart", function() {
                taps++;

                if (taps === 1) {
                    window.setTimeout(function() {taps = 0;}, doubleTapTime);
                }
            });
            DOMNode.addEventListener("touchend", function() {
                if (taps === 2) {
                    // For now translate the whole line
                    translate($(DOMNode).text().trim());
                }
            });
        } else {
            $(DOMNode).mouseup(function () {
                // Get the text selection
                translate(window.getSelection().toString().trim());
            });
        }
    };

    TextTranslator.prototype.translate = function translate(text, srcLang, destLang, callback) {
        var _this = this;
        //TODO: Use CustomEvent
        $.ajax("http://sartre3.byu.edu:9010/api/v1/lookup?srcLang=" + srcLang + "&destLang=" + destLang + "&word=" + encodeURIComponent(text), {
            dataType: "json",
            success: function success(data) {
                var event = document.createEvent("HTMLEvents");
                event.initEvent("translateSuccess", true, true);
                event.text = text;
                event.translations = data.entries;
                event.engine = data.source;
                event.srcLang = Ayamel.utils.upgradeLangCode(srcLang);
                event.destLang = Ayamel.utils.upgradeLangCode(destLang);
                _this.e.dispatchEvent(event);
                callback && callback(event);
            },
            error: function() {
                var event = document.createEvent("HTMLEvents");
                event.initEvent("translateError", true, true);
                event.text = text;
                _this.e.dispatchEvent(event);
            }
        });
    };

    TextTranslator.prototype.addEventListener = function(event, callback) {
        this.e.addEventListener(event, callback);
    };

    return TextTranslator;
}());