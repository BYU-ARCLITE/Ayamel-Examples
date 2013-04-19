(function (scope) {
    "use strict";

    var googleService = function googleService(text, srcLang, destLang, callback, error) {
        var url = "/ajax/translate/google/" + srcLang + "/" + destLang + "/" + encodeURIComponent(text);
        $.ajax(url, {
            dataType: "json",
            success: function (data) {
                var results = [data.translation];
                callback(results, "(From Google Translate)");
            },
            error: function (data) {
                error();
            }
        });
    };

    scope.googleTranslationEngine = new TranslationEngine("Google Translation Service", googleService);
}(window));