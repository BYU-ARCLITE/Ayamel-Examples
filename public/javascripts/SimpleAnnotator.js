/**
 * The SimpleAnnotator is an object which annotate.
 * Uses JQuery for simple HTML manipulation.
 * It handles simple annotations (thus the name), but does not do:
 * <ul>
 *     <li>Overlapping annotations</li>
 *     <li>Annotating complex/nested DOM objects</li>
 * </ul>
 * @author Joshua Monson
 */
var SimpleAnnotator = (function () {
    "use strict";

    /**
     * A MatchData object is used when annotating.
     * @param regex A RegExp object that will be used to match text
     * @param data The content that will be associated with matched text
     * @constructor
     */
    var MatchData = function MatchData(regex, data) {
        this.regex = regex;
        this.data = data;
    };

    /**
     * This adds a Bootstrap annotation to the content
     * @param content The content to be annotated. This is a DOM Element
     * @param handler This is a function which is called when the annotation is clicked
     * @param setup (Optional) A function which can be used to help set up the annotations
     */
    MatchData.prototype.annotate = function annotate(content, handler, setup) {
        // Get the matches
        var text = $(content).text(),
            matchData = this,
            match,
            newText;

        // Add a tags around each match
        match = matchData.regex.exec(text);
        if (match !== null) {
            newText = text.replace(matchData.regex, '<a href="#" class="annotation">' + match[0] + '</a>');
            $(content).html(newText);
        }

        // Attach the handler to the a tags
        $(content).find('a.annotation').each(function () {
            setup && setup(this, matchData.data);
        }).click(function () {
            handler(this, matchData.data);
            return false;
        });
    };

    // The SimpleAnnotator object
    return {

        /**
         * Annotates a DOM element
         * @param matchData An array of MatchData objects
         * @param content The content to be annotated. This is a DOM Element
         * @param handler This is a function which is called when the annotation is clicked
         * @param setup (Optional) A function which can be used to help set up the annotations
         */
        annotate: function annotate(matchData, content, handler, setup) {
            var i;

            for (i = 0; i < matchData.length; i += 1) {
                matchData[i].annotate(content, handler, setup);
            }
        },

        // The MatchData object will be available through the SimpleAnnotator object
        MatchData: MatchData

    };
}());