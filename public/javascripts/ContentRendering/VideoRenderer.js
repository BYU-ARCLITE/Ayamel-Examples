/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/19/13
 * Time: 12:24 PM
 * To change this template use File | Settings | File Templates.
 */
var VideoRenderer = (function() {

    function getLevel(args) {
        var levelAttr = args.coursePrefix + "level";
        var courseLevel = args.content.settings[levelAttr] || "1";
        var globalLevel = args.content.settings.level || "1";
        return Math.min(+courseLevel, +globalLevel);
    }

    function showTranscript(args) {
        return args.content.settings.includeTranscriptions && args.content.settings.includeTranscriptions === "true";
    }

    function createLayout(args) {

        var panes;
        var layout;

        switch (getLevel(args)) {
            case 1:
                layout = ContentLayoutManager.onePanel($(args.holder));
                break;
            case 2:
                if (showTranscript(args)) {
                    panes = ContentLayoutManager.twoPanel($(args.holder), ["Transcript"]);
                    layout = {
                        $player: panes.$player,
                        $transcript: panes.$Transcript
                    };
                } else {
                    layout = ContentLayoutManager.onePanel($(args.holder));
                }
        }

        return layout;
    }

    function setupVideoPlayer(args, callback) {
        Ayamel.AddVideoPlayer(h5PlayerInstall, 1, function() {

            var components = ["play", "volume", "fullScreen"];
            var captions;

            if (getLevel(args) >= 2) {
                components.push("captions");
                captions = args.transcripts;
            }

            // Create the player
            var videoPlayer = new Ayamel.VideoPlayer({
                element: args.layout.$player[0],
                aspectRatio: 45,
                resource: args.resource,
                components: components,
                captions: captions
            });

            callback(videoPlayer);
        });
    }

    function setupTranscripts(args) {
        var transcriptDisplay = new TranscriptDisplay({
            transcripts: args.transcripts,
            $holder: args.layout.$transcript
        });
        transcriptDisplay.bindToMediaPlayer(args.videoPlayer);
        return transcriptDisplay;
    }

    return {
        render: function (args) {

            // Load the caption tracks
            ContentRenderer.getTranscripts(args, function (transcripts) {
                args.transcripts = transcripts;

                // Load the annotations
                ContentRenderer.getAnnotations(args, function (annotations) {
                    args.annotations = annotations;

                    // Create the layout
                    args.layout = createLayout(args);

                    // Set up the video player
                    setupVideoPlayer(args, function (videoPlayer) {
                        args.videoPlayer = videoPlayer;

                        // Set up the transcription
                        setupTranscripts(args, function() {

                            if (args.callback) {
                                args.callback();
                            }

                        });
                    });
                })
            });
            var file = ContentRenderer.findFile(args.resource, function (file) {
                return file.representation === "original";
            });
        }
    };
}());