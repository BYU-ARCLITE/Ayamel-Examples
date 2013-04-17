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

    function getTranscripts(content, resource, callback) {
        resource.getTranscripts(function (transcripts) {

            // Filter the transcripts to only include those that are specified
            var captionTracks = [];
            if (content.settings.enabledCaptionTracks) {
                captionTracks = content.settings.enabledCaptionTracks.split(",");
            }
            transcripts = transcripts.filter(function (transcript) {
                return captionTracks.indexOf(transcript.id) >= 0;
            });
            callback(transcripts);
        });
    }

    function getAnnotations(content, resource, callback) {
        // First get the annotation resources from the relations
        resource.getAnnotations(function (annotations) {

            // Filter the annotations to only include those that are specified
            var annotationDocuments = [];
            if (content.settings.enabledAnnotationDocuments) {
                annotationDocuments = content.settings.enabledAnnotationDocuments.split(",");
            }
            annotations = annotations.filter(function (annotationDoc) {
                return annotationDocuments.indexOf(annotationDoc.id) >= 0;
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

    function createTranslator($container) {
        var translator = new TextTranslator($container);
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

    function renderImage(content, resource, holder, callback, annotate) {
        var file = findFile(resource, function (file) {
            return file.representation === "original";
        });
        if (file === null) {
            $(holder).html("<em>There was an error displaying this content</em>");
        } else {

            // Create a container for the image
            var $imgHolder = $("<div id='imgHolder'></div>");
            $(holder).html($imgHolder);

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

                if (annotate) {
                    // Add a container the exact size of the image for holding annotations
                    var size = computeRenderedSize(this, $imgHolder);
                    var $annotationHolder = $("<div id='annotationHolder'></div>").css("position", "absolute")
                        .width(size.width).height(size.height)
                        .css("top", ($imgHolder.height() - size.height) / 2)
                        .css("left", ($imgHolder.width() - size.width) / 2);
                    $imgHolder.append($annotationHolder);

                    // Add the annotations
                    getAnnotations(content, resource, function (annotations) {
                        SimpleAnnotator.annotate(annotations, $annotationHolder, AnnotationRenderers.image);

                        if (callback) {
                            callback(this);
                        }
                    });
                } else {
                    if (callback) {
                        callback(this);
                    }
                }
            };
        }
    }

    /*
     * =====================
     *    Video Rendering
     */

    function renderVideoLevel1(resource, holder, callback) {

        // Install the HTML5 video player
        var panes = VideoLayoutManager.onePanel($(holder));
        Ayamel.AddVideoPlayer(h5PlayerInstall, 1, function() {

            // Create the player
            var videoPlayer = new Ayamel.VideoPlayer({
                element: panes.$player[0],
                aspectRatio: 45,
                resource: resource
            });

            if (callback) {
                callback(videoPlayer);
            }
        });
    }

    function renderVideoLevel2(content, resource, holder, callback) {
        // Load the transcripts
        getTranscripts(content, resource, function(transcripts) {

            // Create the layout
            var panes;
            if (showTranscript(content)) {
                panes = VideoLayoutManager.twoPanel($(holder), ["Transcript"]);
            } else {
                panes = VideoLayoutManager.onePanel($(holder));
            }

            // Install the HTML 5 player
            Ayamel.AddVideoPlayer(h5PlayerInstall, 1, function() {

                // Create the player
                var videoPlayer = new Ayamel.VideoPlayer({
                    element: panes.$player[0],
                    aspectRatio: 45,
                    resource: resource,
                    components: ["play", "volume", "fullScreen", "captions"],
                    captions: transcripts
                });

                if (showTranscript(content)) {
                    TranscriptRenderer.add(transcripts, panes.$Transcript, videoPlayer);
                }
            });
        });
    }

    function renderVideoLevel3(content, resource, holder, callback) {
        // Load the transcripts
        getTranscripts(content, resource, function(transcripts) {

            // Create the layout
            var panes;
            var $definitions;
            if (showTranscript(content)) {
                panes = VideoLayoutManager.twoPanel($(holder), ["Definitions", "Transcription"]);
                $definitions = panes.Definitions.$content[0];
            } else {
                panes = VideoLayoutManager.twoPanel($(holder), ["Definitions"]);
                $definitions = panes.Definitions.$Definitions[0];
            }

            // Create the translator
            var translator = createTranslator($definitions);

            // Install the HTML 5 player
            Ayamel.AddVideoPlayer(h5PlayerInstall, 1, function() {

                // Create the player
                var videoPlayer = new Ayamel.VideoPlayer({
                    element: panes.$player[0],
                    aspectRatio: 45,
                    resource: resource,
                    components: ["play", "volume", "fullScreen", "captions"],
                    captions: transcripts,
                    renderCue: createRenderCue(translator)
                });

                if (showTranscript(content)) {
                    TranscriptRenderer.add(transcripts, panes.Transcription.$content, videoPlayer);
                }
            });
        });
    }

    function renderVideoLevel4(content, resource, holder, callback, annotate) {
        // Load the transcripts
        getTranscripts(content, resource, function(transcripts) {

            // Load the annotations
            getAnnotations(content, resource, function (annotations) {

                // Create the layout
                var tabs = ["Definitions", "Annotations"];
                if (content.settings.includeTranscriptions && content.settings.includeTranscriptions === "true") {
                    tabs.push("Transcription");
                }
                var panes = VideoLayoutManager.twoPanel($(holder), tabs);

                // Create the translator
                var translator = createTranslator(panes.Definitions.$content[0]);

                // Initialize the annotation renderer
                AnnotationRenderers.init(panes.Annotations.$tab, panes.Annotations.$content);

                // Install the HTML 5 player
                Ayamel.AddVideoPlayer(h5PlayerInstall, 1, function() {

                    // Create the player
                    var videoPlayer = new Ayamel.VideoPlayer({
                        element: panes.$player[0],
                        aspectRatio: 45,
                        resource: resource,
                        components: ["play", "volume", "fullScreen", "captions"],
                        captions: transcripts,
                        renderCue: createRenderCue(translator, annotations)
                    });

                    // Create the transcription
                    if (content.settings.includeTranscriptions && content.settings.includeTranscriptions === "true") {
                        var $transcriptHolder = TranscriptRenderer.add(transcripts, panes.Transcription.$content, videoPlayer);
                    }
                });
            });
        });
    }

    function renderVideoLevel5(resource, holder, callback, annotate) {
        $(holder).html("<em>Playback at this level has not been implemented yet.</em>");
    }

    function renderVideo(content, resource, holder, callback, annotate) {
        // Render video
        var level = content.settings.level || "1";
        switch (level) {
            case "1":
                renderVideoLevel1(resource, holder, callback);
                break;
            case "2":
                renderVideoLevel2(content, resource, holder, callback);
                break;
            case "3":
                renderVideoLevel3(content, resource, holder, callback);
                break;
            case "4":
                renderVideoLevel4(content, resource, holder, callback, annotate);
                break;
            case "5":
                renderVideoLevel5(content, resource, holder, callback, annotate);
                break;
        }
    }

    function renderAudio(content, resource, holder, callback, annotate) {
        var file = findFile(resource, function (file) {
            return file.representation === "original";
        });
        if (file === null) {
            $(holder).html("<em>There was an error displaying this content</em>");
        } else {

            // TODO: Add an audio player to the Ayamel.js player
            // Create the audio player
            var $audio = $('<audio id="player" controls="controls"></audio>');
            $(holder).html($audio);

            // Get the URL from the resource and add it as an audio source
            var url =  file.downloadUri;
            var mime = file.mime;
            $audio.append('<source src="' + url + '" type="' + mime + '">');

            if (callback) {
                callback();
            }
        }
    }

    function renderPlaylist(content, holder, callback, annotate) {
        PlaylistRenderer.render(content.resourceId, holder, callback);
    }

    function renderContent(content, holder, callback, annotate) {
        var resourceUrl = resourceLibraryUrl + "/" + content.resourceId;

        // Check if we are rendering something from the resource library
        if (content.contentType === "video" || content.contentType === "audio" || content.contentType === "image") {
            ResourceLibrary.load(resourceUrl, function (resource) {
                switch (resource.type) {
                    case "audio":
                        renderAudio(content, resource, holder, callback, annotate);
                        break;
                    case "image":
                        renderImage(content, resource, holder, callback, annotate);
                        break;
                    case "video":
                        renderVideo(content, resource, holder, callback, annotate);
                        break;
                }
            });
        } else if (content.contentType === "playlist") {
            renderPlaylist(content, holder, callback, annotate);
        }
    }

    return {

        render: function (content, holder, callback, annotate) {
            if (typeof content == "object") {
                renderContent(content, holder, callback, annotate);
            }
            if (typeof content == "number") {
                $.ajax("/content/" + content + "/json", {
                    dataType: "json",
                    success: function (data) {
                        renderContent(data, holder, callback, annotate);
                    }
                });
            }
        },

        setResourceLibraryUrl: function (url) {
            resourceLibraryUrl = url;
        }
    };
}());