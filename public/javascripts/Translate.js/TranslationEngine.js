var TranslationEngine = (function () {
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

    return TranslationEngine;
}());