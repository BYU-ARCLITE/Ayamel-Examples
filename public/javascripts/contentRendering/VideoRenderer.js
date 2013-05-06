/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/19/13
 * Time: 12:24 PM
 * To change this template use File | Settings | File Templates.
 */
var VideoRenderer = (function () {

    var translationHighlight;
    var captionTrackId;
    var cueNumber;

    function getLevel(args) {
        var levelAttr = args.coursePrefix + "level";
        var courseLevel = args.content.settings[levelAttr] || "1";
        var globalLevel = args.content.settings.level || "1";
        return Math.min(+courseLevel, +globalLevel);
    }

    function showTranscript(args) {
        return args.content.settings.includeTranscriptions && args.content.settings.includeTranscriptions === "true";
    }

    function determineTranscriptFromCue(transcripts, cue) {
        var captionTrackId = "unknown";
        transcripts.forEach(function (transcript) {
            if (transcript.title === cue.track.label && transcript.language === cue.track.language)
                captionTrackId = transcript.id;
        });
        return captionTrackId;
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
            // Translation started
            translator.addEventListener("translate", function (event) {

                // Figure out where we are translating from
                if ($(event.sourceElement).hasClass("transcriptCue")) {
                    ActivityStreams.predefined.transcriptionTranslation(event.data.captionTrackId, event.data.cueIndex, event.text);
                } else {
                    ActivityStreams.predefined.captionTranslation(event.data.captionTrackId, event.data.cueIndex, event.text);
                }
            });

            // Translation succeeded
            translator.addEventListener("translateSuccess", function (event) {
                var sourceText = event.text;
                var translations = event.translations;
                var engine = event.engine;

                var html =
                    '<div class="translationResult">' +
                        '<div class="sourceText">' + sourceText + '</div>' +
                        '<div class="translations">' + translations.join(", ") + '</div>' +
                        '<div class="engine">' + engine + '</div>' +
                        '</div>';
                args.layout.$definitions.append(html);
                args.layout.$definitions[0].scrollTop = args.layout.$definitions[0].scrollHeight;

                if (args.layout.$definitionsTab) {
                    args.layout.$definitionsTab.tab("show");
                    args.layout.$definitions[0].scrollTop = args.layout.$definitions[0].scrollHeight;
                }
            });

            // Handle errors
            translator.addEventListener("translateError", function (event) {
                alert("We couldn't translate \"" + event.text + "\" for you.");
            });

            return translator;
        }
        return null;
    }

    function createAnnotator(args) {

        if (getLevel(args) >= 4) {
            var textAnnotator = new TextAnnotator({manifests: args.manifests});
            textAnnotator.addEventListener("textAnnotationClick", function (event) {
                if (event.annotation.data.type === "text") {
                    args.layout.$annotations.html(event.annotation.data.value);
                }

                if (event.annotation.data.type === "image") {
                    args.layout.$annotations.html('<img src="' + event.annotation.data.value + '">');
                }

                // Find the annotation doc
                var annotationDocId = "unknown";
                args.manifests.forEach(function (manifest) {
                    manifest.annotations.forEach(function (annotation) {
                        if (annotation.isEqualTo(event.annotation))
                            annotationDocId = manifest.resourceId;
                    });
                });
                ActivityStreams.predefined.viewTextAnnotation(annotationDocId, $(event.sourceElement).text());

                args.layout.$annotationsTab.tab("show");

            });
            return textAnnotator;
        }
        return null;
    }

    function setupVideoPlayer(args, callback) {
//        Ayamel.AddVideoPlayer(h5PlayerInstall, 1, function() {

        var components = [
            ["play", "volume"],
            ["fullScreen", "timeCode"]
        ];
        var captions;

        if (getLevel(args) >= 2) {
            components[0].push("captions");
            captions = args.transcripts;
        }

        // Set the priority of video players
        Ayamel.prioritizedPlugins = [
            Ayamel.mediaPlugins.html5Video,
            Ayamel.mediaPlugins.flashVideo,
            Ayamel.mediaPlugins.html5Audio,
            Ayamel.mediaPlugins.brightcove,
            Ayamel.mediaPlugins.youtube
        ];

        var videoPlayer = new Ayamel.classes.AyamelPlayer({
            $holder: args.layout.$player,
            resource: args.resource,
            captionTracks: captions,
            components: components,
            startTime: args.startTime,
            endTime: args.endTime,
            renderCue: function (cue) {
                var node = document.createElement('div');
                node.appendChild(cue.getCueAsHTML(cue.track.kind === 'subtitles'));

                // Attach the translator
                if (args.translator) {
                    args.translator.attach(node, cue.track.language, "en", {
                        captionTrackId: determineTranscriptFromCue(args.transcripts, cue),
                        cueIndex: "" + cue.track.cues.indexOf(cue)
                    });
                }

                // Add annotations
                if (args.annotator) {
                    args.annotator.annotate($(node));
                }

                return {node: node};
            }
        });

        var playCount = 0;
        videoPlayer.addEventListener("play", function (event) {
            // Two events are thrown, so only save on the second
            playCount = (playCount + 1) % 2;
            if (playCount) {
                var time = "" + videoPlayer.currentTime;
                ActivityStreams.predefined.playClick(time);
            }
        });
        videoPlayer.addEventListener("pause", function (event) {
            var time = "" + videoPlayer.currentTime;
            ActivityStreams.predefined.pauseClick(time);
        });

        callback(videoPlayer);
//        });
    }

    function setupTranscripts(args) {
        if (showTranscript(args)) {
            var transcriptDisplay = new TranscriptDisplay({
                transcripts: args.transcripts,
                $holder: args.layout.$transcript,
                filter: function (cue, $cue) {

                    // Attach the translator
                    if (args.translator) {
                        args.translator.attach($cue[0], cue.track.language, "en", {
                            captionTrackId: determineTranscriptFromCue(args.transcripts, cue),
                            cueIndex: cue.track.cues.indexOf(cue)
                        });
                    }

                    // Add annotations
                    if (args.annotator) {
                        args.annotator.annotate($cue);
                    }
                }
            });
            transcriptDisplay.bindToMediaPlayer(args.videoPlayer);

            transcriptDisplay.addEventListener("transcriptionTabChange", function (event) {
                console.log("Transcription tab change");
                console.log(event);
            });
            transcriptDisplay.addEventListener("transcriptionCueClick", function (event) {
                ActivityStreams.predefined.transcriptCueClick(event.transcript.id, event.cueIndex);
            });
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
                            args.callback(args);
                        }
                    });
                });
            });
        }
    };
}());