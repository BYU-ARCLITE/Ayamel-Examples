/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/10/13
 * Time: 3:39 PM
 * To change this template use File | Settings | File Templates.
 */
var AnnotationTextEditor = (function(){
    function loadTracks(content, callback){

        // TODO: Determine which course we're operating in
       ResourceLibrary.load(content.resourceId).then(function(resource){
           return ContentLoader.getTranscriptWhitelist({
               courseId: 0,
               contentId: content.id,
               resource: resource,
               permission: "view"
           })
            .then(ResourceLibrary.loadAll) // Turn IDs into resources
            .then(function(transcripts){
                return Promise.all(transcripts.map(function(transres){
                    var kind = resource.relations.filter(function(relation){
                        return relation.type == "transcript_of" &&
                        relation.subjectId == transres.id;
                    },this).map(function(relation){
                        return relation.attributes.kind || "subtitles";
                    })[0];
                    return Ayamel.utils.loadCaptionTrack(transres, kind);
                }));
            });
       }).then(callback);
    }

    /* args: manifest, content, holder, popupEditor, language, ractive */
    function AnnotationTextEditor(args) {
        /*
         * Text annotation
         *
         * manifestCopy is a copy of the manifest that is updated every time that the annotations are saved
         * When a user leaves the page, if there are any differences, then the onbeforeunload function will warn the user
         * about losing unsaved changes.
         */
        var manifest = new AnnotationManifest("text", {});
        this.manifestCopy = JSON.stringify(manifest);
        var transcriptPlayer = null;
        var language = args.language;
        var activeAnnotation = null;
        var that = this;
        var captionTracks = null;

        window.onbeforeunload = function() {
            if (JSON.stringify(manifest)!==that.manifestCopy && Object.keys(manifest[language]).length > 0) {
                return "Your unsaved changes will be lost.";
            }
        }

        var annotator = new Ayamel.Annotator({
                classList:["annotation"],
                handler: function(data, lang, text, index){
                    args.holder.dispatchEvent(new CustomEvent("annotation", {
                        bubbles: true,
                        detail: {data: data, lang: lang, text: text, index: index}
                    }));
                }
            }, manifest);

        var renderAnnotations = function(){};

        function checkIfAnnotated(text){
            return !!manifest[language].hasOwnProperty(text);
        }

        /*
         * Launches the Annotation popup Editor if a word has been selected
         */
        function setupTextAnnotations(element) {
            element.addEventListener('mouseup', function(event){
                var text = window.getSelection().toString().trim();
                if (text !== '') {
                    activeAnnotation = text;
                    var newAnnotation = {
                        "global" : {
                            "data" : {
                                "type" : "text",
                                "value" : ""
                            }
                        }
                    };
                    if (!checkIfAnnotated(text)) {
                        manifest[language][text] = newAnnotation;
                    }
                    args.popupEditor.annotation = {"manifest" : manifest[language], "word" : text};
                    args.popupEditor.show();
                }
            }, false);
        }

        /* temporary fix to bind the handler to the annotations
           need make annotator.js actually bind the elements with the provided handler
           and make sure it doesn't get lost when the track is updated */
        function setHandler() {
            var annotatedWords = document.querySelectorAll(".annotation");
            [].forEach.call(annotatedWords, function(obj){
                obj.addEventListener('click', function() {
                    activeAnnotation = this.textContent;
                    var annLang = language;
                    Object.keys(manifest).forEach(function(key){
                        if (manifest[key].hasOwnProperty(activeAnnotation)) {
                            annLang = key;
                            return;
                        }
                    });
                    args.popupEditor.annotation = {"manifest" : manifest[annLang], "word" : this.textContent};
                    args.popupEditor.show();
                });
            });
        }

        function addTracks(tracks) {
            if (typeof transcriptPlayer === 'undefined') { return; }
            [].forEach.call(tracks, function(track) {
                transcriptPlayer.addTrack(track.track)
            });
        }

        /*
         * Text display area
         */
        if (args.content.contentType === "text") {
            renderAnnotations = function() {
                ResourceLibrary.load(args.content.resourceId, function(resource) {
                    TextRenderer.render({
                        courseId: 0,
                        contentId: args.content.id,
                        resource: resource,
                        holder: args.holder,
                        annotate: false,
                        callback: function(layout) {
                            setupTextAnnotations(layout.textHolder);
                        }
                    });
                });
            };
            renderAnnotations(false);
        } else {
            loadTracks(args.content, function(tracks) {
                captionTracks = tracks
                transcriptPlayer = new TranscriptPlayer({
                    holder: args.holder,
                    captionTracks: [],
                    sync: false,
                    annotator: annotator
                });
                addTracks(captionTracks);
                if (tracks.length > 0) {
                    // Sets the annotation language to the language of the first track.
                    if (tracks[0].track.language !== "zxx") {
                        args.ractive.value = tracks[0].track.language;
                        that.language = tracks[0].track.language;
                    }
                    else {
                        args.ractive.value = "eng";
                        that.language = "eng";
                    }
                }
            });
            /** Takes Boolean variable that states whether or not an annotation was deleted **/
            renderAnnotations = function(deleted) {
                var annArray = [{"glosses":{}, "mode":"showing"}];
                Object.keys(manifest).forEach(function(key) {
                    annArray[0].glosses[key] = manifest[key];
                });
                annotator.annotations = annArray;
                var currTranscript = !!transcriptPlayer ? transcriptPlayer.activeTranscript : 0;
                [].forEach.call(captionTracks, function(track){
                    transcriptPlayer.updateTrack(track.track);
                });
                transcriptPlayer.activeTranscript = currTranscript;
                // annotator.js getmod temp fix
                setHandler();
            }
            setupTextAnnotations(args.holder);
        }

        /*
         * Interaction with popup editor
         */
        args.popupEditor.on("update", function() {
            activeAnnotation = args.popupEditor.annotation.currAnn;
            renderAnnotations(false);
        });
        args.popupEditor.on("delete", function() {
            delete manifest[language][activeAnnotation];
            renderAnnotations(true);
        });

        /**
         * @param resource - annotation document resource
         * @return AnnSet promise
         */
        function loadAnnotationDoc(resource) {
            return Ayamel.utils.HTTP({url: resource.content.files[0].downloadUri})
            .then(function(annMan){
                return new Ayamel.Annotator.AnnSet(
                    resource.title,
                    resource.languages.iso639_3[0],
                    JSON.parse(annMan)
                );
            }).then(null,function(err){
                console.log(err);
                return null;
            });
        }

        Object.defineProperties(this, {
            getAnnotations: {
                value: function(){ return manifest; }
            },
            language: {
                set: function(newLang) {
                    if (newLang === "zxx")
                        return;

                    language = newLang.trim();
                    var prevLang = Object.keys(manifest)[0];
                    if (prevLang === undefined || newLang === prevLang) {
                        manifest[newLang] = !!manifest[prevLang] ? manifest[prevLang] : {};
                    } else {
                        manifest[newLang] = manifest[prevLang];
                        delete manifest[prevLang];
                    }
                },
                get: function() {
                    return language;
                }
            },
            editAnn: {
                value: function(resId, contentId) {
                        ResourceLibrary.load(resId).then(function(annResource){
                            loadAnnotationDoc(annResource).then(function(annMan){
                                Object.keys(annMan.glosses).forEach(function(lang){
                                    var annObj = annMan.glosses[lang];
                                    if (!manifest.hasOwnProperty(lang)){
                                        manifest[lang] = {};
                                    }
                                    Object.keys(annObj).forEach(function(key){
                                        // Overwrites the value for that key if it already exists
                                        manifest[lang][key] = annObj[key];
                                    });
                                });
                                $("#editAnnotationsModal").modal("hide");
                                renderAnnotations(false);
                            });
                        });

                    }
            },
            emptyManifest: {
                value: function() {
                    manifest = {};
                    manifest[language] = {};
                    renderAnnotations(true);
                }
            },
            refreshTranscript: {
                value: function() {
                    renderAnnotations(false);
                }
            }
        });

    }

    return AnnotationTextEditor;
})();
