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
                break;
            case 3:
                if (showTranscript(args)) {
                    panes = ContentLayoutManager.twoPanel($(args.holder), ["Definitions", "Transcript"]);
                    layout = {
                        $player: panes.$player,
                        $definitions: panes.Definitions.$content,
                        $definitionsTab: panes.Definitions.$tab,
                        $transcript: panes.Transcript.$content
                    };
                } else {
                    panes = ContentLayoutManager.twoPanel($(args.holder), ["Definitions"]);
                    layout = {
                        $player: panes.$player,
                        $definitions: panes.$Definitions
                    };
                }
                break;
            case 4:
                if (showTranscript(args)) {
                    panes = ContentLayoutManager.twoPanel($(args.holder), ["Definitions", "Transcript", "Annotations"]);
                    layout = {
                        $player: panes.$player,
                        $definitions: panes.Definitions.$content,
                        $definitionsTab: panes.Definitions.$tab,
                        $annotations: panes.Annotations.$content,
                        $annotationsTab: panes.Annotations.$tab,
                        $transcript: panes.Transcript.$content
                    };
                } else {
                    panes = ContentLayoutManager.twoPanel($(args.holder), ["Definitions", "Annotations"]);
                    layout = {
                        $player: panes.$player,
                        $definitions: panes.Definitions.$content,
                        $definitionsTab: panes.Definitions.$tab,
                        $annotations: panes.Annotations.$content,
                        $annotationsTab: panes.Annotations.$tab
                    };
                }
        }

        return layout;
    }

    function createTranslator(args) {
        if (getLevel(args) >= 3) {
            // Create the translator
            var translator = new TextTranslator();
            translator.addTranslationEngine(arcliteTranslationEngine, 1);
            translator.addTranslationEngine(wordReferenceTranslationEngine, 2);
            translator.addTranslationEngine(googleTranslationEngine, 3);

            // Add translation listeners
            translator.addTranslationListener(function (event) {

                var sourceText = event.sourceText;
                var translations = event.translations;
                var engine = event.engine;

                var html =
                    '<div class="translationResult">' +
                        '<div class="sourceText">' + sourceText + '</div>' +
                        '<div class="translations">' + translations.join(", ") + '</div>' +
                        '<div class="engine">' + engine + '</div>' +
                    '</div>';
                args.layout.$definitions.append(html);

                if (args.layout.$definitionsTab) {
                    args.layout.$definitionsTab.tab("show");
                }
            });

            return translator;
        }
        return null;
    }

    function createAnnotator(args) {

        if (getLevel(args) >= 4) {

            return new TextAnnotator({
                manifests: args.manifests,
                filter: function ($annotation, data) {
                    $annotation.click(function() {
                        if (data.type === "text") {
                            args.layout.$annotations.html(data.value);
                        }

                        if (data.type === "image") {
                            args.layout.$annotations.html('<img src="' + data.value + '">');
                        }

                        args.layout.$annotationsTab.tab("show");
                    });
                    return $annotation;
                }
            });
        }
        return null;
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
                captions: captions,
                renderCue: function (cue) {
                    var node = document.createElement('div');
                    node.appendChild(cue.getCueAsHTML(cue.track.kind==='subtitles'));

                    // Attach the translator
                    if (args.translator) {
                        args.translator.attach(node, cue.track.language, "en");
                    }

                    // Add annotations
                    if (args.annotator) {
                        args.annotator.annotate($(node));
                    }

                    return {node:node};
                }
            });

            callback(videoPlayer);
        });
    }

    function setupTranscripts(args) {
        if (showTranscript(args)) {
            var transcriptDisplay = new TranscriptDisplay({
                transcripts: args.transcripts,
                $holder: args.layout.$transcript,
                filter: function (cue, $cue) {

                    // Attach the translator
                    if (args.translator) {
                        args.translator.attach($cue[0], cue.track.language, "en");
                    }

                    // Add annotations
                    if (args.annotator) {
                        args.annotator.annotate($cue);
                    }
                }
            });
            transcriptDisplay.bindToMediaPlayer(args.videoPlayer);
            return transcriptDisplay;
        }
        return null;
    }

    return {
        render: function (args) {

            // Load the caption tracks
            ContentRenderer.getTranscripts(args, function (transcripts) {
                args.transcripts = transcripts;

                // Load the annotations
                ContentRenderer.getAnnotations(args, function (manifests) {
                    args.manifests = manifests;

                    // Create the layout
                    args.layout = createLayout(args);

                    // Create the translator
                    args.translator = createTranslator(args);

                    // Create the annotator
                    args.annotator = createAnnotator(args);

                    // Set up the video player
                    setupVideoPlayer(args, function (videoPlayer) {
                        args.videoPlayer = videoPlayer;

                        // Set up the transcription
                        setupTranscripts(args);

                        if (args.callback) {
                            args.callback();
                        }
                    });
                })
            });
        }
    };
}());