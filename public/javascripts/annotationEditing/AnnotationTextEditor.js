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
            ContentLoader.getTranscripts({
                courseId: 0,
                contentId: content.id,
                resource: resource,
                permission: "view"
            }).then(function(transcripts){
                Promise.all(transcripts.map(function(transcript){
                    return new Promise(function(resolve){
                        Ayamel.utils.loadCaptionTrack(transcript, resolve);
                    });
                })).then(callback);
            });
        });
    }

    /* args: manifest, content, holder, popupEditor, language, ractive */
    function AnnotationTextEditor(args) {
        /*
         * Text annotation
         */
        var manifest = new AnnotationManifest("text", {});
        var transcriptPlayer;
        var language = args.language;
        var activeAnnotation = null;
        var that = this;
        
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
                    activeAnnotation = this.innerHTML;
                    var annLang = language;
                    Object.keys(manifest).forEach(function(key){
                        if (manifest[key].hasOwnProperty(activeAnnotation)) {
                            annLang = key;
                            return;
                        }
                    });
                    args.popupEditor.annotation = {"manifest" : manifest[annLang], "word" : this.innerHTML};
                    args.popupEditor.show();
                });
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
            renderAnnotations();
        } else {
            loadTracks(args.content, function(tracks) {
                  transcriptPlayer = new TranscriptPlayer({
                    holder: args.holder,
                    captionTracks: tracks,
                    sync: false
                    /* filter: function(cue, $cue) {
                        setupTextAnnotations($cue);
                    } */
                });
                if (tracks.length > 0) {
                    // Sets the annotation language to the language of the first track.
                    if (tracks[0].language !== "zxx") {
                        args.ractive.data.selection.push(tracks[0].language);
                        that.language = tracks[0].language;
                    }
                    else {
                        args.ractive.data.selection.push("eng");
                        that.language = "eng";
                    }
                }
            });
            renderAnnotations = function() {
                var currTranscript = !!transcriptPlayer ? transcriptPlayer.activeTranscript : 0;
                loadTracks(args.content, function(tracks) {
                    transcriptPlayer = new TranscriptPlayer({
                        holder: args.holder,
                        captionTracks: tracks,
                        sync: false
                    });
                    annotator.annotations = manifest;
                    [].forEach.call(tracks, function(track) {
                        [].forEach.call(track.cues, function(cue) {
                            var t = annotator.Text(cue.text);
                            var z = document.createElement('p');
                            z.appendChild(t);
                            if (z.childNodes.length > 1) {
                                cue.text = z.innerHTML;
                            }
                        });
                        transcriptPlayer.updateTrack(track);
                    });
                    transcriptPlayer.activeTranscript = currTranscript;
                    // annotator.js getmod temp fix
                   setHandler();
                });
            }
            setupTextAnnotations(args.holder);
        }

        /*
         * Interaction with popup editor
         */
        args.popupEditor.on("update", function() {
            activeAnnotation = args.popupEditor.annotation.currAnn;
            renderAnnotations();
        });
        args.popupEditor.on("delete", function() {
            delete manifest[language][activeAnnotation];
            renderAnnotations();

        });


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
                    ResourceLibrary.load(resId).then(function(resource){
                        ContentLoader.getAnnotations({
                            courseId: courseId,
                            contentId: contentId,
                            permission: undefined,
                            resource: resource
                        }).then(function(annsets){
                            var annLang = Object.keys(annsets[0]["glosses"])[0],
                                annObj = annsets[0]["glosses"][annLang];
                            Object.keys(annObj).forEach(function (key) {
                                if (!manifest.hasOwnProperty(annLang)) {
                                    manifest[annLang] = {};
                                }
                                // potential problem: lose the annotation data that they recently created.
                                // saves annotations under the corresponding language
                                manifest[annLang][key] = annObj[key];
                            });
                            renderAnnotations();
                        });
                    });
                    $("#editAnnotationsModal").modal("hide");
                }
            },
            emptyManifest: {
                value: function() {
                    manifest = {};
                    manifest[language] = {};
                    renderAnnotations();
                }
            },
            refreshTranscript: {
                value: function() {
                    renderAnnotations();
                }
            }
        });

    }

    return AnnotationTextEditor;
})();