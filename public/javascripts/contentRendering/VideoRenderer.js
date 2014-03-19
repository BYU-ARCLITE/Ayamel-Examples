/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/19/13
 * Time: 12:24 PM
 * To change this template use File | Settings | File Templates.
 */
var VideoRenderer = (function () {

    var languageSelect;
    var translationHighlight,
        captionTrackId,
        cueNumber;

    function getLevel(args) {
        var levelAttr = args.coursePrefix + "level",
            courseLevel = +args.content.settings[levelAttr] || 1,
            globalLevel = +args.content.settings.level || 1;
        return Math.min(courseLevel, globalLevel);
    }

    function showTranscript(args) {
        return args.content.settings.includeTranscriptions && args.content.settings.includeTranscriptions === "true";
    }

    function createLayout(args) {
        var panes;

        switch (getLevel(args)) {
        default:
        case 1:
            return ContentLayoutManager.onePanel($(args.holder));
        case 2:
            if (showTranscript(args)) {
                panes = ContentLayoutManager.twoPanel($(args.holder), ["Transcript"]);
                return {
                    $player: panes.$player,
                    $transcript: panes.$Transcript
                };
            }
            return ContentLayoutManager.onePanel($(args.holder));
        case 3:
            if (showTranscript(args)) {
                panes = ContentLayoutManager.twoPanel($(args.holder), ["Transcript", "Definitions"]);
                return {
                    $player: panes.$player,
                    $definitions: panes.Definitions.$content,
                    $definitionsTab: panes.Definitions.$tab,
                    $transcript: panes.Transcript.$content
                };
            }
            panes = ContentLayoutManager.twoPanel($(args.holder), ["Definitions"]);
            return {
                $player: panes.$player,
                $definitions: panes.$Definitions
            };
        case 4:
        case 5:
            if (showTranscript(args)) {
                panes = ContentLayoutManager.twoPanel($(args.holder), ["Transcript", "Definitions", "Annotations"]);
                return {
                    $player: panes.$player,
                    $definitions: panes.Definitions.$content,
                    $definitionsTab: panes.Definitions.$tab,
                    $annotations: panes.Annotations.$content,
                    $annotationsTab: panes.Annotations.$tab,
                    $transcript: panes.Transcript.$content
                };
            }
            panes = ContentLayoutManager.twoPanel($(args.holder), ["Definitions", "Annotations"]);
            return {
                $player: panes.$player,
                $definitions: panes.Definitions.$content,
                $definitionsTab: panes.Definitions.$tab,
                $annotations: panes.Annotations.$content,
                $annotationsTab: panes.Annotations.$tab
            };
        }
    }

    function createTranslator(args) {
        var translator;
        if (getLevel(args) >= 3) {
            translator = new TextTranslator();

            // Add translation listeners
            // Translation started
            translator.addEventListener("translate", function (event) {
                var detail = event.detail,
                    data = detail.data,
                    activity = $(detail.sourceElement).hasClass("transcriptCue")?"transcriptionTranslation":"captionTranslation";
                ActivityStreams.predefined[activity](data.captionTrackId, data.cueIndex, detail.text);
            });

            function engineToHTML(detail){
                var logoURL,
                    engine = detail.engine,
                    src = Ayamel.utils.downgradeLangCode(detail.srcLang),
                    dest = Ayamel.utils.downgradeLangCode(detail.destLang);
                if(engine === "WordReference"){
                    return '<a href="http://www.wordreference.com/' +
                        src +
                        dest +
                        '/' + detail.text + '" target="wordreference">' +
                        detail.text + ' at WordReference.com</a> © WordReference.com';
                }
                if(engine === "Merriam-Webster Inc."){
                    logoURL="http://www.dictionaryapi.com/images/info/branding-guidelines/mw-logo-light-background-50x50.png";
                    if((src==="es") || (dest==="es")){
                        return '<a href="http://www.spanishcentral.com/translate/' + detail.text + '" target="Merriam-Webster">'
                            + detail.text +' at SpanishCentral.com </a>'
                            + '<br/>Merriam-Webster\'s Spanish-English Dictionary '
                            + '<div class="merriamLogo"> ' + url + ' <img src="' + logoURL + '"></img></a></div>';
                    }
                    if ((src==="en") && (dest==="en")) {
                        return '<a href="http://www.merriam-webster.com/dictionary/' + detail.text + '" target="Merriam-Webster">'
                            + detail.text +' at Merriam-Webster.com </a>'
                            + '<br/> Merriam-Webster\'s Collegiate® Dictionary <br/>'
                            + '<div class="merriamLogo">' + url + '<img src="' + logoURL + '"></img></a></div>';
                    }
                }
                return engine;
            }

            // Translation succeeded
            translator.addEventListener("translateSuccess", function (event) {
                var detail = event.detail,
                    translations = detail.translations,
                    wordList = !document.body.classList.contains("share")? // Only allow saving words if the user is logged in (not sharing)
                        '<div class="addToWordList"><button class="btn btn-small"><i class="icon-paste"></i> Add to Word List</button></div>':"",
                    $html = $('<div class="translationResult">\
                        <div class="sourceText">' + detail.text + '</div>\
                        <div class="translations">' + translations.join(",<br/>") + '</div>\
                        <div class="engine">' + engineToHTML(detail) + '</div>' + wordList +
                    '</div>');

                $html.find("button").click(function() {
                    var $addWord = $(this).parent();
                    $.ajax("/words", {
                        type: "post",
                        data: {
                            language: event.srcLang,
                            word: sourceText
                        },
                        success: function() {
                            $addWord.html("<span class='color-blue'>Added to word list.</span>");
                        },
                        error: function() {
                            alert("Error adding to word list");
                            $addWord.remove();
                        }
                    });
                });

                args.layout.$definitions.append($html);
                args.layout.$definitions[0].scrollTop = args.layout.$definitions[0].scrollHeight;

                if (args.layout.$definitionsTab) {
                    args.layout.$definitionsTab.tab("show");
                    args.layout.$definitions[0].scrollTop = args.layout.$definitions[0].scrollHeight;
                }
            });

            // Handle errors
            translator.addEventListener("translateError", function (event) {
                alert("We couldn't translate \"" + event.detail.text + "\" for you.");
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

                if (event.annotation.data.type === "content") {
                    ContentCache.load(event.annotation.data.value, function(content) {

                        // Don't allow annotations, level 3+, transcriptions, or certain controls
                        content.settings.level = 2;
                        content.settings.includeTranscriptions = false;

                        ContentRenderer.render({
                            content: content,
                            holder: args.layout.$annotations[0],
                            annotate: false,
                            screenAdaption: {
                                fit: false
                            },
                            aspectRatio: Ayamel.aspectRatios.hdVideo,
                            components: {
                                left: ["play"],
                                right: ["captions", "timeCode"]
                            }
                        });
                    });
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

        var components = args.components || {
            left: ["play", "lastCaption", "volume", "captions"],
            right: ["rate", "fullScreen", "timeCode"]
        };
        var captions = args.transcripts;

        if (getLevel(args) === 1) {
            ["left", "right"].forEach(function(side) {
                ["lastCaption", "captions"].forEach(function(control) {
                    var index = components[side].indexOf(control);
                    if (index >= 0)
                        components[side].splice(index, 1);
                });
            });
            captions = null;
        }

        // Set the priority of players
        Ayamel.prioritizedPlugins.video = ["html5", "flash", "brightcove", "youtube"];
        Ayamel.prioritizedPlugins.audio = ["html5"];

        // Make sure the element will be contained on the page if it's a video
        if (args.content.contentType === "video" && args.screenAdaption && args.screenAdaption.fit) {
            ScreenAdapter.containByHeight(args.layout.$player, Ayamel.aspectRatios.hdVideo, args.screenAdaption.padding);
        }

        var videoPlayer = new Ayamel.classes.AyamelPlayer({
            components: components,
            $holder: args.layout.$player,
            resource: args.resource,
            captionTracks: captions,
//            components: components,
            startTime: args.startTime,
            endTime: args.endTime,
            renderCue: args.renderCue || function (renderedCue, area) { // Check to use a different renderer
                var node = document.createElement('div');
                node.appendChild(renderedCue.cue.getCueAsHTML(renderedCue.  kind === 'subtitles'));

                // Attach the translator
                if (args.translator) {
                    var trackID = args.trackResource?
                        args.trackResource.get(renderedCue.cue.track).id:
                        "Unknown";
                    args.translator.attach(node, renderedCue.language, Ayamel.utils.downgradeLangCode(languageSelect.get("selection")), {
                        captionTrackId: trackID,
                        cueIndex: renderedCue.cue.id
                    });
                }

                // Add annotations
                if (args.annotator) {
                    args.annotator.annotate($(node));
                }

                renderedCue.node = node;
            },
            aspectRatio: Ayamel.aspectRatios.hdVideo,
            captionTrackCallback: args.captionTrackCallback
        });

        if (args.screenAdaption && args.screenAdaption.scroll) {
            videoPlayer.addEventListener("durationchange", function () {
                // The video is loaded. Scroll the window to see it
                if (!ScreenAdapter.isEntirelyVisible(args.layout.$player, args.screenAdaption.padding)) {
                    ScreenAdapter.scrollTo(args.layout.$player.offset().top - 10);
                }
            });
        }

        var registerPlay = true;
        videoPlayer.addEventListener("play", function (event) {
            // Sometimes two events appear, so only save one within a half second
            if (registerPlay) {
                var time = "" + videoPlayer.currentTime;
                ActivityStreams.predefined.playClick(time);
                registerPlay = false;
                setTimeout(function(){ registerPlay = true;}, 500);
            }
        });
        videoPlayer.addEventListener("pause", function (event) {
            var time = "" + videoPlayer.currentTime;
            ActivityStreams.predefined.pauseClick(time);
        });

        // Save the video player to the global context so we can access it from other places
        window.ayamelPlayer = videoPlayer;

        callback(videoPlayer);
//        });
    }

    function setupTranscripts(args) {
        if (showTranscript(args)) {
            var transcriptPlayer = new TranscriptPlayer({
                //requires the actual TextTrack objects; should be fixed up to take resource IDs, I think
                captionTracks: args.captionTracks,
                $holder: args.layout.$transcript,
                syncButton: true,
                noUpdate: args.noUpdate,
                filter: function(cue, $cue) {
                    // Attach the translator
                    if (args.translator) {
                        args.translator.attach($cue[0], cue.track.language, Ayamel.utils.downgradeLangCode(languageSelect.get("selection")), {
                            captionTrackId: args.trackResource.get(cue.track).id,
                            cueIndex: cue.track.cues.indexOf(cue)
                        });
                    }

                    // Add annotations
                    if (args.annotator) {
                        args.annotator.annotate($cue);
                    }
                }
            });

            // Cue clicking
            transcriptPlayer.addEventListener("cueclick", function(event){
                var trackID = args.trackResource?
                    args.trackResource.get(event.detail.track).id:
                    "Unknown";

                args.videoPlayer.currentTime = event.detail.cue.startTime;
                ActivityStreams.predefined.transcriptCueClick(trackID, event.detail.cue.id);
            });

            return transcriptPlayer;
        }
        return "nothing";
    }

    function setupDefinitionPane($pane){
        var selectHolder = document.createElement('div');
        //this sets a module-global variable
        languageSelect = new EditorWidgets.SuperSelect({
            el: selectHolder,
            data:{
                id: 'transLang',
                selection: 'eng',
                icon: 'icon-globe',
                text: 'Select Language',
                multiple: false,
                options: Object.keys(Ayamel.utils.p1map).map(function (p1) {
                    var code = Ayamel.utils.p1map[p1];
                    return {value: code, text: Ayamel.utils.getLangName(code)};
                }).sort(function(a,b){ return a.text.localeCompare(b.text); })
            }
        });
        $pane.append(selectHolder);
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

                    var loaded = false;
                    function setupTranscriptWithPlayer(args) {
                        // Make sure that
                        //  1. The video player is loaded
                        //  2. The transcript player is loaded or you don't need it
                        //  3. We haven't already called the callback
                        var needsTranscript = (args.transcripts && args.transcripts.length && showTranscript(args));
                        var ready = args.videoPlayer &&
                            (args.transcriptPlayer || !needsTranscript) &&
                            !loaded;

                        if (ready) {
                            if (needsTranscript && args.transcriptPlayer && args.transcriptPlayer !== "nothing") {
                                args.videoPlayer.addEventListener("timeupdate", function() {
                                    args.transcriptPlayer.currentTime = args.videoPlayer.currentTime;
                                });
                            }

                            if(typeof args.callback === 'function'){ args.callback(args); }
                            loaded = true;
                        }
                    }

                    // Prepare to create the Transcript when the video player is created
                    args.captionTrackCallback = function(tracks, trackResource) {
                        args.captionTracks = tracks;
                        args.trackResource = trackResource;
                        args.transcriptPlayer = setupTranscripts(args);

                        if(args.layout.$definitions){
                            setupDefinitionsPane(args.layout.$definitions);
                        }

                        setupTranscriptWithPlayer(args);

                    };

                    // Set up the video player
                    setupVideoPlayer(args, function (videoPlayer) {
                        args.videoPlayer = videoPlayer;
                        setupTranscriptWithPlayer(args);
                    });
                });
            });
        }
    };
}());