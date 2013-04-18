var ContentRenderer = (function () {
    "use strict";

    var resourceLibraryUrl = "";
    var host = "";

    /*
     * =====================
     *    Helper functions
     */

    function findFile(resource, criteriaFunction) {
        for (var i = 0; i < resource.content.files.length; i++) {
            var file = resource.content.files[i];
            if (criteriaFunction(file)) {
                return file;
            }
        }
        return null;
    }

    function getTranscripts(content, resource, coursePrefix, callback) {
        resource.getTranscripts(function (transcripts) {

            // Filter the transcripts to only include those that are specified

            var allowedCaptionTracks = [];
            if (content.settings.enabledCaptionTracks) {
                allowedCaptionTracks = content.settings.enabledCaptionTracks.split(",");
            }

            var captionTracks = [];
            if (content.settings[coursePrefix + "enabledCaptionTracks"]) {
                captionTracks = content.settings[coursePrefix + "enabledCaptionTracks"].split(",");
            }
            transcripts = transcripts.filter(function (transcript) {
                return captionTracks.indexOf(transcript.id) >= 0 && allowedCaptionTracks.indexOf(transcript.id) >= 0;
            });
            callback(transcripts);
        });
    }

    function getAnnotations(content, resource, coursePrefix, callback) {
        // First get the annotation resources from the relations
        resource.getAnnotations(function (annotations) {

            // Filter the annotations to only include those that are specified
            var allowedAnnotationDocuments = [];
            if (content.settings.enabledAnnotationDocuments) {
                allowedAnnotationDocuments = content.settings.enabledAnnotationDocuments.split(",");
            }

            var annotationDocuments = [];
            if (content.settings[coursePrefix + "enabledAnnotationDocuments"]) {
                annotationDocuments = content.settings[coursePrefix + "enabledAnnotationDocuments"].split(",");
            }
            annotations = annotations.filter(function (annotationDoc) {
                return annotationDocuments.indexOf(annotationDoc.id) >= 0 && allowedAnnotationDocuments.indexOf(annotationDoc.id) >= 0;
            });

            // Load the annotation files
            // TODO: Look at other formats
            async.map(annotations, function (annotation, asyncCallback) {
                $.ajax(annotation.content.files[0].downloadUri, {
                    dataType: "json",
                    success: function(data) {
                        SimpleAnnotator.load(data, function(manifest) {
                            asyncCallback(null, manifest);
                        });
                    }
                })
            }, function (err, results) {
                callback(results);
            });
        });
    }

    function createRenderCue(translator, annotations) {
        return function (cue) {
            var node = document.createElement('div');
            node.appendChild(cue.getCueAsHTML(cue.track.kind==='subtitles'));

            // Attach the translator the the node
            // TODO: Handle languages correctly
            if (translator) {
                translator.attach(node, cue.track.language, "en");
            }

            // Add annotations
            if (annotations) {
                SimpleAnnotator.annotate(annotations, node, AnnotationRenderers.video);
            }

            return {node:node};
        };
    }

    function createTranslator(container, tab) {
        var translator = new TextTranslator(container, tab);
        translator.addTranslationEngine(arcliteTranslationEngine, 1);
        translator.addTranslationEngine(wordReferenceTranslationEngine, 2);
        translator.addTranslationEngine(googleTranslationEngine, 3);
        return translator;
    }

    function showTranscript(content) {
        return content.settings.includeTranscriptions && content.settings.includeTranscriptions === "true";
    }

    /*
     * =====================
     *    Image Rendering
     */

    function computeRenderedSize(image, $imgHolder) {
        if (image.width <= $imgHolder.width() && image.height <= $imgHolder.height()) {

            // Rendering the image as it is
            return {
                width: image.width,
                height: image.height
            }
        } else {

            // Figure out the scale factor
            var xScale = $imgHolder.width() / image.width;
            var yScale = $imgHolder.height() / image.height;
            var scale = Math.min(xScale, yScale);

            return {
                width: image.width * scale,
                height: image.height * scale
            }
        }
    }

    function renderImage(args) {
        var file = findFile(args.resource, function (file) {
            return file.representation === "original";
        });
        if (file === null) {
            $(args.holder).html("<em>There was an error displaying this content</em>");
        } else {

            // Create a container for the image
            var $imgHolder = $("<div id='imgHolder'></div>");
            $(args.holder).html($imgHolder);

            // Display the image
            var url = file.downloadUri;
            $imgHolder.css("background-image", "url('" + url + "')");

            // Load the image and check its dimensions to see if it is smaller than our display area. If so, change the
            // sizing of it.
            var img = new Image();
            img.src = url;
            img.onload = function () {
                if (this.width <= $imgHolder.width() && this.height <= $imgHolder.height()) {
                    $imgHolder.css("background-size", "initial");
                }

                if (args.annotate) {
                    // Add a container the exact size of the image for holding annotations
                    var size = computeRenderedSize(this, $imgHolder);
                    var $annotationHolder = $("<div id='annotationHolder'></div>").css("position", "absolute")
                        .width(size.width).height(size.height)
                        .css("top", ($imgHolder.height() - size.height) / 2)
                        .css("left", ($imgHolder.width() - size.width) / 2);
                    $imgHolder.append($annotationHolder);

                    // Add the annotations
                    getAnnotations(args.content, args.resource, args.coursePrefix, function (annotations) {
                        SimpleAnnotator.annotate(annotations, $annotationHolder, AnnotationRenderers.image);

                        if (args.callback) {
                            args.callback({
                                image: img,
                                $imgHolder: $imgHolder
                            });
                        }
                    });
                } else {
                    if (args.callback) {
                        args.callback({
                            image: img,
                            $imgHolder: $imgHolder
                        });
                    }
                }
            };
        }
    }

    /*
     * =====================
     *    Video Rendering
     */

    function renderVideoLevel1(args) {

        // Install the HTML5 video player
        var panes = VideoLayoutManager.onePanel($(args.holder));
        Ayamel.AddVideoPlayer(h5PlayerInstall, 1, function() {

            // Create the player
            var videoPlayer = new Ayamel.VideoPlayer({
                element: panes.$player[0],
                aspectRatio: 45,
                resource: args.resource
            });

            if (args.callback) {
                args.callback({
                    videoPlayer: videoPlayer
                });
            }
        });
    }

    function renderVideoLevel2(args) {
        // Load the transcripts
        getTranscripts(args.content, args.resource, args.coursePrefix, function(transcripts) {

            // Create the layout
            var panes;
            if (showTranscript(args.content)) {
                panes = VideoLayoutManager.twoPanel($(args.holder), ["Transcript"]);
            } else {
                panes = VideoLayoutManager.onePanel($(args.holder));
            }

            // Install the HTML 5 player
            Ayamel.AddVideoPlayer(h5PlayerInstall, 1, function() {

                // Create the player
                var videoPlayer = new Ayamel.VideoPlayer({
                    element: panes.$player[0],
                    aspectRatio: 45,
                    resource: args.resource,
                    components: ["play", "volume", "fullScreen", "captions"],
                    captions: transcripts
                });

                if (showTranscript(args.content)) {
                    TranscriptRenderer.add(transcripts, panes.$Transcript, videoPlayer);
                }

                if (args.callback) {
                    args.callback({
                        videoPlayer: videoPlayer
                    });
                }
            });
        });
    }

    function renderVideoLevel3(args) {
        // Load the transcripts
        getTranscripts(args.content, args.resource, args.coursePrefix,function(transcripts) {

            // Create the layout
            var panes;
            var $definitions;
            var $definitionsTab = null;
            if (showTranscript(args.content)) {
                panes = VideoLayoutManager.twoPanel($(args.holder), ["Definitions", "Transcription"]);
                $definitions = panes.Definitions.$content[0];
                $definitionsTab = panes.Definitions.$tab[0];
            } else {
                panes = VideoLayoutManager.twoPanel($(args.holder), ["Definitions"]);
                $definitions = panes.$Definitions[0];
            }

            // Create the translator
            var translator = createTranslator($definitions, $definitionsTab);

            // Install the HTML 5 player
            Ayamel.AddVideoPlayer(h5PlayerInstall, 1, function() {

                // Create the player
                var videoPlayer = new Ayamel.VideoPlayer({
                    element: panes.$player[0],
                    aspectRatio: 45,
                    resource: args.resource,
                    components: ["play", "volume", "fullScreen", "captions"],
                    captions: transcripts,
                    renderCue: createRenderCue(translator)
                });

                if (showTranscript(args.content)) {
                    TranscriptRenderer.add(transcripts, panes.Transcription.$content, videoPlayer, function ($cue, cue, language) {
                        if (language != "en") {
                            translator.attach($cue[0], language, "en");
                        }
                    });
                }

                if (args.callback) {
                    args.callback({
                        videoPlayer: videoPlayer
                    });
                }
            });
        });
    }

    function renderVideoLevel4(args) {
        // Load the transcripts
        getTranscripts(args.content, args.resource, args.coursePrefix,function(transcripts) {

            // Load the annotations
            getAnnotations(args.content, args.resource, args.coursePrefix, function (annotations) {

                // Create the layout
                var tabs = ["Definitions", "Annotations"];
                if (showTranscript(args.content)) {
                    tabs.push("Transcription");
                }
                var panes = VideoLayoutManager.twoPanel($(args.holder), tabs);

                // Create the translator
                var translator = createTranslator(panes.Definitions.$content[0], panes.Definitions.$tab[0]);

                // Initialize the annotation renderer
                AnnotationRenderers.init(panes.Annotations.$content, null, function () {
                    // Flip to the annotation tab
                    panes.Annotations.$tab.tab("show");
                });

                // Install the HTML 5 player
                Ayamel.AddVideoPlayer(h5PlayerInstall, 1, function() {

                    // Create the player
                    var videoPlayer = new Ayamel.VideoPlayer({
                        element: panes.$player[0],
                        aspectRatio: 45,
                        resource: args.resource,
                        components: ["play", "volume", "fullScreen", "captions"],
                        captions: transcripts,
                        renderCue: createRenderCue(translator, annotations)
                    });

                    // Create the transcription
                    if (showTranscript(args.content)) {
                        TranscriptRenderer.add(transcripts, panes.Transcription.$content, videoPlayer, function ($cue, cue, language) {
                            if (language != "en") {
                                translator.attach($cue[0], language, "en");
                            }
                            SimpleAnnotator.annotate(annotations, $cue[0], AnnotationRenderers.video)
                        });
                    }

                    if (args.callback) {
                        args.callback({
                            videoPlayer: videoPlayer
                        });
                    }
                });
            });
        });
    }

    function renderVideoLevel5(args) {
        $(args.holder).html("<em>Playback at this level has not been implemented yet.</em>");
    }

    function renderVideo(args) {
        // Render video
        var levelAttr = args.coursePrefix + "level";
        var courseLevel = args.content.settings[levelAttr] || "1";
        var globalLevel = args.content.settings.level || "1";
        var level = Math.min(+courseLevel, +globalLevel);
        switch (level) {
            case 1:
                renderVideoLevel1(args);
                break;
            case 2:
                renderVideoLevel2(args);
                break;
            case 3:
                renderVideoLevel3(args);
                break;
            case 4:
                renderVideoLevel4(args);
                break;
            case 5:
                renderVideoLevel5(args);
                break;
        }
    }

    function renderAudio(args) {
        var file = findFile(args.resource, function (file) {
            return file.representation === "original";
        });
        if (file === null) {
            $(args.holder).html("<em>There was an error displaying this content</em>");
        } else {

            // TODO: Add an audio player to the Ayamel.js player
            // Create the audio player
            var $audio = $('<audio id="player" controls="controls"></audio>');
            $(args.holder).html($audio);

            // Get the URL from the resource and add it as an audio source
            var url =  file.downloadUri;
            var mime = file.mime;
            $audio.append('<source src="' + url + '" type="' + mime + '">');

            if (args.callback) {
                args.callback();
            }
        }
    }

    function renderPlaylist(args) {
        PlaylistRenderer.render(content.resourceId, holder, callback);
    }

    function renderContent(args) {
        var resourceUrl = resourceLibraryUrl + "/" + args.content.resourceId;

        // Check if we are rendering something from the resource library
        if (args.content.contentType === "video" || args.content.contentType === "audio" || args.content.contentType === "image") {
            ResourceLibrary.load(resourceUrl, function (resource) {
                args.resource = resource;
                switch (resource.type) {
                    case "audio":
                        renderAudio(args);
                        break;
                    case "image":
                        renderImage(args);
                        break;
                    case "video":
                        renderVideo(args);
                        break;
                }
            });
        } else if (args.content.contentType === "playlist") {
            renderPlaylist(args);
        }
    }

    return {

        render: function (args) {
            args.coursePrefix = args.coursePrefix || "";

            if (typeof args.content == "object") {
                renderContent(args);
            }
            if (typeof args.content == "number") {
                $.ajax("/content/" + args.content + "/json", {
                    dataType: "json",
                    success: function (data) {
                        args.content = data;
                        renderContent(args);
                    }
                });
            }
        },

        setResourceLibraryUrl: function (url) {
            resourceLibraryUrl = url;
        }
    };
}());