var ContentRenderer = (function () {
    "use strict";

    var resourceLibraryUrl = "";

    function findFile(resource, criteriaFunction) {
        for (var i = 0; i < resource.content.files.length; i++) {
            var file = resource.content.files[i];
            if (criteriaFunction(file)) {
                return file;
            }
        }
        return null;
    }

    /*
     * =====================
     *    Image Rendering
     */

    function renderImage(content, resource, holder, callback) {
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
                if (callback) {
                    callback(this);
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
        // TODO: Install other players

        var $player = $('<div id="player"></div>');
        $(holder).html($player);
        Ayamel.AddVideoPlayer(h5PlayerInstall, 1, function() {

            // Create the player
            var videoPlayer = new Ayamel.VideoPlayer({
                element: $player[0],
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
        resource.getTranscripts(function (transcripts) {

            // Filter the transcripts to only include those that are specified
            var captionTracks = [];
            if (content.settings.enabledCaptionTracks) {
                captionTracks = content.settings.enabledCaptionTracks.split(",");
            }
            transcripts = transcripts.filter(function (transcript) {
                return captionTracks.indexOf(transcript.id) >= 0;
            });

            // Install the HTML 5 player
            Ayamel.AddVideoPlayer(h5PlayerInstall, 1, function() {

                var $player = $('<div id="player"></div>');
                var videoPlayer;
                $(holder).html($player);

                // Create the player
                videoPlayer = new Ayamel.VideoPlayer({
                    element: $player.get(0),
                    aspectRatio: 45,
                    resource: resource,
                    components: ["play", "volume", "fullScreen", "captions"],
                    captions: transcripts
                });
            });
        });
    }

    function renderVideoLevel3(content, resource, holder, callback) {
        // Load the transcripts
        resource.getTranscripts(function (transcripts) {

            // Filter the transcripts to only include those that are specified
            var captionTracks = [];
            if (content.settings.enabledCaptionTracks) {
                captionTracks = content.settings.enabledCaptionTracks.split(",");
            }
            transcripts = transcripts.filter(function (transcript) {
                return captionTracks.indexOf(transcript.id) >= 0;
            });

            // Create the layout
            var $layout = $(
                '<div class="row-fluid">' +
                    '<div class="span9"></div>' +
                    '<div class="span3"></div>' +
                '</div>');
            var $definitions = $layout.find(".span3").html("<h3>Definitions</h3>");
            $(holder).html($layout);

            // Create the translator
            var translator = new TextTranslator($definitions[0]);
            translator.addTranslationEngine(arcliteTranslationEngine, 1);
            translator.addTranslationEngine(wordReferenceTranslationEngine, 2);
            translator.addTranslationEngine(googleTranslationEngine, 3);

            // Install the HTML 5 player
            Ayamel.AddVideoPlayer(h5PlayerInstall, 1, function() {

                var $player = $('<div id="player"></div>');
                var videoPlayer;
                $layout.find(".span9").html($player);

                // Create the player
                videoPlayer = new Ayamel.VideoPlayer({
                    element: $player.get(0),
                    aspectRatio: 45,
                    resource: resource,
                    components: ["play", "volume", "fullScreen", "captions"],
                    captions: transcripts,
                    renderCue: function (cue){
                        var node = document.createElement('div');
                        node.appendChild(cue.getCueAsHTML(cue.track.kind==='subtitles'));

                        // Attach the translator the the node
                        // TODO: Handle languages correctly
                        translator.attach(node, cue.track.language, "en");

                        return {node:node};
                    }
                });
            });
        });
    }

    function renderVideoLevel4(content, resource, holder, callback) {
        // Load the transcripts
        resource.getTranscripts(function (transcripts) {

            // Filter the transcripts to only include those that are specified
            var captionTracks = [];
            if (content.settings.enabledCaptionTracks) {
                captionTracks = content.settings.enabledCaptionTracks.split(",");
            }
            transcripts = transcripts.filter(function (transcript) {
                return captionTracks.indexOf(transcript.id) >= 0;
            });

            // Load the annotations
            resource.getAnnotations(function (annotations) {

                // Filter the annotations to only include those that are specified
                var annotationDocuments = [];
                if (content.settings.enabledAnnotationDocuments) {
                    annotationDocuments = content.settings.enabledAnnotationDocuments.split(",");
                }
                annotations = annotations.filter(function (annotationDoc) {
                    return annotationDocuments.indexOf(annotationDoc.id) >= 0;
                });

                // Create the layout
                var $layout = $(
                    '<div class="row-fluid">' +
                        '<div class="span8"></div>' +
                        '<div class="span4">' +
                            '<ul class="nav nav-tabs" id="videoTabs">' +
                                '<li class="active"><a href="#translations">Translations</a></li> ' +
                                '<li><a href="#annotations">Annotations</a></li> ' +
                            '</ul>' +
                            '<div class="tab-content">' +
                                '<div class="tab-pane active" id="translations">' +
                                    '<h2>Translations</h2>' +
                                    '<div></div>' +
                                '</div>' +
                                '<div class="tab-pane" id="annotations">' +
                                    '<h2>Annotations</h2>' +
                                    '<div></div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>');
                var $translations = $layout.find("#translations");
                var $annotations = $layout.find("#annotations");

                // Enable the tabs
                $layout.find("#videoTabs a").click(function (e) {
                    e.preventDefault();
                    $(this).tab('show');
                });

                $(holder).html($layout);

                // Create the translator
                var translator = new TextTranslator($translations.children("div")[0]);
                translator.addTranslationEngine(arcliteTranslationEngine, 1);
                translator.addTranslationEngine(wordReferenceTranslationEngine, 2);
                translator.addTranslationEngine(googleTranslationEngine, 3);

                // Load the annotation files
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

                    // Define the text annotation renderer
                    var renderer = function ($annotation, data) {
                        // Associate the data with the annotation
                        $annotation.click(function () {
                            if (data.type === "image") {
                                var image = new Image();
                                image.src = data.value;
                                $annotations.children("div").html(image);
                            }

                            if (data.type === "text") {
                                $annotations.children("div").html(data.value);
                            }

                            // Flip to the annotation tab
                            $layout.find("#videoTabs li:nth-child(2) a").tab("show");
                        });

                        return $annotation;
                    };

                    // Install the HTML 5 player
                    Ayamel.AddVideoPlayer(h5PlayerInstall, 1, function() {

                        var $player = $('<div id="player"></div>');
                        var videoPlayer;
                        $layout.find(".span8").html($player);

                        // Create the player
                        videoPlayer = new Ayamel.VideoPlayer({
                            element: $player.get(0),
                            aspectRatio: 45,
                            resource: resource,
                            components: ["play", "volume", "fullScreen", "captions"],
                            captions: transcripts,
                            renderCue: function (cue){
                                var node = document.createElement('div');
                                node.appendChild(cue.getCueAsHTML(cue.track.kind==='subtitles'));

                                // Add annotations
                                SimpleAnnotator.annotate(results, node, renderer);

                                // Attach the translator the the node
                                // TODO: Handle languages correctly
                                translator.attach(node, cue.track.language, "en");

                                return {node:node};
                            }
                        });
                    });
                });
            });
        });
    }

    function renderVideoLevel5(resource, holder, callback) {
        $(holder).html("<em>Playback at this level has not been implemented yet.</em>");
    }

    function renderVideo(content, resource, holder, callback) {
        // Render video
        switch (content.settings.level) {
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
                renderVideoLevel4(content, resource, holder, callback);
                break;
            case "5":
                renderVideoLevel5(content, resource, holder, callback);
                break;
        }
    }

    function renderAudio(content, resource, holder, callback) {
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

    function renderPlaylist(content, holder, callback) {
        PlaylistRenderer.render(content.resourceId, holder, callback);
    }

    function renderContent(content, holder, callback) {
        var resourceUrl = resourceLibraryUrl + "/" + content.resourceId;

        // Check if we are rendering something from the resource library
        if (content.contentType === "video" || content.contentType === "audio" || content.contentType === "image") {
            ResourceLibrary.load(resourceUrl, function (resource) {
                switch (resource.type) {
                    case "audio":
                        renderAudio(content, resource, holder, callback);
                        break;
                    case "image":
                        renderImage(content, resource, holder, callback);
                        break;
                    case "video":
                        renderVideo(content, resource, holder, callback);
                        break;
                }
            });
        } else if (content.contentType === "playlist") {
            renderPlaylist(content, holder, callback);
        }
    }

    return {

        render: function (content, holder, callback) {
            if (typeof content == "object") {
                renderContent(content, holder, callback);
            }
            if (typeof content == "number") {
                $.ajax("/content/" + content + "/json", {
                    dataType: "json",
                    success: function (data) {
                        renderContent(data, holder, callback);
                    }
                });
            }
        },

        setResourceLibraryUrl: function (url) {
            resourceLibraryUrl = url;
        }
    };
}());