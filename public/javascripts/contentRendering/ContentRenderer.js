var ContentRenderer = (function () {
    "use strict";

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
        $.ajax("/ajax/permissionChecker", {
            type: "post",
            data: {
                courseId: args.courseId,
                contentId: args.content.id,
                permission: args.permission || "view",
                documentType: "captionTrack"
            },
            success: function(data) {
                // Now turn those IDs into resources
                async.map(data, function (id, asyncCallback) {
                    ResourceLibrary.load(id, function (resource) {
                        asyncCallback(null, resource);
                    });
                }, function (err, data) {
                    callback(data);
                });
            }
        });

//        AdditionalDocumentLoader.captionTracks.loadVisible({
//            userId: args.userId,
//            owner: args.owner,
//            teacher: args.teacher,
//            courseId: args.courseId,
//            content: args.content,
//            resource: args.resource,
//            callback: callback
//        });
    }

    function getAnnotations(args, callback) {
        $.ajax("/ajax/permissionChecker", {
            type: "post",
            data: {
                courseId: args.courseId,
                contentId: args.content.id,
                permission: args.permission || "view",
                documentType: "captionTrack"
            },
            success: function(data) {
                // Now turn those IDs into resources then into annotation manifests
                async.map(data, function (id, asyncCallback) {
                    ResourceLibrary.load(id, function (resource) {

                        // Now get the actual annotation manifest
                        $.ajax(resource.content.files[0].downloadUri, {
                            dataType: "json",
                            success: function(data) {
                                AnnotationLoader.load(data, function(manifest) {
                                    if (manifest) {
                                        manifest.resourceId = resource.id;
                                    }
                                    asyncCallback(null, manifest);
                                });
                            }, error: function(data){
                                asyncCallback(data);
                            }
                        });
                    });
                }, function (err, data) {
                    callback(data);
                });
            }
        });


//        AdditionalDocumentLoader.annotations.loadVisible({
//            userId: args.userId,
//            owner: args.owner,
//            teacher: args.teacher,
//            courseId: args.courseId,
//            content: args.content,
//            resource: args.resource,
//            callback: function (annotations) {
//
//                // Load the annotation files
//                async.map(annotations, function (annotation, asyncCallback) {
//                    $.ajax(annotation.content.files[0].downloadUri, {
//                        dataType: "json",
//                        success: function(data) {
//                            AnnotationLoader.load(data, function(manifest) {
//                                if (manifest) {
//                                    manifest.resourceId = annotation.id;
//                                }
//                                asyncCallback(null, manifest);
//                            });
//                        }, error: function(data){
//                            asyncCallback(data);
//                        }
//                    });
//                }, function (err, results) {
//                    callback(results);
//                });
//            }
//        });
    }


    function renderPlaylist(args) {
        // TODO: Render playlist
    }

    function renderContent(args) {

        // Check if we are rendering something from the resource library
        if (args.content.contentType === "video" || args.content.contentType === "audio"
            || args.content.contentType === "image" || args.content.contentType === "text") {

            ResourceLibrary.load(args.content.resourceId, function (resource) {
                args.resource = resource;
                switch (resource.type) {
                    case "audio":
//                        args.content.settings.level = 4;
                        VideoRenderer.render(args);//AudioRenderer.render(args);
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
        }
    };
}());