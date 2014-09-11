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
			// Now turn those IDs into resources then into an annotation manifest
			return Promise.all(data.map(function(id){
				return ResourceLibrary.load(id).then(function(resource){
					var url = resource.content.files[0].downloadUri,
						idx = url.indexOf('?');
					if(idx === -1){ url += "?"; }
					else if(idx !== url.length-1){ url += '&nocache='; }
					url += Date.now().toString(36);
					return AnnotationLoader.loadURL(url, resource.languages.iso639_3[0]).then(function(manifest){
						//if(manifest){ manifest.resourceId = resource.id; } //this line breaks stuff
						return manifest;
					}, function(err){ return null; });
				});
			})).then(function(manifests){
				if(manifests.length === 0){ return null; }
				var manifest = {};
				manifests.forEach(function(mobj){
					Object.keys(mobj).forEach(function(lang){
						var mlang, langobj = mobj[lang];
						if(manifest.hasOwnProperty(lang)){
							mlang = manifest[lang];
							Object.keys(langobj).forEach(function(word){
								mlang[word] = langobj[word];
							});
						}else{
							manifest[lang] = langobj;
						}
					});
				});
				return manifest;
			});
		});
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