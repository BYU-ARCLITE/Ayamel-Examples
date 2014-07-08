/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/10/13
 * Time: 3:39 PM
 * To change this template use File | Settings | File Templates.
 */
var AnnotationTextEditor = (function() {

    function loadTracks(content, callback) {
        // TODO: Determine which course we're operating in
        ResourceLibrary.load(content.resourceId).then(function(resource){
            ContentRenderer.getTranscripts({
                courseId: 0,
                contentId: content.id,
                resource: resource,
                permission: "view"
            }, function(transcripts) {
                Promise.all(transcripts.map(function(transcript){
                    return new Promise(function(resolve){
						Ayamel.utils.loadCaptionTrack(transcript, resolve);
					});
                }).then(callback);
            });
        });
    }

    /* args: manifest, content, holder, popupEditor */
    function AnnotationTextEditor(args) {

        /*
         * Text annotation
         */
        var activeAnnotation = null;
        var textAnnotator = new TextAnnotator(
            [args.manifest],
            function (element, annotation) {
                element.addEventListener('click', function(){
                    args.popupEditor.show();
                    args.popupEditor.annotation = annotation;
                    activeAnnotation = annotation;
                }, false);
            }
        );
        var renderAnnotations = function(){};


        function setupTextAnnotations(element) {
            textAnnotator.annotate(element);

            // Have highlighting create annotations
            element.addEventListener('mouseup', function(event){
                // Get the text selection
                var text = window.getSelection().toString().trim();

                // Create an annotation if not empty
                if (text !== '') {
                    var regex = new RegExp(text);
                    var annotation = new TextAnnotation(regex, {type: "text", value: ""});
                    args.manifest.annotations.push(annotation);

                    // Rerender the annotations
                    renderAnnotations();
                }
            }, false);
        }

        /*
         * Text display area
         */
        if (args.content.contentType === "text") {
            // Render the text content
            renderAnnotations = function() {
                ResourceLibrary.load(args.content.resourceId, function(resource) {
                    TextRenderer.render({
                        courseId: 0,
                        contentId: args.content.id,
                        resource: resource,
                        holder: args.holder,
                        annotate: false,
                        txtcallback: function(layout) {
                            setupTextAnnotations(layout.textHolder);
                        }
                    });
                });
            };
            renderAnnotations();
        } else {
            // Render the transcripts in a transcript player
            loadTracks(args.content, function(tracks) {
                var transcriptPlayer = new TranscriptPlayer({
                    holder: args.holder,
                    captionTracks: tracks,
                    syncButton: true
                    /* filter: function(cue, $cue) {
                        setupTextAnnotations($cue);
                    } */
                });
                renderAnnotations = function() {
                    transcriptPlayer.update();
                }
            });
        }

        /*
         * Interaction with popup editor
         */
        args.popupEditor.on("update", function() {
            activeAnnotation = args.popupEditor.annotation;
            renderAnnotations();
        });
        args.popupEditor.on("delete", function() {
            var index = args.manifest.annotations.indexOf(activeAnnotation);
            args.manifest.annotations.splice(index, 1);
            renderAnnotations();
        });
    }

    return AnnotationTextEditor;
})();