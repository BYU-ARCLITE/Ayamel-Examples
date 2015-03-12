var ContentLoader = (function () {
    "use strict";

    function getDocuments(args, type, ids){
        if(ids.length === 0){ return Promise.resolve([]); }
        return Promise.resolve($.ajax("/ajax/permissionChecker", {
            type: "post",
            data: {
                courseId: args.courseId,
                contentId: args.contentId,
                permission: args.permission || "view",
                documentType: type,
                ids: ids.join(',')
            }
        })).then(ResourceLibrary.loadAll); // Turn IDs into Resources
    }

    /* args: resource, courseId, contentId, permission */
    function getTranscripts(args){
        return getDocuments(args, "captionTrack",
            args.resource.getTranscriptIds());
    }

    /* args: resource, courseId, contentId, permission */
    function getAnnotations(args){
        return getDocuments(args, "annotationDocument",
            args.resource.getAnnotationIds());
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
        switch(typeof content){
        case "number":
            return Promise.resolve($.ajax(
                "/content/" + args.content + "/json?"+Date.now().toString(36),
                {dataType: "json"}
            ));
        case "object": return Promise.resolve(content);
        default: return Promise.reject(new Error('Invalid Type'));
        }
    }

    return {
        getTranscripts: getTranscripts,
        getAnnotations: getAnnotations,
        castContentObject: castContentObject,
        render: function(args){
            castContentObject(args.content).then(function(data){
                args.content = data;
                renderContent(args);
            });
        }
    };
}());