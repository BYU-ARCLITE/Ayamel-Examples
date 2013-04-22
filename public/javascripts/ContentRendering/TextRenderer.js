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

                        if (args.callback) {
                            args.callback(args);
                        }
                    }
                });
            });
        }
    };
}());