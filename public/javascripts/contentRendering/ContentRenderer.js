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
    }

    function getAnnotations(args, callback) {
        $.ajax("/ajax/permissionChecker", {
            type: "post",
            data: {
                courseId: args.courseId,
                contentId: args.content.id,
                permission: args.permission || "view",
                documentType: "annotations"
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
    }

    function renderContent(args) {

        // Check if we are rendering something from the resource library
        if (["video", "audio", "image", "text"].indexOf(args.content.contentType) >= 0) {

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
            PlayGraphPlayer.play(args);
        } else if (args.content.contentType === "questions") {
            QuestionSetRenderer.render(args);
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