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
            ContentRenderer.getTranscripts({
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

    /* args: manifest, content, holder, popupEditor */
    function AnnotationTextEditor(args) {
        
        /*
         * Text annotation
         */
        var language = !!content.language ? content.languages.iso639_3[0] : "eng";
        args.manifest = {};
        args.manifest[language] = {};
        var annotator = new Ayamel.Annotator({
                classList:["annotation"],
                handler: function(data, lang, text, index){
                    element.dispatchEvent(new CustomEvent("annotation", {
                        bubbles: true,
                        detail: {data: data, lang: lang, text: text, index: index}
                    }));
                }
            }, args.manifest);

        var activeAnnotation = null;
        var renderAnnotations = function(){};
        // function to get the annotation manifest and return it's contents
        // declared to window so it is usable by the html onclick function in the edit modal
        // needs to access the annotation manifest which is only available in this file.
        window.editAnn = function(resId, contentId) {
            ResourceLibrary.load(resId).then(function(resource){
                Promise.all([
                    ContentRenderer.getAnnotations({
                        courseId: courseId,
                        contentId: contentId,
                        permission: undefined,
                        resource: resource
                    })
                ]).then(function(arr){
                    var annLang = Object.keys(arr[0])[0];
                    var lang = arr[0];
                    Object.keys(lang[annLang]).forEach(function (key) {
                        // potential problem: lose the annotation data that they recently created.
                        args.manifest[language][key] = lang[annLang][key];
                        window.manifest  = args.manifest;
                    });
                    renderAnnotations();
                });
            });  
            $("#editAnnotationsModal").modal("hide");
        }

        function checkIfAnnotated(text){
            return !!args.manifest[language].hasOwnProperty(text);
        }

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
                        args.manifest[language][text] = newAnnotation;
                    }
                    args.popupEditor.annotation = {"manifest" : args.manifest[language], "word" : text};
                    args.popupEditor.show();
                }
            }, false);
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
                        txtcallback: function(layout) {
                            setupTextAnnotations(layout.textHolder);
                        }
                    });
                });
            };
            renderAnnotations();
        } else {
            var transcriptPlayer;
            loadTracks(args.content, function(tracks) {
                  transcriptPlayer = new TranscriptPlayer({
                    holder: args.holder,
                    captionTracks: tracks,
                    sync: false
                    /* filter: function(cue, $cue) {
                        setupTextAnnotations($cue);
                    } */
                });
            });
            renderAnnotations = function() {
                loadTracks(args.content, function(tracks) {
                    transcriptPlayer = new TranscriptPlayer({
                        holder: args.holder,
                        captionTracks: tracks,
                        sync: false
                        /* filter: function(cue, $cue) {
                            setupTextAnnotations($cue);
                        } */
                    });
                    annotator.annotations = args.manifest;
                    [].forEach.call(tracks, function(track) {
                        [].forEach.call(track.cues, function(cue) {
                            var t = annotator.HTML(cue.text);
                            var z = document.createElement('p');
                            z.appendChild(t);
                            cue.text = z.innerHTML;
                        });
                    });
                    transcriptPlayer.captionTracks = tracks;
                    [].forEach.call(tracks, function(t){
                        transcriptPlayer.updateTrack(t);
                    });
                });
            }
            setupTextAnnotations(args.holder, args.manifest);
        }

        /*
         * Interaction with popup editor
         */
        args.popupEditor.on("update", function() {
            activeAnnotation = args.popupEditor.annotation;
            renderAnnotations();
        });
        args.popupEditor.on("delete", function() {
            delete args.manifest[language][activeAnnotation];
            renderAnnotations();
        });

        Object.defineProperties(this, {
            getAnnotations: {
                value: function(){ return args.manifest; }
            },
            language: {
                set: function(newLang) {
                    newLang = newLang.trim();
                    var prevLang = Object.keys(args.manifest)[0];
                    args.manifest[newLang] = args.manifest[prevLang];
                    delete args.manifest[prevLang];
                    language = newLang.trim();
                },
                get: function() {
                    return language;
                }
            }
        });

    }

    return AnnotationTextEditor;
})();