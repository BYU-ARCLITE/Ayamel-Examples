var ContentRenderer = (function () {
    "use strict";

    /*
     * =====================
     *    Helper functions
     */

    function findFile(resource, criteriaFunction) {
        var i, file,
            files = resource.content.files;
        for (i = 0, file = null; file = files[i]; i++) {
            if (criteriaFunction(file)) { break; }
        }
        return file;
    }

    /* args: resource, courseId, contentId, permission, */
    function getTranscripts(args, callback) {
        var captionTrackIds = args.resource.relations
            .filter(function(r){return r.type==="transcript_of";})
            .map(function(r){return r.subjectId;}).join(',');
        if(captionTrackIds.length){
            $.ajax("/ajax/permissionChecker", {
                type: "post",
                data: {
                    courseId: args.courseId,
                    contentId: args.contentId,
                    permission: args.permission || "view",
                    documentType: "captionTrack",
                    ids: captionTrackIds
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
        } else { callback([]); }
    }

    /* args: resource, courseId, contentId, permission */
    function getAnnotations(args, callback) {
        var annotationIds = args.resource.relations
            .filter(function(r){return r.type==="references";})
            .map(function(r){return r.subjectId;}).join(',');
        if(annotationIds.length){
            $.ajax("/ajax/permissionChecker", {
                type: "post",
                data: {
                    courseId: args.courseId,
                    contentId: args.contentId,
                    permission: args.permission || "view",
                    documentType: "annotations",
                    ids: annotationIds
                },
                success: function(data) {
                    // Now turn those IDs into resources then into annotation manifests
                    async.map(data, function (id, asyncCallback) {
                        ResourceLibrary.load(id, function (resource) {
                            var url = resource.content.files[0].downloadUri,
                                idx = url.indexOf('?');
                            if(idx === -1){ url += "?"; }
                            else if(idx !== url.length-1){ url += '&nocache='; }
                            url += Date.now().toString(36);
                            // Now get the actual annotation manifest
                            $.ajax(url, {
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
        } else { callback([]); }
    }

    function renderContent(args) {

        // Check if we are rendering something from the resource library
        if (["video", "audio", "image", "text"].indexOf(args.content.contentType) >= 0) {

            ResourceLibrary.load(args.content.resourceId, function(resource) {
                args.resource = resource;
                switch (resource.type) {
                    case "audio":
                        //args.content.settings.level = 4;
                        //AudioRenderer.render(args);
                        VideoRenderer.render({
                            resource: resource,
                            content: args.content,
                            courseId: args.courseId,
                            contentId: args.content.id,
                            holder: args.holder,
                            components: args.components,
                            screenAdaption: args.screenAdaption,
                            startTime: args.startTime,
                            endTime: args.endTime,
                            renderCue: args.renderCue,
                            permission: args.permission,
                            vidcallback: args.callback
                        });
                        break;
                    case "image":
                        ImageRenderer.render({
                            drawable: args.drawable,
                            filter: args.filter,
                            open: args.open,
                            resource: resource,
                            annotate: args.annotate,
                            imgcallback: args.callback,
                            courseId: args.courseId,
                            contentId: args.contentId,
                            holder: args.holder
                        });
                        break;
					case "document":
                    case "text":
                        TextRenderer.render({
                            resource: resource,
                            annotate: args.annotate,
                            txtcallback: args.callback,
                            courseId: args.courseId,
                            contentId: args.contentId,
                            holder: args.holder
                        });
                        break;
                    case "video":
                        VideoRenderer.render({
                            resource: resource,
                            content: args.content,
                            courseId: args.courseId,
                            contentId: args.content.id,
                            holder: args.holder,
                            components: args.components,
                            screenAdaption: args.screenAdaption,
                            startTime: args.startTime,
                            endTime: args.endTime,
                            renderCue: args.renderCue,
                            permission: args.permission,
                            vidcallback: args.callback
                        });
                        break;
                }
            });
        } else if (args.content.contentType === "playlist") {
            PlayGraphPlayer.play(args);
        } else if (args.content.contentType === "questions") {
            QuestionSetRenderer.render({
                content: args.content,
                holder: args.holder,
                inPlaylist: args.inPlaylist,
                qcallback: callback
            });
        }
    }

    function castContentObject(content){
        return new Promise(function(resolve, reject){
            if(typeof content == "object"){
                resolve(content);
            }else if(typeof args.content == "number") {
                Promise.cast($.ajax("/content/" + args.content + "/json?"+Date.now().toString(36), {
                    dataType: "json"
                })).then(resolve, reject);
            }else{
                reject('invalid type');
            }
        });
    }
    
    return {
        findFile: findFile,
        getTranscripts: getTranscripts,
        getAnnotations: getAnnotations,
        castContentObject: castContentObject,
        render: function (args) {
            castContentObject(args.content).then(function(data){
                args.content = data;
                renderContent(args);
            });
        }
    };
}());