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
        var nodes = [];
        for (var i=0; i<$content[0].childNodes.length; i += 1) {
            var node = $content[0].childNodes.item(i);
            if (node.nodeType === Node.ELEMENT_NODE) {
                nodes.push(node);
            }
            if (node.nodeType === Node.TEXT_NODE) {
                var text = node.textContent;
                var match = this.regex.exec(text);
                if (match !== null) {

                    // Break up the text and recombine with annotations
                    var parts = text.split(this.regex);
                    for (var j=0; j<parts.length; j++) {

                        // Save the text before the annotation
                        nodes.push(document.createTextNode(parts[j]));

                        // If this isn't the last element then save the annotation as well
                        if (j !== parts.length - 1) {
                            var $annotation = $("<span class='annotation'>" + match[0] + "</span>");
                            if (filter) {
                                filter($annotation, this.data)
                            }
                            nodes.push($annotation[0]);
                        }
                    }
                } else {
                    // No match, so save the non-altered text
                    nodes.push(node);
                }
            }
        }

        // Replace the children of the node
        // Start by removing all children
        while ($content[0].firstChild) {
            $content[0].removeChild($content[0].firstChild);
        }

        // Now add everything back
        nodes.forEach(function (node) {
            $content[0].appendChild(node);
        });

//        // Get the matches
//        var text = $content.text();
//        var match;
//        var newText;
//
//        // Add a tags around each match
//        match = this.regex.exec(text);
//        if (match !== null) {
//
//            // Create the annotation and process it
//            var $annotation = $("<span class='annotation'>" + match[0] + "</span>");
//            if (filter) {
//                $annotation = filter($annotation, this.data);
//            }
//
//            // Replace the html with the annotated html
//            newText = text.split(this.regex);
//            $content.html(newText[0]).append($annotation).append(newText[1]);
//        }
    };

    TextAnnotation.prototype.isEqualTo = function(annotation) {
        var regexMatch = this.regex.source === annotation.regex.source;
        var dataMatch = this.data.type === annotation.data.type && this.data.value === annotation.data.value;
        return regexMatch && dataMatch;
    };

    return TextAnnotation;
}());