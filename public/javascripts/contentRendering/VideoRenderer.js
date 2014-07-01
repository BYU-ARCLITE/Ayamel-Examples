/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/19/13
 * Time: 12:24 PM
 * To change this template use File | Settings | File Templates.
 */

var VideoRenderer = (function(){

    var videoPlayer,
        trackResourceMap,
        translationHighlight,
        captionTrackId,
        cueNumber,
        destLang = "en";

    function getLevel(content) {
        return +content.settings.level || 1;
    }

    function showTranscript(content) {
        return content.settings.includeTranscriptions === "true";
    }

    function createLayout(content, holder) {
        var panes;

        switch (getLevel(content)) {
        default:
        case 1:
            return ContentLayoutManager.onePanel(holder);
        case 2:
            if (showTranscript(content)) {
                panes = ContentLayoutManager.twoPanel(holder, ["Transcript"]);
                return {
                    $player: panes.$player,
                    $transcript: panes.$Transcript
                };
            }
            return ContentLayoutManager.onePanel(holder);
        case 3:
            if (showTranscript(content)) {
                panes = ContentLayoutManager.twoPanel(holder, ["Transcript", "Definitions"]);
                return {
                    $player: panes.$player,
                    $definitions: panes.Definitions.$content,
                    $definitionsTab: panes.Definitions.$tab,
                    $transcript: panes.Transcript.$content
                };
            }
            panes = ContentLayoutManager.twoPanel(holder, ["Definitions"]);
            return {
                $player: panes.$player,
                $definitions: panes.$Definitions
            };
        case 4:
        case 5:
            if (showTranscript(content)) {
                panes = ContentLayoutManager.twoPanel(holder, ["Transcript", "Definitions", "Annotations"]);
                return {
                    $player: panes.$player,
                    $definitions: panes.Definitions.$content,
                    $definitionsTab: panes.Definitions.$tab,
                    $annotations: panes.Annotations.$content,
                    $annotationsTab: panes.Annotations.$tab,
                    $transcript: panes.Transcript.$content
                };
            }
            panes = ContentLayoutManager.twoPanel(holder, ["Definitions", "Annotations"]);
            return {
                $player: panes.$player,
                $definitions: panes.Definitions.$content,
                $definitionsTab: panes.Definitions.$tab,
                $annotations: panes.Annotations.$content,
                $annotationsTab: panes.Annotations.$tab
            };
        }
    }

    function createTranslator(content, layout) {
        var translator;
        if (getLevel(content) >= 3) {
            translator = new Ayamel.utils.Translator(translationEndpoint,translationKey);

            // Add translation listeners
            // Translation started
            translator.addEventListener("translate", function(event) {
                var detail = event.detail,
                    data = detail.data;
                ActivityStreams.predefined[data.sourceType](data.captionTrackId, data.cueIndex, detail.text);
                videoPlayer.pause();
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
                            + '<div class="merriamLogo"><a href="http://www.spanishcentral.com/translate/'
                            + detail.text + '" target="Merriam-Webster"> <img src="' + logoURL + '"></img></a></div>';
                    }
                    if ((src==="en") && (dest==="en")) {
                        return '<a href="http://www.merriam-webster.com/dictionary/' + detail.text + '" target="Merriam-Webster">'
                            + detail.text +' at Merriam-Webster.com </a>'
                            + '<br/> Merriam-Webster\'s Collegiate® Dictionary <br/>'
                            + '<div class="merriamLogo"><a href="http://www.merriam-webster.com/dictionary/'
                            + detail.text + '" target="Merriam-Webster"><img src="' + logoURL + '"></img></a></div>';
                    }
                }
                return engine;
            }

            // Translation succeeded
            translator.addEventListener("translation", function(event){
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

                layout.$definitions.append($html);
                layout.$definitions[0].scrollTop = layout.$definitions[0].scrollHeight;

                if (layout.$definitionsTab) {
                    layout.$definitionsTab.tab("show");
                    layout.$definitions[0].scrollTop = layout.$definitions[0].scrollHeight;
                }
            });

            // Handle errors
            translator.addEventListener("error", function (event) {
                alert("We couldn't translate \"" + event.detail.text + "\" for you.");
            });

            return translator;
        }
        return null;
    }

    function createAnnotator(content, layout, manifests) {

        if (getLevel(content) >= 4) {
            var textAnnotator = new TextAnnotator(manifests,null);
            textAnnotator.addEventListener("textAnnotationClick", function (event) {

                videoPlayer.pause();

                if (event.annotation.data.type === "text") {
                    layout.$annotations.html(event.annotation.data.value);
                }

                if (event.annotation.data.type === "image") {
                    layout.$annotations.html('<img src="' + event.annotation.data.value + '">');
                }

                if (event.annotation.data.type === "content") {
                    ContentCache.load(event.annotation.data.value, function(content) {

                        // Don't allow annotations, level 3+, transcriptions, or certain controls
                        content.settings.level = 2;
                        content.settings.includeTranscriptions = false;

                        ContentRenderer.render({
                            content: content,
                            holder: layout.$annotations[0],
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
                manifests.forEach(function (manifest) {
                    manifest.annotations.forEach(function (annotation) {
                        if (annotation.isEqualTo(event.annotation))
                            annotationDocId = manifest.resourceId;
                    });
                });
                ActivityStreams.predefined.viewTextAnnotation(annotationDocId, event.sourceElement.textContent);

                layout.$annotationsTab.tab("show");

            });
            return textAnnotator;
        }
        return null;
    }

    /* args: components, transcripts, content, screenAdaption, layout, resource,
        startTime, endTime, renderCue, translator, annotator, captionTrackCallback, */
    function setupVideoPlayer(args, callback) {
        try{

            var components = args.components || {
                left: ["play", "lastCaption", "volume", "captions"],
                right: ["rate", "fullScreen", "timeCode"]
            };
            var captions = args.transcripts;

            if (getLevel(args.content) === 1) {
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
            if (args.screenAdaption && args.screenAdaption.fit) {
                ScreenAdapter.containByHeight(args.layout.$player, Ayamel.aspectRatios.hdVideo, args.screenAdaption.padding);
                //TODO: Dynamically check the actual control bar height
                args.layout.$player.css("padding-bottom","61px"); // padding for the control bar
            }

            // Deactivate Space Features and set focus video to play/pause video
            window.addEventListener("keydown", function(e) {
                if (e.keyCode == 32 && document.querySelectorAll('input:focus').length === 0) {
                    // There may be a better way to do this
                    document.querySelector(".videoBox").firstChild.focus();
                    e.preventDefault();
                }
            });

             window.onresize = function(event) {
                if (args.screenAdaption && args.screenAdaption.fit && !Ayamel.utils.FullScreen.isFullScreen) {
                    ScreenAdapter.containByHeight(args.layout.$player, Ayamel.aspectRatios.hdVideo, args.screenAdaption.padding);
                    $(".videoBox").height(args.layout.$player.height());
                    $(".transcriptContent").css("max-height", $(".ayamelPlayer").height()-($("#videoTabs").height() + 57));

                    $("#Definitions, #Annotations").css("height", $(".ayamelPlayer").height()-($("#videoTabs").height() + 27));
                    $(" #Definitions, #Annotations").css("max-height", $(".ayamelPlayer").height()-($("#videoTabs").height() + 27));
                }
            };

            videoPlayer = new Ayamel.classes.AyamelPlayer({
                components: components,
                $holder: args.layout.$player,
                resource: args.resource,
                captionTracks: captions,
    //            components: components,
                startTime: args.startTime,
                endTime: args.endTime,
                renderCue: args.renderCue || function (renderedCue, area) { // Check to use a different renderer
                    var trackID,
                        cue = renderedCue.cue,
                        txt = new Ayamel.Text({
                            content: cue.getCueAsHTML(renderedCue.kind === 'subtitles')
                        });

                    // Attach the translator
                    if (args.translator) {
                        trackID = trackResourceMap?trackResourceMap.get(renderedCue.cue.track).id:
                            "Unknown";
                        txt.addEventListener('selection',function(event){
                            args.translator.translate({
                                srcLang: cue.track.language,
                                destLang: destLang,
                                text: event.detail.fragment.textContent.trim(),
                                data: {
                                    captionTrackId: trackID,
                                    cueIndex: renderedCue.cue.id,
                                    sourceType: "captionTranslation" //"transcriptionTranslation":
                                }
                            });
                        },false);
                    }

                    // Add annotations
                    if (args.annotator) {
                        //Yuck
                        args.annotator.annotate(txt.displayElement);
                    }

                    renderedCue.node = txt.displayElement;
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
        }catch(e){
            alert("Error: "+e.message);
        }
    }

    function setupTranscripts(content, layout, captionTracks) {
        if (showTranscript(content)) {
            var transcriptPlayer = new TranscriptPlayer({
                //requires the actual TextTrack objects; should be fixed up to take resource IDs, I think
                captionTracks: captionTracks,
                holder: layout.$transcript[0],
                syncButton: true
                //noUpdate: args.noUpdate
                //TODO: Add links to translator & annotator
            });

            // Cue clicking
            transcriptPlayer.addEventListener("cueclick", function(event){
                var trackID = trackResourceMap?trackResourceMap.get(event.detail.track).id:
                    "Unknown";

                videoPlayer.currentTime = event.detail.cue.startTime;
                ActivityStreams.predefined.transcriptCueClick(trackID, event.detail.cue.id);
            });

            return transcriptPlayer;
        }
        return null;
    }

    function setupDefinitionsPane($pane){
        var selectHolder = document.createElement('div');
        (new EditorWidgets.SuperSelect({
            el: selectHolder,
            data:{
                id: 'transLang',
                selection: 'eng',
                icon: 'icon-globe',
                text: 'Select Language',
                multiple: false,
                options: Object.keys(Ayamel.utils.p1map).map(function(p1){
                    var code = Ayamel.utils.p1map[p1];
                    return {value: code, text: Ayamel.utils.getLangName(code)};
                }).sort(function(a,b){ return a.text.localeCompare(b.text); })
            }
        })).observe('selection', function(newValue){ destLang = newValue; });
        $pane.append(selectHolder);
    }

    return {
        /* args: resource, content, courseId, contentId, holder, components,
            screenAdaption, startTime, endTime, renderCue, permission, vidcallback */
        render: function(args) {
            // Load the caption tracks
            ContentRenderer.getTranscripts({
                resource: args.resource,
                courseId: args.courseId,
                contentId: args.contentId,
                permission: args.permission
            }, function(transcripts) {

                // Load the annotations
                ContentRenderer.getAnnotations({
                    resource: args.resource,
                    courseId: args.courseId,
                    contentId: args.contentId,
                    permission: args.permission
                }, function (manifests) {
                    var loaded = false,
                        layout = createLayout(args.content, args.holder),
                        translator = createTranslator(args.content, layout),
                        annotator = createAnnotator(args.content, layout, manifests),
                        transcriptPlayer = null;

                    // Set up the video player
                    setupVideoPlayer({
                        components: args.components,
                        content: args.content,
                        screenAdaption: args.screenAdaption,
                        resource: args.resource,
                        startTime: args.startTime,
                        endTime: args.endTime,
                        renderCue: args.renderCue,

                        layout: layout,
                        transcripts: transcripts,
                        translator: translator,
                        annotator: annotator,
                        captionTrackCallback: function(captionTracks, trm) {
                            trackResourceMap = trm;
                            transcriptPlayer = setupTranscripts(args.content, layout, captionTracks);
                            if(layout.$definitions){ setupDefinitionsPane(layout.$definitions); }
                            setupTranscriptWithPlayer();
                        }
                    }, function() {
                        setupTranscriptWithPlayer();

                        // Resize the panes' content to be correct size onload
                        $("#Definitions, #Annotations").css("height", $(".ayamelPlayer").height()-($("#videoTabs").height() + 27));
                        $("#Definitions, #Annotations").css("max-height", $(".ayamelPlayer").height()-($("#videoTabs").height() + 27));

                    });

                    function setupTranscriptWithPlayer() {
                        // Make sure that
                        //  1. The video player is loaded
                        //  2. The transcript player is loaded or you don't need it
                        //  3. We haven't already called the callback
                        var needsTranscript = (transcripts && transcripts.length && showTranscript(args.content));
                        var ready = videoPlayer &&
                            (transcriptPlayer || !needsTranscript) &&
                            !loaded;

                        if (ready) {
                            if (needsTranscript && transcriptPlayer) {
                                videoPlayer.addEventListener("timeupdate", function() {
                                    transcriptPlayer.currentTime = videoPlayer.currentTime;
                                });
                            }

                            if(typeof args.vidcallback === 'function'){
                                args.vidcallback(videoPlayer, transcriptPlayer);
                            }
                            loaded = true;
                        }
                    }
                });
            });
        }
    };
}());
