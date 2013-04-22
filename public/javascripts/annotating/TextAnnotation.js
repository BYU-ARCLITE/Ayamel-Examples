/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/19/13
 * Time: 11:17 AM
 * To change this template use File | Settings | File Templates.
 */
var TextAnnotation = (function(){

    function TextAnnotation(regex, data) {
        this.regex = regex;
        this.data = data;
    }

    TextAnnotation.prototype.annotate = function ($content, filter) {
        // Get the matches
        var text = $content.text();
        var match;
        var newText;

        // Add a tags around each match
        match = this.regex.exec(text);
        if (match !== null) {

            // Create the annotation and process it
            var $annotation = $("<span class='annotation'>" + match[0] + "</span>");
            if (filter) {
                $annotation = filter($annotation, this.data);
            }

            // Replace the html with the annotated html
            newText = text.split(this.regex);
            $content.html(newText[0]).append($annotation).append(newText[1]);
        }
    };

    TextAnnotation.prototype.isEqualTo = function(annotation) {
        var regexMatch = this.regex.source === annotation.regex.source;
        var dataMatch = this.data.type === annotation.data.type && this.data.value === annotation.data.value;
        return regexMatch && dataMatch;
    };

    return TextAnnotation;
}());