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
        this.e = document.createElement("div");
    }

    TextAnnotation.prototype.annotate = function (content, filter) {
        var nodes = [];
        var _this = this;
        for (var i=0; i<content.childNodes().length; i += 1) {
            var node = content.childNodes().item(i);
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
                            var annotation = document.createElement('span');
                            annotation.className = 'annotation';
                            annotation.innerHTML = match[0];

                            // Create and dispatch an event when clicked
                            annotation.addEventListener('click', function(){
                                var event = document.createEvent("HTMLEvents");
                                event.initEvent("textAnnotationClick", true, true);
                                event.annotation = _this;
                                event.sourceElement = this;
                                _this.e.dispatchEvent(event);
                            }, false);

                            if(typeof filter === 'function'){
                                filter(annotation, this);
                            }

                            nodes.push(annotation);
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
        while (content.firstChild) {
            content.removeChild(content.firstChild);
        }

        // Now add everything back
        nodes.forEach(function (node) {
            content.appendChild(node);
        });
    };

    TextAnnotation.prototype.isEqualTo = function(annotation) {
        var regexMatch = this.regex.source === annotation.regex.source;
        var dataMatch = this.data.type === annotation.data.type && this.data.value === annotation.data.value;
        return regexMatch && dataMatch;
    };

    TextAnnotation.prototype.addEventListener = function(event, callback) {
        this.e.addEventListener(event, callback);
    };

    return TextAnnotation;
}());