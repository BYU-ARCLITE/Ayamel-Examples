(function (scope) {
    "use strict";

    var arcliteService = function arcliteService(text, srcLang, destLang, callback, error) {
        var url = "http://translate.byu.edu/api/v1/lookup?srcLang=" + srcLang + "&destLang=" + destLang + "&word=" + encodeURIComponent(text);
        $.ajax(url, {
            dataType: "json",
            success: function (data) {
                var results = data.entries;
                callback(results, "(From the ARCLITE Dictionaries)");
            },
            error: function (data) {
                error();
            }
        });
    };

    scope.arcliteTranslationEngine = new TranslationEngine("ARCLITE Dictionary Translation Service", arcliteService);
}(window));