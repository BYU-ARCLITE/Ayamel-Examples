(function (scope) {
    "use strict";

    var wordReferenceService = function wordReferenceService(text, srcLang, destLang, callback, error) {
        var url = "/ajax/translate/wordReference/" + srcLang + "/" + destLang + "/" + encodeURIComponent(text);

        function addTranslations(holder, translation) {
            holder.push(translation.FirstTranslation.term);
            if (translation.SecondTranslation)
                holder.push(translation.SecondTranslation.term);
            if (translation.ThirdTranslation)
                holder.push(translation.ThirdTranslation.term);
            if (translation.FourthTranslation)
                holder.push(translation.FourthTranslation.term);
        }

        $.ajax(url, {
            dataType: "json",
            success: function(result) {
                var entries = [];
                var i;
                var j;
                var translation;

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
                    var link = '<a href="http://www.wordreference.com/' + srcLang + destLang + '/' + text + '" target="wordreference">at WordReference.com</a>';
                    callback(entries, link);
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