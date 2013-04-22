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
                return file.representation === "original";
            });

            // Load annotations
            ContentRenderer.getAnnotations(args, function (manifests) {
                args.manifests = manifests;

                // Create the layout
                args.layout = createLayout(args);

                // Load the text document
                $.ajax(file.downloadUri, {
                    success: function(text) {
                        args.layout.$textHolder.text(text);

                        // Annotate the document
                        if (args.annotate) {
                            args.filter = function($annotation, data) {

                                // Show the annotations in a popover
                                var content = data.value;
                                if (data.type === "image") {
                                    content = '<img src="' + data.value + '">';
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
                            var translator = new TextAnnotator(args);
                            translator.annotate(args.layout.$textHolder);
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