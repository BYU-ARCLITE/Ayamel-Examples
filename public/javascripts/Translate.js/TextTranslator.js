(function (scope) {
    "use strict";

    /**
     * The translation engine object. This will be used to build specific translation services
     * @constructor
     */
    function TranslationEngine(name, service) {
        this.name = name || "Unknown";

        /**
         * The service function should accept a string and return the translated text. Can be formatted HTML.
         * @param text The text to be translated
         * @param srcLang The source language of the text
         * @param destLang The destination or desired language of the translation
         * @param callback The callback the result will be passed to
         * @param error This is a callback which is called if the translation failed
         */
        this.service = service || function (text, srcLang, destLang, callback, error) {
            throw "Undefined translation engine service.";
        };
    }
    scope.TranslationEngine = TranslationEngine;

    /**
     * The text translator object
     * @param element
     * @constructor
     */
    function TextTranslator(element) {
        this.element = element;
        this.translationEngines = [];
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
        var translator = this;
        $(DOMNode).mouseup(function () {
            // Get the text selection
            var text = window.getSelection().toString().trim();

            // Translate it if it's not empty
            if (text !== '') {
                translator.translate(text, srcLang, destLang);
            }
        });
    };
    TextTranslator.prototype.translate = function translate(text, srcLang, destLang, element) {
        var translator = this;
        element = element || translator.element;

        // The error function. For now, just alert and say there was a problem.
        function error() {
            alert("Error translating: " + text);
        }

        // The success function. For now, just append the results to the designated element
        function success(result) {
            var code = "<div><strong>" + text + ":</strong><br />" + result + "</div>"
            $(element).append(code);
        }

        // Recursively go through the translation engines until we either get a translation or hit the end
        function callEngine(index) {
            if (index >= translator.translationEngines.length) {
                error();
            } else {
                translator.translationEngines[index][0].service(text, srcLang, destLang, function (result) {
                    // This engine successfully translated. Display the results
                    success(result);
                }, function () {
                    // This engine failed, so call the next one
                    callEngine(index + 1);
                });
            }
        }

        callEngine(0);
    };
    scope.TextTranslator = TextTranslator;
}(window));