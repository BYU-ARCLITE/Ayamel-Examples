var TextTranslator = (function () {
    "use strict";

    /**
     * The text translator object
     * @constructor
     */
    function TextTranslator() {
        this.translationEngines = [];
        this.eventListeners = [];
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
     */
    TextTranslator.prototype.attach = function attach(DOMNode, srcLang, destLang) {
        var _this = this;
        $(DOMNode).mouseup(function () {
            // Get the text selection
            var text = window.getSelection().toString().trim();

            // Translate it if it's not empty
            if (text !== '') {
                _this.translate(text, srcLang, destLang);
            }
        });
    };

    TextTranslator.prototype.translate = function translate(text, srcLang, destLang, element) {
        var _this = this;
        element = element || _this.element;

        // The error function. For now, just alert and say there was a problem.
        function error() {
            alert("Error translating: " + text);
        }

        // The success function. Creates and dispatches an event
        function success(results, engine) {
            var event = {
                sourceText: text,
                translations: results,
                engine: engine
            };
            _this.eventListeners.forEach(function (callback) {
                callback(event);
            });
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

    TextTranslator.prototype.addTranslationListener = function(callback) {
        this.eventListeners.push(callback);
    };

    return TextTranslator;
}());