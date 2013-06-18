var TextTranslator = (function () {
    "use strict";

    /**
     * The text translator object
     * @constructor
     */
    function TextTranslator() {
        this.translationEngines = [];
//        this.eventListeners = [];
        this.e = document.createElement("div");
    }

    /**
     * This adds a translation engine to the
     * @param translationEngine A TranslationEngine object
     * @param priority An integer denoting the priority level. The lower the level the sooner it will be used.
     */
    TextTranslator.prototype.addTranslationEngine = function addTranslationEngine(translationEngine, priority) {
        // Add the new translation engine
        this.translationEngines.push([translationEngine, priority]);

        // Sort the list by priority
        this.translationEngines.sort(function (a, b) { return a[1] > b[1]; });
    };

    /**
     * This takes a DOM element and sets it up so selecting text will invoke the translator.
     * @param DOMNode
     * @param srcLang
     * @param destLang
     * @param eventData
     */
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

    TextTranslator.prototype.translate = function translate(text, srcLang, destLang, element) {
        var _this = this;
        element = element || _this.element;

        // The error function. Creates and dispatches a translate error event
        function error() {
            var event = document.createEvent("HTMLEvents");
            event.initEvent("translateError", true, true);
            event.text = text;
            _this.e.dispatchEvent(event);
        }

        // The success function. Creates and dispatches a translate success event
        function success(results, engine) {
            var event = document.createEvent("HTMLEvents");
            event.initEvent("translateSuccess", true, true);
            event.text = text;
            event.translations = results;
            event.engine = engine;
            _this.e.dispatchEvent(event);
        }

        // Recursively go through the translation engines until we either get a translation or hit the end
        function callEngine(index) {
            if (index >= _this.translationEngines.length) {
                error();
            } else {
                _this.translationEngines[index][0].service(text, srcLang, destLang, function (results, engine) {
                    // This engine successfully translated. Display the results
                    success(results, engine);
                }, function () {
                    // This engine failed, so call the next one
                    callEngine(index + 1);
                });
            }
        }

        callEngine(0);
    };

    TextTranslator.prototype.addEventListener = function(event, callback) {
        this.e.addEventListener(event, callback);
    };

    return TextTranslator;
}());