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
        ContentRenderer.getTranscripts({
            courseId: 0,
            content: content,
            documentType: "annotations"
        }, function(transcripts) {
            async.map(transcripts, function(transcript, asyncCallback) {
                Ayamel.utils.loadCaptionTrack(transcript, function (track) {
                    asyncCallback(null, track);
                });
            }, function (err, data) {
                callback(data);
            });
        });
    }

    function AnnotationTextEditor(args) {

        /*
         * Text annotation
         */
        var activeAnnotation = null;
        var textAnnotator = new TextAnnotator({
            manifests: [args.manifest],
            filter: function ($annotation, annotation) {
                $annotation.click(function () {
                    args.popupEditor.show($annotation);
                    args.popupEditor.annotation = annotation;
                    activeAnnotation = annotation;
                });
            }
        });
        var renderAnnotations = function(){};


        function setupTextAnnotations($element) {
            textAnnotator.annotate($element);

            // Have highlighting create annotations
            $element.mouseup(function (event) {
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
            });
        }

        /*
         * Text display area
         */
        if (args.content.contentType === "text") {
            // Render the text content
            renderAnnotations = function() {
                ContentRenderer.render({
                    content: args.content,
                    holder: args.$holder[0],
                    annotate: false,
                    callback: function(args) {
                        setupTextAnnotations(args.layout.$textHolder);
                    }
                });
            };
            renderAnnotations();
        } else {
            // Render the transcripts in a transcript player
            loadTracks(args.content, function(tracks) {
                var transcriptPlayer = new TranscriptPlayer2({
                    $holder: args.$holder,
                    captionTracks: tracks,
                    filter: function(cue, $cue) {
                        setupTextAnnotations($cue);
                    }
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