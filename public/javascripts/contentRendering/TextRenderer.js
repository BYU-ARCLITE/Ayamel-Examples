/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/19/13
 * Time: 11:01 AM
 * To change this template use File | Settings | File Templates.
 */
var TextRenderer = (function(){

    function createLayout(holder) {

        var panes = ContentLayoutManager.onePanel(holder);

        var textHolder = document.createElement('pre');
        textHolder.id = "textHolder";
        panes.$player.append(textHolder);
        return {
            textHolder: textHolder
        };
    }

    return {
        /* args: resource, courseId, contentId, holder, annotate, txtcallback */
        render: function(args) {

            // Load all important information
            var file = ContentRenderer.findFile(args.resource, function (file) {
                return file.representation.substring(0,8) === "original";
            });

            // Load annotations
            ContentRenderer.getAnnotations({
                resource: args.resource,
                courseId: args.courseId,
                contentId: args.contentId,
                permission: "view"
            }, function (manifests) {
                var url = file.downloadUri,
                    idx = url.indexOf('?'),
                    layout = createLayout(args.holder);

                if(idx === -1){ url += "?"; }
                else if(idx !== url.length-1){ url += '&nocache='; }
                url += Date.now().toString(36);

                // Load the text document
                $.ajax(file.downloadUri, {
                    success: function(text) {
                        layout.textHolder.textContent = text;

                        // Annotate the document
                        if (args.annotate) {
                            (new TextAnnotator(manifests, function(element, annotation){

                                // Show the annotations in a popover
                                var content = annotation.data.value;
                                if (annotation.data.type === "image") {
                                    content = '<img src="' + annotation.data.value + '">';
                                }
                                $(element).popover({
                                    placement: "bottom",
                                    html: true,
                                    title: element.textContent,
                                    content: content,
                                    container: "body",
                                    trigger: "hover"
                                });
                            })).annotate(layout.textHolder);
                        }

                        if (typeof args.txtcallback === 'function') {
                            args.txtcallback(layout);
                        }
                    }
                });
            });
        }
    };
}());