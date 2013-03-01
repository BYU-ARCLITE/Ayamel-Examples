(function (scope) {
    "use strict";

    var googleService = function googleService(text, srcLang, destLang, callback, error) {
        var url = "/gt/" + srcLang + "/" + destLang + "/" + encodeURIComponent(text);
        $.ajax(url, {
            dataType: "json",
            success: function (data) {
                var result = data.translation + " (from Google Translate)";
                callback(result);
            },
            error: function (data) {
                error();
            }
        });
    };

    scope.googleTranslationEngine = new TranslationEngine("Google Translation Service", googleService);
}(window));