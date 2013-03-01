(function (scope) {
    "use strict";

    var arcliteService = function arcliteService(text, srcLang, destLang, callback, error) {
        var url = "http://sartre3.byu.edu:9009/api/v1/lookup?srcLang=" + srcLang + "&destLang=" + destLang + "&word=" + encodeURIComponent(text);
        $.ajax(url, {
            dataType: "json",
            success: function (data) {
                var result = data.entries.join(", ");
                callback(result);
            },
            error: function (data) {
                error();
            }
        });
    };

    scope.arcliteTranslationEngine = new TranslationEngine("ARCLITE Dictionary Translation Service", arcliteService);
}(window));