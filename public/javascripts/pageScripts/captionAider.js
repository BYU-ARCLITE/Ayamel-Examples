$(function() {
    "use strict";

    var captionEditor, Dialog,
        langList = Object.keys(Ayamel.utils.p1map).map(function (p1) {
            var code = Ayamel.utils.p1map[p1];
            return {code: code, name: Ayamel.utils.getLangName(code)};
        }).sort(function(a,b){ return a.name.localeCompare(b.name); });

    Dialog = Ractive.extend({
        template: '<div class="modal-header">\
            <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>\
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
            <select value="{{trackLang}}">\
            <option value="zxx" selected>No Linguistic Content</option>\
            {{#languages}}<option value="{{.code}}">{{.name}}</option>{{/languages}}\
            </select>\
        </div>\
    </div>';

    function renderCue(renderedCue, area, renderFunc) {
        return captionEditor.make(renderedCue, area, renderFunc);
    }

    // Render the content

    content.settings = {
        level: 2,
        enabledCaptionTracks: content.settings.enabledCaptionTracks,
        includeTranscriptions: "true"
    };
    var $contentHolder = $("#contentHolder");
    var contentHolder = $contentHolder[0];

    // Figure out what size the video player needs to be so that the timeline and tools don't spill over
    var paddingTop = $contentHolder.offset().top;
    // 61px for player controls. 252px for timeline and tools.
    var paddingBottom = 313;

    function updateSpacing() {
        $("#bottomSpacer").css("margin-top", $("#bottomContainer").height() + "px");
        ScreenAdapter.scrollTo(document.body.scrollHeight - window.innerHeight);
    }

    ContentRenderer.render({
        content: content,
        userId: userId,
        owner: owner,
        teacher: teacher,
        courseId: courseId,
        holder: contentHolder,
        coursePrefix: "",
        annotate: true,
        permission: "edit",
//        screenAdaption: {
//            fit: true,
//            padding: 100
//        },
        startTime: 0,
        endTime: -1,
        renderCue: renderCue,
        noUpdate: true, // Disable transcript player updating for now
        callback: function(args) {
            var format = "text/vtt",
                commandStack = new EditorWidgets.CommandStack(),
                timeline = new Timeline(document.getElementById("timeline"), {
                    stack: commandStack,
                    width: document.body.clientWidth || window.innerWidth,
                    length: 3600,
                    start: 0,
                    end: 240,
                    multi: true,
                    tool: Timeline.SELECT
                }),
                timestamp = document.getElementById("timestamp"),
                automove = document.getElementById("moveAfterAddButton"),
                clearRepeatButton = document.getElementById("clearRepeatButton"),
                enableRepeatButton = document.getElementById("enableRepeatButton"),
                repeatIcon = document.getElementById("repeatIcon"),
                videoPlayer = args.videoPlayer,
                transcript = args.transcriptPlayer,
                renderer = videoPlayer.captionRenderer;

            updateSpacing();

            captionEditor = CaptionEditor({
                stack: commandStack,
                renderer: renderer,
                timeline: timeline
            });

            // Check for unsaved tracks before leaving
            window.addEventListener('beforeunload',function(e){
                if(!commandStack.saved){
                    return "You have unsaved tracks. Your unsaved changes will be lost.";
                }
            }, false);

            window.addEventListener('resize',function(){
                timeline.width = window.innerWidth;
            }, false);

            // Set up listeners
            function setlen(){ timeline.length = videoPlayer.duration; timestamp.textContent = timeline.timeCode; }
            function frame_change() { timeline.currentTime = this.currentTime; }

            videoPlayer.addEventListener('loadedmetadata',setlen,false);
            videoPlayer.addEventListener('durationchange',setlen,false);
            videoPlayer.addEventListener("timeupdate",frame_change.bind(videoPlayer),false);

            // Track selection
            videoPlayer.addEventListener("enabletrack", function(event) {
                var track = event.detail.track;
                if (timeline.hasTextTrack(track.label)) { return; }
                timeline.addTextTrack(track, track.mime);
                updateSpacing();
            });
            //videoPlayer.addEventListener("disabletrack", function(event) {
            //    timeline.removeTextTrack(event.detail.track.label);
            //    updateSpacing();
            //});

            timeline.on('jump', function(event){ videoPlayer.currentTime = event.time; });
            timeline.on('timeupdate', function(){ timestamp.textContent = timeline.timeCode; });
            timeline.on('activechange', function(){ renderer.rebuildCaptions(); });
            timeline.on('segcomplete',function(evt) {
                if(!automove.classList.contains('active')){ return; }
                timeline.currentTool = Timeline.MOVE;
                $("#moveToolButton").button("toggle");
            });
            timeline.on('abRepeatEnabled',function(){
                enableRepeatButton.title = "Disable Repeat";
                repeatIcon.className = "icon-circle";
            });
            timeline.on('abRepeatDisabled',function(){
                enableRepeatButton.title = "Enable Repeat";
                repeatIcon.className = "icon-circle-blank";
            });
            timeline.on('abRepeatSet',function(){
                [clearRepeatButton, enableRepeatButton].forEach(function(b){ b.classList.remove('disabled'); });
            });
            timeline.on('abRepeatUnset',function(){
                [clearRepeatButton, enableRepeatButton].forEach(function(b){ b.classList.add('disabled'); });
            });

            timeline.on('addtrack',function(evt){
                videoPlayer.addTextTrack(evt.track.textTrack);
                updateSpacing();
            });

            timeline.on('removetrack',function(){
                updateSpacing();
            });

            //timeline.on("cuechange", function(event) {
            //    transcript.update();
            //});

            Ayamel.KeyBinder.addKeyBinding(Ayamel.KeyBinder.keyCodes['|'], timeline.breakPoint.bind(timeline));
            Ayamel.KeyBinder.addKeyBinding(Ayamel.KeyBinder.keyCodes['\\'], function(){timeline.breakPoint(true);},true);

            automove.addEventListener("click", function() {
                if(automove.classList.contains('active')){
                    automove.classList.remove("btn-yellow");
                    automove.classList.add("btn-inverse");
                } else {
                    automove.classList.add("btn-yellow");
                    automove.classList.remove("btn-inverse");
                }
            }, false);

            //Bind the toolbar buttons

            // Undo/redo buttons
            document.getElementById("undoButton").addEventListener('click',function(){ timeline.commandStack.undo(); },false);
            document.getElementById("redoButton").addEventListener('click',function(){ timeline.commandStack.redo(); },false);

            // Tool buttons
            var toolButtonMap = {};
            toolButtonMap[Timeline.CREATE] = document.getElementById("addCueToolButton");
            toolButtonMap[Timeline.SELECT] = document.getElementById("selectToolButton");
            toolButtonMap[Timeline.DELETE] = document.getElementById("deleteToolButton");
            toolButtonMap[Timeline.MOVE]   = document.getElementById("moveToolButton");
            toolButtonMap[Timeline.SPLIT]  = document.getElementById("splitToolButton");
            toolButtonMap[Timeline.SCROLL] = document.getElementById("scrollToolButton");
            toolButtonMap[Timeline.ORDER]  = document.getElementById("reorderToolButton");
            toolButtonMap[Timeline.SHIFT]  = document.getElementById("timeShiftToolButton");
            toolButtonMap[Timeline.REPEAT] = document.getElementById("repeatToolButton");
            function setTool(tool){
                timeline.currentTool = +tool;
            }
            Object.keys(toolButtonMap).forEach(function(tool) {
                toolButtonMap[tool].addEventListener("click", setTool.bind(null, tool), false);
            });

            /*
             * Set up keyboard shortcuts
             * a - Add
             * s - Select
             * d - Delete
             * v - Move
             * q - Split
             * r - Scroll
             * e - Reorder
             * f - Time shift
             * w - Set repeat tool
             */
            var keyboardShortcuts = {};
            keyboardShortcuts[Ayamel.KeyBinder.keyCodes.a] = Timeline.CREATE;
            keyboardShortcuts[Ayamel.KeyBinder.keyCodes.s] = Timeline.SELECT;
            keyboardShortcuts[Ayamel.KeyBinder.keyCodes.d] = Timeline.DELETE;
            keyboardShortcuts[Ayamel.KeyBinder.keyCodes.v] = Timeline.MOVE;
            keyboardShortcuts[Ayamel.KeyBinder.keyCodes.q] = Timeline.SPLIT;
            keyboardShortcuts[Ayamel.KeyBinder.keyCodes.r] = Timeline.SCROLL;
            keyboardShortcuts[Ayamel.KeyBinder.keyCodes.e] = Timeline.ORDER;
            keyboardShortcuts[Ayamel.KeyBinder.keyCodes.f] = Timeline.SHIFT;
            keyboardShortcuts[Ayamel.KeyBinder.keyCodes.w] = Timeline.REPEAT;
            Object.keys(keyboardShortcuts).forEach(function(key) {
                Ayamel.KeyBinder.addKeyBinding(key, function() {
                    // Only do the shortcut if:
                    //  1. We aren't in an input
                    //  2. A modal isn't open
                    var inputFocused = ["TEXTAREA", "INPUT"].indexOf(document.activeElement.nodeName) > -1;
                    var modalOpen = $(".modal:visible").length;
                    if (!inputFocused && !modalOpen)
                        $(toolButtonMap[keyboardShortcuts[key]]).click();
                });
            });

            // AB Repeat Controls
            clearRepeatButton.addEventListener('click',function(){ timeline.clearRepeat(); },false);
            enableRepeatButton.addEventListener('click',function(){ timeline.abRepeatOn = !timeline.abRepeatOn; },false);

            //Create New Track
            (function () {
                var ractive,
                    template = '<form class="form-horizontal">\
                        <div class="control-group">\
                            <label class="control-label">Name</label>\
                            <div class="controls">\
                                <input type="text" value="{{trackName}}" placeholder="Name">\
                            </div>\
                        </div>\
                        {{>trackKindSelect}}\
                        <div class="control-group">\
                            <label class="control-label">Format</label>\
                            <div class="controls">\
                                <select value="{{trackMime}}">\
                                    <option value="text/vtt" selected>WebVTT</option>\
                                    <option value="text/srt">SubRip</option>\
                                    <option value="application/ttml+xml">TTML</option>\
                                    <option value="text/x-ssa">Sub Station Alpha</option>\
                                </select>\
                            </div>\
                        </div>\
                        {{>trackLangSelect}}\
                    </form>';
                ractive = new Dialog({
                    el: document.getElementById('newTrackModal'),
                    data: {
                        dialogTitle: "Create a new track",
                        languages: langList,
                        buttons: [{event:"create",label:"Create"}]
                    },
                    partials:{ dialogBody: template },
                    actions: {
                        create: function(event){
                            var kind = this.get("trackKind"),
                                name = this.get('trackName') || "Untitled",
                                language = this.get("trackLang"),
                                mime = this.get('trackMime'),
                                track = new TextTrack(kind, name, language);

                            $('#newTrackModal').modal('hide');
                            track.mode = "showing";
                            track.readyState = TextTrack.LOADED;
                            timeline.addTextTrack(track, mime);
                            updateSpacing();

                            // Clear the form
                            this.set('trackName',"");
                        }
                    }
                });
            }());

            //Edit Track
            (function(){
                var template = '<form class="form-horizontal">\
                        <div class="control-group">\
                            <label class="control-label">Which Track</label>\
                            <div class="controls">\
                                <select value="{{trackToEdit}}">\
                                {{#trackList}}<option value="{{.}}">{{.}}</option>{{/trackList}}\
                                </select>\
                            </div>\
                        </div>\
                        <div style="display:{{(trackToEdit === "" ? "none" : "block")}}">\
                            <div class="control-group">\
                                <label class="control-label">Name</label>\
                                <div class="controls">\
                                    <input type="text" value="{{trackName}}" placeholder="Name">\
                                </div>\
                            </div>\
                            {{>trackKindSelect}}\
                            {{>trackLangSelect}}\
                        </div>\
                    </form>',
                    ractive = new Dialog({
                        el: document.getElementById("editTrackModal"),
                        data: {
                            dialogTitle: "Edit tracks",
                            languages: langList,
                            buttons: [{event:"save",label:"Save"}]
                        },
                        partials: { dialogBody: template },
                        actions: {
                            save: function(event){
                                timeline.alterTextTrack(
                                    ractive.data.trackToEdit,
                                    ractive.data.trackKind,
                                    ractive.data.trackLang,
                                    ractive.data.trackName,
                                    true);

                                $("#editTrackModal").modal("hide");
                                return false;
                            }
                        }
                    });

                $("#editTrackModal").on("show", function() {
                    ractive.set({
                        trackList: timeline.trackNames.slice(),
                        trackToEdit: ""
                    });
                });

                ractive.observe("trackToEdit",function(trackName){
                    var track;
                    if(trackName === ""){ return; }
                    track = timeline.getTrack(trackName);
                    ractive.set({
                        trackName: trackName,
                        trackKind: track.kind,
                        trackLang: track.language
                    });
                });
            }());

            //Save Tracks
            (function () {
                var ractive,
                    targets = EditorWidgets.Save.targets,
                    template = '<form class="form-horizontal">\
                        <div class="control-group">\
                            <label class="control-label">Which Tracks</label>\
                            <div class="controls">\
                                <select value="{{tracksToSave}}" multiple="multiple">\
                                {{#trackList}}<option value="{{.}}">{{.}}</option>{{/trackList}}\
                                </select>\
                            </div>\
                        </div>\
                        <div class="control-group">\
                            <label class="control-label">Destination</label>\
                            <div class="controls">\
                                <div id="saveDestinations">\
                                    <label class="radio">\
                                        <input type="radio" name="{{saveDestination}}" value="server">Server\
                                    </label>\
                                    {{#saveDestinations}}\
                                    <label class="radio">\
                                        <input type="radio" name="{{saveDestination}}" value="{{.value}}">{{.name}}\
                                    </label>\
                                    {{/saveDestinations}}\
                                </div>\
                            </div>\
                        </div>\
                    </form>';
                ractive = new Dialog({
                    el: document.getElementById('saveTrackModal'),
                    data: {
                        dialogTitle: "Save Tracks",
                        saveDestinations: Object.keys(targets).map(function(key){
                            return {
                                value: key,
                                name: targets[key].label.replace("To ", "")
                            };
                        }), saveDestination: "server",
                        buttons: [{event:"save",label:"Save"}]
                    },
                    partials: { dialogBody: template },
                    actions: {
                        save: function(event){
                            var tracks = this.get("tracksToSave"),
                                destination = this.get("saveDestination"),
                                exportedTracks;

                            $("#saveTrackModal").modal("hide");
                            if(!tracks.length) { return; }

                            exportedTracks = timeline.exportTracks(tracks);

                            if (destination === "server") {
                                // Saving to the server. Provide all the information and data and let it handle everything
                                Object.keys(exportedTracks).forEach(function(key) {
                                    var textTrack = timeline.getTrack(tracks[key]).textTrack,
                                        fObj = exportedTracks[key],
                                        data = new FormData();
                                    data.append("file", new Blob([fObj.data],{type:fObj.mime}), fObj.name);
                                    data.append("label", textTrack.label);
                                    data.append("language", textTrack.language);
                                    data.append("kind", textTrack.kind);
                                    data.append("resourceId", textTrack.resourceId || "");
                                    data.append("contentId", content.id);
                                    $.ajax({
                                        url: "/captionaider/save?course=" + courseId,
                                        data: data,
                                        cache: false,
                                        contentType: false,
                                        processData: false,
                                        type: "post",
                                        dataType: "text",
                                        success: function (data) {
                                            commandStack.setFileSaved(textTrack.label);
                                            textTrack.resourceId = data;
                                            timeline.render();
                                        }
                                    });
                                });
                            } else {
                                // Use one of the editor widget saving mechanisms
                                EditorWidgets.Save(
                                    exportedTracks, destination,
                                    function(){
                                        [].forEach.call(tracks,function(name){
                                            commandStack.setFileSaved(name);
                                        });
                                        timeline.render();
                                    },
                                    function(){ alert("Error Saving; please try again."); }
                                );
                            }
                        }
                    }
                });

                // Saving modal opening
                $("#saveTrackModal").on("show", function () {
                    ractive.set({
                        trackList: timeline.trackNames.slice(),
                        tracksToSave: ""
                    });
                });
            }());

            // Load a track
            (function () {
                var ractive, sources = EditorWidgets.LocalFile.sources,
                    template = '<form class="form-horizontal">\
                        {{>trackKindSelect}}\
                        {{>trackLangSelect}}\
                        <div class="control-group">\
                            <label class="control-label">Source</label>\
                            <div class="controls">\
                                {{#sources}}\
                                <label class="radio"><input type="radio" name="{{loadSource}}" value="{{.name}}">{{.label}}</label>\
                                {{/sources}}\
                            </div>\
                        </div>\
                    </form>';
                ractive = new Dialog({
                    el: document.getElementById('loadTrackModal'),
                    data: {
                        dialogTitle: "Load Track",
                        languages: langList,
                        sources: Object.keys(sources).map(function(key){ return {name: key, label: sources[key].label}; }),
                        buttons: [{event:"load",label:"Load"}]
                    },
                    partials: { dialogBody: template },
                    actions: {
                        load: function(event){
                            var kind = this.get('trackKind');
                            var language = this.get('trackLang');
                            var where = this.get('loadSource');
                            EditorWidgets.LocalFile(where,/.*\.(vtt|srt|ass|ttml)/,function(fileObj){
                                TextTrack.parse({
                                    content: fileObj.data,
                                    mime: fileObj.mime,
                                    kind: kind,
                                    label: fileObj.name,
                                    lang: language,
                                    success: function(track, mime) {
                                        track.mode = "showing";
                                        timeline.addTextTrack(track, mime, true);
                                        updateSpacing();
                                    }
                                });
                            });
                            $("#loadTrackModal").modal("hide");
                        }
                    }
                });
            }());
        }
    });
});