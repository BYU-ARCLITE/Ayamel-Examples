var ContentLoader = (function () {
    "use strict";

    /* args: resource, courseId, contentId, permission */
    function getTranscripts(args){
        var captionTrackIds = args.resource.relations
            .filter(function(r){return r.type==="transcript_of";})
            .map(function(r){return r.subjectId;}).join(',');
        return new Promise(function(resolve, reject){
            if(captionTrackIds.length){
                resolve($.ajax("/ajax/permissionChecker", {
                    type: "post",
                    data: {
                        courseId: args.courseId,
                        contentId: args.contentId,
                        permission: args.permission || "view",
                        documentType: "captionTrack",
                        ids: captionTrackIds
                    }
                }));
            } else { resolve([]); }
        }).then(function(data){
            // Now turn those IDs into resources
            return Promise.all(data.map(ResourceLibrary.load));
        });
    }

    /* args: resource, courseId, contentId, permission */
    function getAnnotations(args){
        var annotationIds = args.resource.relations
            .filter(function(r){return r.type==="references";})
            .map(function(r){return r.subjectId;}).join(',');
        return new Promise(function(resolve, reject){
            if(annotationIds.length){
                resolve($.ajax("/ajax/permissionChecker", {
                    type: "post",
                    data: {
                        courseId: args.courseId,
                        contentId: args.contentId,
                        permission: args.permission || "view",
                        documentType: "annotationDocument",
                        ids: annotationIds
                    }
                }));
            }else{
                resolve([]);
            }
        }).then(function(data){
            // Now turn those IDs into resources then into an annotation list
            return Promise.all(data.map(function(id){
                return ResourceLibrary.load(id).then(function(resource){
                    var url = resource.content.files[0].downloadUri,
                        idx = url.indexOf('?'),
                        lang = resource.languages.iso639_3[0];
                    if(idx === -1){ url += "?"; }
                    else if(idx !== url.length-1){ url += '&nocache='; }
                    url += Date.now().toString(36);
                    return AnnotationLoader.loadURL(url, lang).then(function(manifest){
                        return new Ayamel.Annotator.AnnSet(resource.title, lang, manifest);
                    }, function(err){ return null; });
                });
            })).then(function(list){
                return list.filter(function(m){ return m !== null; });
            });
        });
    }

    function renderContent(args) {
        // Check if we are rendering something from the resource library
        if (["video", "audio", "image", "text"].indexOf(args.content.contentType) >= 0) {
            ResourceLibrary.load(args.content.resourceId, function(resource) {
                args.resource = resource;
                ContentRenderer.render({
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
                    callback: args.callback
                });
            });
        } else if (args.content.contentType === "playlist") {
            PlayGraphPlayer.play(args);
        } else if (args.content.contentType === "questions") {
            QuestionSetRenderer.render({
                content: args.content,
                holder: args.holder,
                inPlaylist: args.inPlaylist,
                qcallback: args.callback
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