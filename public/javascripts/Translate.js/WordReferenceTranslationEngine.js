(function (scope) {
    "use strict";

    var wordReferenceService = function wordReferenceService(text, srcLang, destLang, callback, error) {
        var key = "a5819",
            url = "http://jsonpwrapper.com/?urls%5B%5D=http%3A%2F%2Fapi.wordreference.com%2F0.8%2F" + key + "%2Fjson%2F" + srcLang + destLang + "%2F" + text + "&callback=?";

        function addTranslations(holder, translation) {
            holder.push(translation.FirstTranslation.term);
            if (translation.SecondTranslation)
                holder.push(translation.SecondTranslation.term);
            if (translation.ThirdTranslation)
                holder.push(translation.ThirdTranslation.term);
            if (translation.FourthTranslation)
                holder.push(translation.FourthTranslation.term);
        }

        function formatEntries(entries) {
            return entries.join(", ") + ' <a href="http://www.wordreference.com/' + srcLang + destLang + '/' + text + '">at WordReference.com</a>';
        }

        $.ajax(url, {
            contentType: "application/json",
            dataType: "jsonp",
            success: function(json) {
                var result = JSON.parse(json[0].body),
                    i, j,
                    entries = [],
                    translation;

                /*
                 * Create the new data return object. If there's an error, then we got a different result (redirect,
                 * not found, etc.) so call the error callback if that happens.
                 */
                try {
                    var parts = ["Entries", "PrincipalTranslations", "AdditionalTranslations"];
                    for(i=0; i < parts.length; i++) {
                        var part = parts[i];

                        // Check if the part exists
                        if (result.term0[part]) {

                            // Get all the translations
                            for(j=0; j < Object.keys(result.term0[part]).length; j++) {
                                translation = result.term0[part][j];
                                addTranslations(entries, translation);
                            }
                        }
                    }

                    // Return the translations
                    result = formatEntries(entries);
                    callback(result);
                } catch(e) {
                    error();
                }
            },
            error: function(data) {
                error();
            }
        });
    };

    scope.wordReferenceTranslationEngine = new TranslationEngine("WordReference Translation Service", wordReferenceService);
}(window));