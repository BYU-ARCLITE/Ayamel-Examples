$(function() {
    "use strict";

    var captionEditor, videoPlayer,
        trackResources, trackMimes,
        timeline, commandStack, Dialog,
        langList = Object.keys(Ayamel.utils.p1map).map(function (p1) {
            var code = Ayamel.utils.p1map[p1];
            return {value: code, text: Ayamel.utils.getLangName(code)};
        }).sort(function(a,b){ return a.text.localeCompare(b.text); });

    Dialog = Ractive.extend({
        template: '<div class="modal-header">\
            <button type="button" class="close" data-dismiss="modal" aria-hidden="true">X</button>\
            <h3>{{dialogTitle}}</h3>\
        </div>\
        <div class="modal-body">{{>dialogBody}}</div>\
        <div class="modal-footer">\
            {{#buttons}}\
            <button class="btn btn-blue" proxy-tap="buttonpress:{{.event}}">{{.label}}</button>\
            {{/buttons}}\
            <button class="btn" data-dismiss="modal" aria-hidden="true">Close</button>\
        </div>',
        init: function(opts){
            var actions = opts.actions;
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
            <superselect icon="icon-globe" text="Select Language" selection="{{trackLang}}" button="left" open="{{selectOpen}}" multiple="false" options="{{languages}}" modalId="{{modalId}}" defaultValue={{defaultValue}}>\
        </div>\
    </div>';

    Ractive.partials.trackSelect = '<div class="control-group">\
        <div class="controls">\
                <superselect icon="icon-laptop" text="Select Track" selection="{{selectedTracks}}" button="left" open="{{selectOpen}}" multiple="true" options="{{tracks}}" modalId="{{modalId}}">\
        </div>\
    </div>';

    function renderCue(renderedCue, area, renderFunc) {
        return captionEditor.make(renderedCue, area, renderFunc);
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
                defaultValue: {value:'zxx',text:'No Linguistic Content'}
            },
            partials:{ dialogBody: document.getElementById('createTrackTemplate').textContent },
            components:{ superselect: EditorWidgets.SuperSelect },
            actions: {
                create: function(event){
                    var data = this.data;
                    $('#newTrackModal').modal('hide');
                    resolver(datalist.map(function(key){
                        switch(key){
                        case 'kind': return data.trackKind;
                        case 'name': return data.trackName || "Untitled";
                        case 'lang': return data.trackLang[0];
                        case 'mime': return data.trackMime;
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
                defaultValue: {value:'zxx',text:'No Linguistic Content'}
            },
            partials:{ dialogBody: document.getElementById('editTrackTemplate').textContent },
            components:{ superselect: EditorWidgets.SuperSelect },
            actions: {
                save: function(event){
                    var data = this.data;
                    if(data.trackToEdit === "" || data.trackName === ""){
                        failer("cancel");
                        return;
                    }

                    $("#editTrackModal").modal("hide");
                    this.set({selectOpen: false});

                    resolver(datalist.map(function(key){
                        switch(key){
                        case 'tid': return data.trackToEdit;
                        case 'kind': return data.trackKind;
                        case 'name': return data.trackName || "Untitled";
                        case 'lang': return data.trackLang[0];
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
            components:{ superselect: EditorWidgets.SuperSelect },
            actions: {
                save: function(event){
                    var data = this.data,
                        tracks = stracks;

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
                    textTrack = fObj.track;
                data.append("file", new Blob([fObj.data],{type:fObj.mime}), fObj.name);
                data.append("label", textTrack.label);
                data.append("language", textTrack.language);
                data.append("kind", textTrack.kind);
                data.append("resourceId", trackResources.has(textTrack)?
                                          trackResources.get(textTrack).id
                                          :"");
                data.append("contentId", content.id);
                return Promise.resolve($.ajax({
                    url: "/captionaider/save?course=" + courseId,
                    data: data,
                    cache: false,
                    contentType: false,
                    processData: false,
                    type: "post",
                    dataType: "text"
                })).then(function(data){
                    //We really need some way to update cached resources as well as just retrieving newly created ones
                    //That might allow us to save a roundtrip by having this ajax call return the complete updated resource
                    if(!trackResources.has(textTrack)){
                        ResourceLibrary.load(data).then(function(resource){
                            trackResources.set(textTrack, resource);
                        });
                    }
                    return textTrack.label;
                },function(error){
                    alert("Error occurred while saving "+textTrack.label);
                });
            }));
            savep.then(function(){
                alert("Saved Successfully");
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
                defaultValue: {value:'zxx',text:'No Linguistic Content'},
                sources: Object.keys(sources).map(function(key){ return {name: key, label: sources[key].label}; }),
                buttons: [{event:"load",label:"Load"}]
            },
            partials:{ dialogBody: document.getElementById('loadTrackTemplate').textContent },
            components:{ superselect: EditorWidgets.SuperSelect },
            actions: {
                load: function(event){
                    var data = this.data;
                    $("#loadTrackModal").modal("hide");
                    this.set({selectOpen: false});

                    EditorWidgets.LocalFile(data.loadSource,/.*\.(vtt|srt|ass|ttml|sub|sbv|lrc|stl)/,function(fileObj){
                        //If the label is omitted, it will be filled in with the file name stripped of extension
                        //That's easier than doing the stripping here, so leave out that parameter unless we can
                        //fill it with user input in the future
                        resolver(datalist.map(function(key){
                            switch(key){
                            case 'tracksrc': return fileObj;
                            case 'kind': return data.trackKind;
                            case 'lang': return data.trackLang[0];
                            case 'location': return data.loadSource;
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
            components:{ superselect: EditorWidgets.SuperSelect },
            actions: {
                showT: function(event){
                    var data = this.data;
                    $("#showTrackModal").modal("hide");
                    this.set({selectOpen: false});

                    resolver(datalist.map(function(key){
                        switch(key){
                        case 'tracks': return data.selectedTracks;
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
                if (timeline.hasTextTrack(track.label))
                    stracks.push(track);
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
                buttons: [{event:"save",label:"Save"}]
            },
            partials:{ dialogBody: document.getElementById('setLocTemplate').textContent },
            actions: {
                save: function(event){
                    var data = this.data;
                    $("#setLocModal").modal("hide");
                    resolver(datalist.map(function(key){
                        return key === 'location'?data.saveLocation:void 0;
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

    ContentLoader.castContentObject(content).then(function(content){
        if(content.contentType !== 'video'){ throw new Error("Non-Video Content"); }
        else return ResourceLibrary.load(content.resourceId).then(function(resource){
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
        var renderer,
            tplayer = args.transcriptPlayer;

        commandStack = new EditorWidgets.CommandStack();
        trackResources = args.trackResources;
        trackMimes = args.trackMimes;
        videoPlayer = args.mainPlayer;
        renderer = videoPlayer.captionRenderer;

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
            renderer: renderer,
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
        videoPlayer.textTracks.forEach(function(track){
            timeline.cacheTextTrack(track,trackMimes.get(track),'server');
        });

        //keep the editor and the player menu in sync
        timeline.on('altertrack', function(){ videoPlayer.refreshCaptionMenu(); });

        //TODO: Integrate the next listener into the timeline editor
        timeline.on('activechange', function(){ renderer.rebuildCaptions(); });

        timeline.on('cuetextchange', function(evt){ tplayer.updateTrack(evt.cue.track); });

        timeline.on('addtrack',function(evt){
            videoPlayer.addTextTrack(evt.track.textTrack);
            tplayer.addTrack(evt.track.textTrack);
            updateSpacing();
        });

        timeline.on('removetrack', function(evt){
            updateSpacing();
        });

        [   //Set up keyboard shortcuts
            [Ayamel.KeyBinder.keyCodes.a,Timeline.CREATE],  //a - Add
            [Ayamel.KeyBinder.keyCodes.s,Timeline.SELECT],  //s - Select
            [Ayamel.KeyBinder.keyCodes.d,Timeline.DELETE],  //d - Delete
            [Ayamel.KeyBinder.keyCodes.m,Timeline.MOVE],    //m - Move
            [Ayamel.KeyBinder.keyCodes.q,Timeline.SPLIT],   //q - Split
            [Ayamel.KeyBinder.keyCodes.o,Timeline.ORDER],   //o - Reorder
            [Ayamel.KeyBinder.keyCodes.f,Timeline.SHIFT],   //f - Time shift
            [Ayamel.KeyBinder.keyCodes.r,Timeline.REPEAT]   //r - Set repeat tool
        ].forEach(function(pair) {
            var tool = pair[1];
            Ayamel.KeyBinder.addKeyBinding(pair[0], function() {
                // Only do the shortcut if:
                //  1. We aren't in an input
                //  2. A modal isn't open
                var inputFocused = ["TEXTAREA", "INPUT"].indexOf(document.activeElement.nodeName) > -1,
                    modalOpen = document.querySelectorAll(".modal\\:visible").length;
                if (!inputFocused && !modalOpen){ timeline.currentTool = tool; }
            });
        });

        // Autocue controls
        Ayamel.KeyBinder.addKeyBinding(Ayamel.KeyBinder.keyCodes['|'], timeline.breakPoint.bind(timeline),true);

        //undo/redo shortcuts
        document.addEventListener('keydown',function(e){
            if(!e.ctrlKey){ return; }
            switch(e.keyCode){
            case 89: timeline.commandStack.redo();
                break;
            case 90: timeline.commandStack.undo();
                break;
            default: return;
            }
            e.preventDefault();
        },false);
    }
});