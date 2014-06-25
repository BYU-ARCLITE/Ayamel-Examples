/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/19/13
 * Time: 11:01 AM
 * To change this template use File | Settings | File Templates.
 */
var TextRenderer = (function(){

    function createLayout(args) {

        var panes = ContentLayoutManager.onePanel($(args.holder));

        var $textHolder = $('<pre id="textHolder"></pre>');
        panes.$player.append($textHolder);
        return {
            $textHolder: $textHolder
        };
    }

    return {
        render: function(args) {

            // Load all important information
            var file = ContentRenderer.findFile(args.resource, function (file) {
                return file.representation.substring(0,8) === "original";
            });

            // Load annotations
            ContentRenderer.getAnnotations(args, function (manifests) {
                var url = file.downloadUri,
                    idx = url.indexOf('?');
                if(idx === -1){ url += "?"; }
                else if(idx !== url.length-1){ url += '&nocache='; }
                url += Date.now().toString(36);

                args.manifests = manifests;

                // Create the layout
                args.layout = createLayout(args);

                // Load the text document
                $.ajax(file.downloadUri, {
                    success: function(text) {
                        args.layout.$textHolder.text(text);

                        // Annotate the document
                        if (args.annotate) {
                            args.filter = function($annotation, annotation) {

                                // Show the annotations in a popover
                                var content = annotation.data.value;
                                if (annotation.data.type === "image") {
                                    content = '<img src="' + annotation.data.value + '">';
                                }
                                $annotation.popover({
                                    placement: "bottom",
                                    html: true,
                                    title: $annotation.text(),
                                    content: content,
                                    container: "body",
                                    trigger: "hover"
                                });
                            };
                            (new TextAnnotator(args)).annotate(args.layout.$textHolder);
                        }

                        if (args.callback) {
                            args.callback(args);
                        }
                    }
                });
            });
        }
    };
}());