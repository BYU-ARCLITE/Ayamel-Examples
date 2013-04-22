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

    function getTranscripts(args, callback) {
        args.resource.getTranscripts(function (transcripts) {

            // Filter the transcripts to only include those that are specified

            var allowedCaptionTracks = [];
            if (args.content.settings.enabledCaptionTracks) {
                allowedCaptionTracks = args.content.settings.enabledCaptionTracks.split(",");
            }

            var captionTracks = [];
            if (args.content.settings[args.coursePrefix + "enabledCaptionTracks"]) {
                captionTracks = args.content.settings[args.coursePrefix + "enabledCaptionTracks"].split(",");
            }
            transcripts = transcripts.filter(function (transcript) {
                return captionTracks.indexOf(transcript.id) >= 0 && allowedCaptionTracks.indexOf(transcript.id) >= 0;
            });
            callback(transcripts);
        });
    }

    function getAnnotations(args, callback) {
        // First get the annotation resources from the relations
        args.resource.getAnnotations(function (annotations) {

            // Filter the annotations to only include those that are specified
            var allowedAnnotationDocuments = [];
            if (args.content.settings.enabledAnnotationDocuments) {
                allowedAnnotationDocuments = args.content.settings.enabledAnnotationDocuments.split(",");
            }

            var annotationDocuments = [];
            if (args.content.settings[args.coursePrefix + "enabledAnnotationDocuments"]) {
                annotationDocuments = args.content.settings[args.coursePrefix + "enabledAnnotationDocuments"].split(",");
            }
            annotations = annotations.filter(function (annotationDoc) {
                return annotationDocuments.indexOf(annotationDoc.id) >= 0 && allowedAnnotationDocuments.indexOf(annotationDoc.id) >= 0;
            });

            // Load the annotation files
            async.map(annotations, function (annotation, asyncCallback) {
                $.ajax(annotation.content.files[0].downloadUri, {
                    dataType: "json",
                    success: function(data) {
                        AnnotationLoader.load(data, function(manifest) {
                            asyncCallback(null, manifest);
                        });
                    }, error: function(data){
                        asyncCallback(data);
                    }
                });
            }, function (err, results) {
                callback(results);
            });
        });
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

    function renderText(args) {
        var file = findFile(args.resource, function (file) {
            return file.representation === "original";
        });
        if (file === null) {
            $(args.holder).html("<em>There was an error displaying this content</em>");
        } else {

            // Load the annotations
            getAnnotations(args.content, args.resource, args.coursePrefix, function (annotations) {

                var panes;
                var tabs = [];
                if (annotations && args.annotate) {
                    tabs.push("Annotations");
                    panes = ContentLayoutManager.twoPanel($(args.holder), tabs);
                } else {
                    panes = ContentLayoutManager.onePanel($(args.holder));
                }

                // Load the text
                $.ajax(file.downloadUri, {
                    success: function(data) {
                        var $textHolder = $('<pre id="textHolder"></pre>');
                        $textHolder.text(data);
                        panes.$player.html($textHolder);

                        if (annotations && args.annotate) {
                            AnnotationRenderers.init(panes.Annotations.$content, null, function () {
                                // Flip to the annotation tab
                                panes.Annotations.$tab.tab("show");
                            });
                            SimpleAnnotator.annotate(annotations, $cue[0], AnnotationRenderers.video)
                        }

                        if (args.callback) {
                            args.callback({
                                text: data,
                                $textHolder: $textHolder
                            });
                        }
                    }
                });
            });
        }
    }

    function renderPlaylist(args) {
//        PlaylistRenderer.render(content.resourceId, holder, callback);
    }

    function renderContent(args) {
        var resourceUrl = resourceLibraryUrl + "/" + args.content.resourceId;

        // Check if we are rendering something from the resource library
        if (args.content.contentType === "video" || args.content.contentType === "audio"
            || args.content.contentType === "image" || args.content.contentType === "text") {

            ResourceLibrary.load(resourceUrl, function (resource) {
                args.resource = resource;
                switch (resource.type) {
                    case "audio":
                        renderAudio(args);
                        break;
                    case "image":
                        ImageRenderer.render(args);
                        break;
                    case "text":
                        TextRenderer.render(args);
                        break;
                    case "video":
                        VideoRenderer.render(args);
                        break;
                }
            });
        } else if (args.content.contentType === "playlist") {
            renderPlaylist(args);
        }
    }

    return {

        findFile: findFile,
        getTranscripts: getTranscripts,
        getAnnotations: getAnnotations,

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