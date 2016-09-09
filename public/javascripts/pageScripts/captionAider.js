$(function() {
    "use strict";

    var captionEditor, videoPlayer,
        trackResources, trackMimes,
        timeline, commandStack, Dialog,
        langList = Object.keys(Ayamel.utils.p1map).map(function (p1) {
            var code = Ayamel.utils.p1map[p1],
                engname = Ayamel.utils.getLangName(code,"eng"),
                localname = Ayamel.utils.getLangName(code,code);
            return {value: code, text: engname, desc: localname!==engname?localname:void 0};
        });


    var saveDiv = document.createElement('div'),
    saveImg = new Image(),
    saveText = document.createElement('p');

    saveDiv.setAttribute('id', 'saveDiv');
    saveImg.setAttribute('id', 'saveImg');
    saveText.setAttribute('id', 'saveText');
    saveImg.style.cssText = 'width:25px; height:25px; margin-right:15px; margin-top:-3px;';
    saveText.style.display = 'inline';

    saveDiv.appendChild(saveImg);
    saveDiv.appendChild(saveText);
    document.body.appendChild(saveDiv);

    // EVENT TRACK EDITOR html
   

    ///////////////////////////////////////

    langList.push({ value: "apc", text: "North Levantine Arabic"});
    langList.push({ value: "arz", text: "Egyptian Arabic"});
    langList.sort(function(a,b){ return a.text.localeCompare(b.text); });

    Dialog = Ractive.extend({
        template: '<div class="modal-header">\
            <button type="button" class="close" data-dismiss="modal" aria-hidden="true">X</button>\
            <h3>{{dialogTitle}}</h3>\
        </div>\
        <div class="modal-body">{{>dialogBody}}</div>\
        <div class="modal-footer">\
            {{#buttons}}\
            <button class="btn btn-blue" on-tap="buttonpress:{{.event}}">{{.label}}</button>\
            {{/buttons}}\
            <button class="btn" data-dismiss="modal" aria-hidden="true">Close</button>\
        </div>',
        onrender: function(){
            var actions = this.actions;
            this.on('buttonpress',function(event,which){
                if(typeof actions[which] !== 'function'){ return; }
                actions[which].call(this,event);
            });
        }
    });

    Ractive.partials.trackKindSelect = '<div class="control-group">\
        <label class="control-label">Kind</label>\
        <div class="controls">\
            <select value="{{trackKind}}">\
                <option value="subtitles" selected>Subtitles</option>\
                <option value="captions">Captions</option>\
                <option value="descriptions">Descriptions</option>\
                <option value="chapters">Chapters</option>\
                <option value="metadata">Metadata</option>\
            </select>\
        </div>\
    </div>';
    Ractive.partials.trackLangSelect = '<div class="control-group">\
        <label class="control-label">Language</label>\
        <div class="controls">\
            <SuperSelect icon="icon-globe" text="Select Language" value="{{trackLang}}" button="left" open="{{selectOpen}}" multiple="false" options="{{languages}}" modal="{{modalId}}" defaultOption={{defaultOption}}>\
        </div>\
    </div>';

    Ractive.partials.trackSelect = '<div class="control-group">\
        <div class="controls">\
                <SuperSelect icon="icon-laptop" text="Select Track" value="{{selectedTracks}}" button="left" open="{{selectOpen}}" multiple="true" options="{{tracks}}" modal="{{modalId}}">\
        </div>\
    </div>';

    function renderCue(renderedCue, renderFunc) {
        return captionEditor.make(renderedCue, renderFunc);
    }

    // Render the content

    content.settings = {
        level: 2,
        enabledCaptionTracks: content.settings.enabledCaptionTracks,
        showTranscripts: "true"
    };

    var contentHolder = document.getElementById("contentHolder");

    // Figure out what size the video player needs to be so that the timeline and tools don't spill over
    var paddingTop = contentHolder.offsetTop;
    // 61px for player controls. 252px for timeline and tools.
    var paddingBottom = 313;

    function updateSpacing() {
        document.getElementById("bottomSpacer").style.marginTop = document.getElementById("bottomContainer").clientHeight + "px";
        $('html,body').animate({scrollTop: document.body.scrollHeight - window.innerHeight}, 1000,'swing');
    }

    //Create New Track From Scratch
    var newTrackData = (function(){
        var ractive, datalist, resolver, failer, types;
        types = TimedText.getRegisteredTypes().map(function(mime){
            return {name: TimedText.getTypeInfo(mime).name, mime: mime};
        });
        ractive = new Dialog({
            el: document.getElementById('newTrackModal'),
            data: {
                dialogTitle: "Create a new track",
                languages: langList,
                trackLang: [],
                trackKind: "subtitles",
                trackName: "",
                trackMime: "text/vtt",
                types: types,
                modalId: "newTrackModal",
                buttons: [{event:"create",label:"Create"}],
                defaultOption: {value:'zxx',text:'No Linguistic Content'}
            },
            partials:{ dialogBody: document.getElementById('createTrackTemplate').textContent },
            actions: {
                create: function(event){
                    var that = this;
                    $('#newTrackModal').modal('hide');
                    resolver(datalist.map(function(key){
                        switch(key){
                        case 'kind': return that.get("trackKind");
                        case 'name': return that.get("trackName") || "Untitled";
                        case 'lang': return that.get("trackLang")[0];
                        case 'mime': return that.get("trackMime");
                        case 'overwrite': return true;
                        case 'handler':
                            return function(tp){
                                tp.then(function(track){ track.mode = "showing"; });
                            };
                        }
                    }));
                }
            }
        });

        return function(dl){
            // Clear the form
            ractive.set({trackName: "", selectOpen: false });
            $('#newTrackModal').modal('show');
            datalist = dl;
            return new Promise(function(resolve, reject){
                resolver = resolve;
                failer = reject;
            });
        };
    }());

    //Edit Track
    var editTrackData = (function(){
        var ractive, datalist, resolver, failer;
        ractive = new Dialog({
            el: document.getElementById("editTrackModal"),
            data: {
                dialogTitle: "Edit tracks",
                languages: langList,
                trackLang: [],
                trackKind: "subtitles",
                trackName: "",
                modalId: "editTrackModal",
                buttons: [{event:"save",label:"Save"}],
                defaultOption: {value:'zxx',text:'No Linguistic Content'}
            },
            partials:{ dialogBody: document.getElementById('editTrackTemplate').textContent },
            actions: {
                save: function(event){
                    var that = this;
                    if(this.get("trackToEdit") === "" || this.get("trackName") === ""){
                        failer("cancel");
                        return;
                    }

                    $("#editTrackModal").modal("hide");
                    this.set({selectOpen: false});

                    resolver(datalist.map(function(key){
                        switch(key){
                        case 'tid': return that.get("trackToEdit");
                        case 'kind': return that.get("trackKind");
                        case 'name': return that.get("trackName") || "Untitled";
                        case 'lang': return that.get("trackLang")[0];
                        case 'overwrite': return true;
                        }
                    }));
                }
            }
        });
        $("#editTrackModal").on("show", function() {
            var trackList = timeline.trackNames.slice();
            ractive.set({
                trackList: trackList,
                trackToEdit: trackList.length ? trackList[0] : ""
            });
        });

        ractive.observe("trackToEdit",function(trackName){
            var track;
            if(!trackName){ return; }
            track = timeline.getTrack(trackName);
            ractive.set({
                trackName: trackName,
                trackKind: track.kind,
                trackLang: [track.language]
            });
        });

        return function(dl){
            $('#editTrackModal').modal('show');
            datalist = dl;
            return new Promise(function(resolve, reject){
                resolver = resolve;
                failer = reject;
            });
        };
    }());

    //Save Tracks
    var saveTrackData = (function(){
        var ractive, datalist, resolver, failer, saver,
            availableTracks=[], stracks=[];
        ractive = new Dialog({
            el: document.getElementById('saveTrackModal'),
            data: {
                dialogTitle: "Save Tracks",
                tracks: availableTracks,
                selectedTracks: stracks,
                modalId: 'saveTrackModal',
                buttons: [{event:"save",label:"Save"}]
            },
            partials:{ dialogBody: document.getElementById('saveTrackTemplate').textContent },
            actions: {
                save: function(event){
                    var tracks = stracks;

                    $("#saveTrackModal").modal("hide");
                    this.set({selectOpen: false});
                    if(!tracks.length) {
                        failer(new Error('Cancel Save'));
                        return;
                    }

                    resolver(datalist.map(function(key){
                        switch(key){
                        case 'tidlist': return stracks;
                        case 'location': return timeline.saveLocation;
                        case 'saver': return function(listp){ return listp.then(saver); };
                        }
                    }));
                }
            }
        });
        // Saving modal opening
        $("#saveTrackModal").on("show", function(){

            // We do this because ractive can't seem to update correctly with partials
            // even when we use ractive.set
            while(availableTracks.length > 0){ availableTracks.pop(); }
            while(stracks.length > 0){ stracks.pop(); }

            // Because of the issue noted above, we do not use filter either
            timeline.trackNames.forEach(function(track){
                if(timeline.commandStack.isFileSaved(track, timeline.saveLocation)){ return; }
                availableTracks.push({value:track,text:track});
            });
        });

        function serverSaver(exportedTracks){
            var savep = Promise.all(exportedTracks.map(function(fObj){
                var data = new FormData(),
                    textTrack = fObj.track,
                    resource = trackResources.get(textTrack);
                data.append("file", new Blob([fObj.data],{type:fObj.mime}), fObj.name);
                data.append("label", textTrack.label);
                data.append("language", textTrack.language);
                data.append("kind", textTrack.kind);
                data.append("resourceId", resource?resource.id:"");
                data.append("contentId", content.id);
                return new Promise(function(resolve, reject){
                    var xhr = new XMLHttpRequest();
                    xhr.responseType = "json";
                    xhr.open("POST", "/captionaider/save", true);
                    xhr.addEventListener('load', function(){
                        if(xhr.status < 200 || xhr.status > 299){ reject(); }
                        else{
                            trackResources.set(textTrack, xhr.response)
                            resolve(textTrack.label);
                        }
                    }, false);
                    xhr.addEventListener('error', reject, false);
                    xhr.send(data);

                    saveImg.src = "/assets/images/captionAider/loading.gif";
                    saveDiv.style.cssText = 'position:fixed; top:45px; right:0px; width:auto; height:auto; z-index:1000; border-radius:3px; padding:15px; background:linear-gradient(#f7e488, #edc912);';
                    saveText.innerHTML = "Saving...";
                    saveDiv.style.visibility = "visible";

                }).catch(function(){

                    saveDiv.style.background = "linear-gradient(#F59D9D, #F95454)";
                    saveImg.src = "/assets/images/captionAider/Cancel.png";
                    saveText.innerHTML = "Error occurred while saving \""+textTrack.label+ "\".";
                    setTimeout(function(){
                        saveDiv.style.visibility = "hidden";
                    },5000);
                    return null;
                });
            })).then(function(savedTracks){
                return savedTracks.filter(function(t){ return t !== null; });
            });
            savep.then(function(savedTracks){
                if(savedTracks.length === 0){ return; }

                saveDiv.style.background = "linear-gradient(#D6E0D7, #6CC36E)";
                saveImg.src = "/assets/images/captionAider/CheckCircle.png";
                saveText.innerHTML = "Successfully saved track \""+savedTracks+"\".";
                setTimeout(function(){
                    saveDiv.style.visibility = "hidden";
                },5000);
            });
            return savep;
        }

        function widgetSaver(exportedTracks){
            var savep = new Promise(function(resolve, reject){
                EditorWidgets.Save(
                    exportedTracks, timeline.saveLocation,
                    function(){
                        resolve(exportedTracks.map(function(fObj){ return fObj.track.label; }));
                    },
                    function(){
                        alert("Error Saving; please try again.");
                        reject(new Error("Error saving."));
                    }
                );
            });
            return savep;
        }

        return function(dl){
            var savableTracks = timeline.trackNames.filter(function(track){
                return !timeline.commandStack.isFileSaved(track, timeline.saveLocation);
            });

            saver = (timeline.saveLocation === "server")?serverSaver:widgetSaver;
            if(savableTracks.length < 2){
                return Promise.resolve(dl.map(function(key){
                    switch(key){
                    case 'tidlist': return savableTracks;
                    case 'location': return timeline.saveLocation;
                    case 'saver': return function(listp){ return listp.then(saver); };
                    }
                }));
            }
            $('#saveTrackModal').modal('show');
            datalist = dl;
            return new Promise(function(resolve, reject){
                resolver = resolve;
                failer = reject;
            });
        };
    }());

    // Load a track
    var loadTrackData = (function(){
        var ractive, datalist, resolver, failer,
            sources = EditorWidgets.LocalFile.sources;
        ractive = new Dialog({
            el: document.getElementById('loadTrackModal'),
            data: {
                dialogTitle: "Load Track",
                languages: langList,
                trackLang: [],
                trackKind: "subtitles",
                modalId: 'loadTrackModal',
                defaultOption: {value:'zxx',text:'No Linguistic Content'},
                sources: Object.keys(sources).map(function(key){ return {name: key, label: sources[key].label}; }),
                buttons: [{event:"load",label:"Load"}]
            },
            partials:{ dialogBody: document.getElementById('loadTrackTemplate').textContent },
            actions: {
                load: function(event){
                    var that = this;
                    $("#loadTrackModal").modal("hide");
                    this.set({selectOpen: false});

                    EditorWidgets.LocalFile(this.get("loadSource"),/.*\.(vtt|srt|ass|ttml|sub|sbv|lrc|stl)/,function(fileObj){
                        //If the label is omitted, it will be filled in with the file name stripped of extension
                        //That's easier than doing the stripping here, so leave out that parameter unless we can
                        //fill it with user input in the future
                        resolver(datalist.map(function(key){
                            switch(key){
                            case 'tracksrc': return fileObj;
                            case 'kind': return that.get("trackKind");
                            case 'lang': return that.get("trackLang")[0];
                            case 'location': return that.get("loadSource");
                            case 'overwrite': return true;
                            case 'handler':
                                return function(trackp){
                                    trackp.then(function(track){
                                        track.mode = "showing";
                                        commandStack.setFileUnsaved(track.label);
                                    },function(_){
                                        alert("There was an error loading the track.");
                                    });
                                };
                            }
                        }));
                    });
                }
            }
        });

        return function(dl){
            $('#loadTrackModal').modal('show');
            datalist = dl;
            return new Promise(function(resolve, reject){
                resolver = resolve;
                failer = reject;
            });
        };
    }());

    // Show a track
    var showTrackData = (function(){
        var ractive, datalist, resolver, failer, availableTracks=[], stracks=[],
            sources = EditorWidgets.LocalFile.sources;
        ractive = new Dialog({
            el: document.getElementById('showTrackModal'),
            data: {
                dialogTitle: "Show Track",
                tracks: availableTracks,
                selectedTracks: stracks,
                trackKind: "subtitles",
                modalId: 'showTrackModal',
                sources: Object.keys(sources).map(function(key){ return {name: key, label: sources[key].label}; }),
                buttons: [{event:"showT",label:"Show"}]
            },
            partials:{ dialogBody: document.getElementById('showTrackTemplate').textContent },
            actions: {
                showT: function(event){
                    var that = this;
                    $("#showTrackModal").modal("hide");
                    this.set({selectOpen: false});

                    resolver(datalist.map(function(key){
                        switch(key){
                        case 'tracks': return that.get("selectedTracks");
                        }
                    }));
                }
            }
        });

        $('#showTrackModal').on('show',function(){

            // We do this because ractive can't seem to update correctly with partials
            // even when we use ractive.set
            while(availableTracks.length > 0){ availableTracks.pop(); }
            while(stracks.length > 0){ stracks.pop(); }

            // Because of the issue noted above, we do not use filter either
            [].forEach.call(timeline.getCachedTextTracks(), function(track){
                availableTracks.push({value:track,text:track.label});
                if(timeline.hasTextTrack(track.label)){ stracks.push(track); }
            });
        });

        return function(dl){
            $('#showTrackModal').modal('show');
            datalist = dl;
            return new Promise(function(resolve, reject){
                resolver = resolve;
                failer = reject;
            });
        };
    }());

    function loadTranscript(datalist){
        //datalist is always the array ['linesrc']
        return new Promise(function(resolve,reject){
            var f = document.createElement('input');
            f.type = "file";
            f.addEventListener('change',function(evt){
                resolve([evt.target.files[0]]);
            });
            f.click();
        });
    }

    function loadAudio(datalist){
        return new Promise(function(resolve,reject){
            var f = document.createElement('input');
            f.type = "file";
            f.addEventListener('change',function(evt){
                var f = evt.target.files[0];
                resolve(datalist.map(function(key){
                    switch(key){
                    case 'audiosrc': return f;
                    case 'name': return f.name;
                    }
                }));
            });
            f.click();
        });
    }

    //Set Save Location
    var getLocation = (function(){
        var ractive, datalist, resolver,
            targets = EditorWidgets.Save.targets;
        ractive = new Dialog({
            el: document.getElementById('setLocModal'),
            data: {
                dialogTitle: "Set Save Location",
                saveLocations: Object.keys(targets).map(function(key){
                    return {
                        value: key,
                        name: targets[key].label
                    };
                }), saveLocation: "server",
                buttons: [{event:"save",label:"Set Location"}]
            },
            partials:{ dialogBody: document.getElementById('setLocTemplate').textContent },
            actions: {
                save: function(event){
                    var that = this;
                    $("#setLocModal").modal("hide");
                    resolver(datalist.map(function(key){
                        return key === 'location'?that.get("saveLocation"):void 0;
                    }));
                }
            }
        });

        return function(dl){
            $('#setLocModal').modal('show');
            datalist = dl;
            return new Promise(function(resolve, reject){
                resolver = resolve;
            });
        };
    }());

    function getLocationNames(datalist){
        var names = {server:"Server"},
            targets = EditorWidgets.Save.targets;
        Object.keys(targets).forEach(function(key){
            names[key] = targets[key].label;
        });
        return new Promise(function(resolve,reject){
            resolve(datalist.map(function(key){
                return key === 'names'?names:void 0;
            }));
        });
    }

    function getFor(whatfor, datalist){
        switch(whatfor){
        case 'newtrack': return newTrackData(datalist);
        case 'edittrack': return editTrackData(datalist);
        case 'savetrack': return saveTrackData(datalist);
        case 'loadtrack': return loadTrackData(datalist);
        case 'showtrack': return showTrackData(datalist);
        case 'loadlines': return loadTranscript(datalist);
        case 'loadaudio': return loadAudio(datalist);
        case 'location': return getLocation(datalist);
        case 'locationNames': return getLocationNames(datalist);
        }
        return Promise.reject(new Error("Can't get data for "+whatfor));
    }

    function canGetFor(whatfor, datalist){
        switch(whatfor){
        case 'newtrack':
        case 'edittrack':
        case 'savetrack':
        case 'loadtrack':
        case 'showtrack':
        case 'loadlines':
        case 'loadaudio':
        case 'location':
        case 'locationNames': return true;
        }
        return false;
    }

    // Turn off xAPI
    if(xApi){ xApi.record(false); }

    ContentLoader.castContentObject(content).then(function(content){
        return ResourceLibrary.load(content.resourceId).then(function(resource){
            content.settings.showCaptions = "true";
            return {
                content: content,
                resource: resource,
                courseId: courseId,
                contentId: content.id,
                holder: contentHolder,
                permission: "edit",
                screenAdaption: {
                    fit: true,
                    scroll: true,
                    padding: 61
                },
                startTime: 0,
                endTime: -1,
                renderCue: renderCue,
                //noUpdate: true, // Disable transcript player updating for now
                callback: callback
            };
        });
    }).then(ContentRenderer.render);

    function callback(args) {
        var translator = new Ayamel.classes.Translator();

        commandStack = new EditorWidgets.CommandStack();
        trackResources = args.trackResources;
        trackMimes = args.trackMimes;
        videoPlayer = args.mainPlayer;

        timeline = new Timeline(document.getElementById("timeline"), {
            stack: commandStack,
            syncWith: videoPlayer,
            saveLocation: "server",
            dropLocation: "file",
            width: document.body.clientWidth || window.innerWidth,
            length: 3600, start: 0, end: 240,
            trackMode: "showing",
            tool: Timeline.SELECT,
            showControls: true,
            canGetFor: canGetFor,
            getFor: getFor
        });

        updateSpacing();

        captionEditor = CaptionEditor({
            stack: commandStack,
            refresh: function(){ videoPlayer.refreshLayout(); },
            rebuild: function(){ videoPlayer.rebuildCaptions(); },
            timeline: timeline
        });

        // Check for unsaved tracks before leaving
        window.addEventListener('beforeunload',function(e){
            var warning = "You have unsaved tracks. Your unsaved changes will be lost.";
            if(!commandStack.isSavedAt(timeline.saveLocation)){
                e.returnValue = warning;
                return warning;
            }
        }, false);

        window.addEventListener('resize',function(){
            timeline.width = window.innerWidth;
        }, false);

        //Preload tracks into the editor
        videoPlayer.addEventListener('addtexttrack', function(event){
            var track = event.detail.track;
            if(timeline.hasCachedTextTrack(track)){ return; }
            timeline.cacheTextTrack(track,trackMimes.get(track),'server');
        });

        // EVENT TRACK EDITOR event listeners
        timeline.on('select', function(selected){
            selected.segments[0].makeEventTrackEditor(selected.segments[0].cue, videoPlayer);
        })

        timeline.on('unselect', function(deselected){ deselected.segments[0].destroyEventTrackEditor(); })

        //keep the editor and the player menu in sync
        timeline.on('altertrack', function(){ videoPlayer.refreshCaptionMenu(); });

        //TODO: Integrate the next listener into the timeline editor
        timeline.on('activechange', function(){ videoPlayer.rebuildCaptions(); });

        timeline.on('cuechange', function(evt){
            if(evt.fields.indexOf('text') === -1){ return; }
        });

        timeline.on('addtrack',function(evt){
            videoPlayer.addTextTrack(evt.track.textTrack);
            updateSpacing();
        });

        timeline.on('removetrack', function(evt){
            updateSpacing();
        });

        timeline.addMenuItem(['Track','Clone', "Clone with Translation"], {
            name:"Clone with Translation",
            action:function(){
                var tl = this.timeline,
                    tid = this.track.id;
                tl.getFor('newtrack',
                    ['kind','lang','name','mime','overwrite'],
                    {
                        kind: void 0,
                        lang: void 0,
                        mime: void 0,
                        overwrite: false
                    }
                ).then(function(values){
                    tl.cloneTrack(
                        tid,
                        {
                            kind: values[0],
                            lang: values[1],
                            name: values[2],
                            mime: values[3]
                        },
                        function(cue, ott, ntt, mime){
                            var txt = Ayamel.utils.extractPlainText(cue.getCueAsHTML());

                            if(ott.language === ntt.language){
                                return txt;
                            }

                            return translator.translate({
                                srcLang: ott.language,
                                destLang: ntt.language,
                                text: txt
                            }).then(function(data){
                                return data.translations[0].text;
                            }).catch(function(){
                                return txt;
                            });
                        },
                        values[4]
                    );
                });
            }
        });
    }

});