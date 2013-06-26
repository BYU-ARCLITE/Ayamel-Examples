$(function() {
    function renderCue(renderedCue, area) {
        return captionEditor.make(renderedCue, area);
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
                "use strict";
                timeline.width = window.innerWidth;
    //            editor.classList[(window.innerHeight < editor.clientHeight + stage.clientHeight)?'add':'remove']("fade");
            }, false);

            // Set up listeners
            function setlen(){ timeline.length = videoPlayer.duration; timestamp.textContent = timeline.timeCode; }
            function frame_change() {
                timeline.currentTime = this.currentTime;
//                transcript.currentTime = this.currentTime;
            }

            videoPlayer.addEventListener('loadedmetadata',setlen,false);
            videoPlayer.addEventListener('durationchange',setlen,false);
            videoPlayer.addEventListener("timeupdate",frame_change.bind(videoPlayer),false);
            timeline.on('jump', function(time){ videoPlayer.currentTime = time; });
            timeline.on('move', function(){
                renderer.rebuildCaptions(false);
                transcript.update();
            });
            timeline.on('resizer', function(){
                renderer.rebuildCaptions(false);
                transcript.update();
            });
            timeline.on('resizel', function(){
                renderer.rebuildCaptions(false);
                transcript.update();
            });
            timeline.on('addtrack',function(track){
                if (timeline.trackIndices[track.textTrack.label] === undefined) {
                    videoPlayer.captionRenderer.addTextTrack(track.textTrack);
                    videoPlayer.controlBar.addTrack(track.textTrack);
                    transcript.addTrack(track.textTrack)
                }
            });

            timeline.on("cuechange", function(event) {
                transcript.update();
            });

            automove.addEventListener("click", function() {
                if(automove.classList.contains('active')){
                    automove.classList.remove("btn-yellow");
                    automove.classList.add("btn-inverse");
                } else {
                    automove.classList.add("btn-yellow");
                    automove.classList.remove("btn-inverse");
                }
            }, false);

            timeline.on('delete',function(seg) {
                "use strict";
                if(timeline.spanInView(seg.startTime,seg.endTime)){
                    renderer.rebuildCaptions(true);
                    transcript.update();
                }
            });
            timeline.on('create',function(seg) {
                "use strict";
                if(automove.classList.contains('active')){
                    timeline.currentTool = Timeline.MOVE;
                    $("#moveToolButton").button("toggle");
                }
                if(seg.active){
                    renderer.rebuildCaptions(false);
                }
                transcript.update();
            });
            timeline.on('unpaste',function(segs) {
                "use strict";
                if(segs.some(function(seg){ return timeline.spanInView(seg.startTime,seg.endTime); })){
                    renderer.rebuildCaptions(true);
                    transcript.update();
                }
            });
            timeline.on('paste',function(segs) {
                "use strict";
                if(segs.some(function(seg){ return seg.active; })){
                    renderer.rebuildCaptions(false);
                    transcript.update();
                }
            });
            timeline.on('merge',function(seg) {
                "use strict";
                renderer.rebuildCaptions(true);
                transcript.update();
            });
            timeline.on('unmerge',function(seg) {
                "use strict";
                renderer.rebuildCaptions(true);
                transcript.update();
            });
            timeline.on('split',function(seg) {
                "use strict";
                renderer.rebuildCaptions(true);
                transcript.update();
            });
            timeline.on('timeupdate', function(){ timestamp.textContent = timeline.timeCode; });

            // Track selection
            videoPlayer.addEventListener("enabletrack", function(event) {
                if (timeline.trackIndices[event.track.label] === undefined)
                    timeline.addTextTrack(event.track);
            });
            videoPlayer.addEventListener("disabletrack", function(event) {
                timeline.removeTextTrack(event.track.label);
            });

            //Bind the toolbar buttons

            // Undo/redo buttons
            document.getElementById("undoButton").addEventListener('click',function(){ timeline.cstack.undo(); },false);
            document.getElementById("redoButton").addEventListener('click',function(){ timeline.cstack.redo(); },false);

            // Font size buttons
            document.getElementById('plusFontButton').addEventListener('click',function(){ renderer.fontSizeRatio += 0.005; },false);
            document.getElementById('minusFontButton').addEventListener('click',function(){ renderer.fontSizeRatio -= 0.005; },false);

            // Tool buttons
            function setTool(tool){	timeline.currentTool = tool; }
            document.getElementById("selectToolButton").addEventListener('click',setTool.bind(null,Timeline.SELECT),false);
            document.getElementById("moveToolButton").addEventListener('click',setTool.bind(null,Timeline.MOVE),false);
            document.getElementById("timeShiftToolButton").addEventListener('click',setTool.bind(null,Timeline.SHIFT),false);
            document.getElementById("addCueToolButton").addEventListener('click',setTool.bind(null,Timeline.CREATE),false);
            document.getElementById("splitToolButton").addEventListener('click',setTool.bind(null,Timeline.SPLIT),false);
            document.getElementById("deleteToolButton").addEventListener('click',setTool.bind(null,Timeline.DELETE),false);
            document.getElementById("scrollToolButton").addEventListener('click',setTool.bind(null,Timeline.SCROLL),false);
            document.getElementById("reorderToolButton").addEventListener('click',setTool.bind(null,Timeline.ORDER),false);
            document.getElementById("repeatToolButton").addEventListener('click',setTool.bind(null,Timeline.REPEAT),false);

            // AB Repeat Controls
            clearRepeatButton.addEventListener('click',function(){ timeline.clearRepeat(); },false);
            enableRepeatButton.addEventListener('click',function(){ timeline.abRepeatOn = !timeline.abRepeatOn; },false);

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

            // Track buttons
            document.getElementById("createTrackButton").addEventListener("click", function() {
                var $trackName = $("#trackName"),
                    type = $("#trackType").val(),
                    name = $trackName.val() || "Untitled",
                    language = $("#trackLanguage").val(),
                    track = new TextTrack(type, name, language);
                track.mode = "showing";
                track.readyState = TextTrack.LOADED;
                timeline.addTextTrack(track, "text/vtt", true);
                $('#newTrackModal').modal('hide');

                // Add the track to the player and transcript
                videoPlayer.captionRenderer.addTextTrack(track);
                videoPlayer.controlBar.addTrack(track);
                transcript.addTrack(track);

                // Clear the form
                $trackName.val("");
            });

            // Format dropdown menu
            (function(){
                "use strict";
                var $li, li, key, formats = TimedText.mime_types,
                    formatMenu = document.getElementById('formatMenu'),
                    formatLabel = document.getElementById('formatLabel');
                for(key in formats){
                    $li = $("<li><a href='#'></a></li>");
                    li = $li[0];
                    $li.children("a").html(formats[key].extension.toUpperCase());
                    li['data-key'] = key;
                    li.addEventListener('click',function(){
                        format = this['data-key'];
                        formatLabel.innerHTML = $(this).children("a").text();
                    },false);
                    formatMenu.appendChild(li);
                }
            }());

            // Add save destinations
            (function () {
                var targets = EditorWidgets.Save.targets, key;
                for(key in targets) if(targets.hasOwnProperty(key)){
                    $("#saveDestinations").append('<label class="radio">' +
                        '<input type="radio" name="saveDestination" value="' + key + '">' + targets[key].label.replace("To ", "") + '</label>');
                }
            }());

            // Saving modal opening
            $("#saveTrackModal").on("show", function () {
                // Populate the track select
                var $tracksToSave = $("#tracksToSave").html("");
                Object.keys(timeline.trackIndices).map(function(name){
                    $tracksToSave.append('<option value="' + name + '">' + name + '</option>');
                });
            });

            // The saving mechanism
            $("#saveTrackButton").click(function() {
                var tracks = $("#tracksToSave").val(),
                    destination = $("input[name=saveDestination]:checked").val(),
                    key, data, textTrack;
                if (tracks && tracks.length) {
                    var exportedTracks = timeline.exportTracks(tracks);
                    if (destination === "ayamel") {

                        // Saving to the server. Provide all the information and data and let it handle everything
                        for (key in exportedTracks) {
                            textTrack = timeline.getTrack(tracks[key]).textTrack;
                            data = new FormData();
                            data.append("mime", exportedTracks[key].mime);
                            data.append("name", exportedTracks[key].name);
                            data.append("label", textTrack.label);
                            data.append("data", exportedTracks[key].data);
                            data.append("language", textTrack.language);
                            data.append("kind", textTrack.kind);
                            data.append("resourceId", textTrack.resourceId || "");
                            data.append("contentId", content.id);
                            $.ajax({
                                url: "/captionaider/save",
                                data: data,
                                cache: false,
                                contentType: false,
                                processData: false,
                                type: "post",
                                success: function (data) {
                                    alert("Saved Successfully");
                                    commandStack.saved = true;
                                }
                            })
                        }
                    } else {

                        // Use one of the editor widget saving mechanisms
                        EditorWidgets.Save(
                            exportedTracks, destination,
                            function(){
                                commandStack.saved = true;
                                alert("Saved Successfully");
                            },
                            function(){ alert("Error Saving; please try again."); }
                        );
                    }
                }
                $("#saveTrackModal").modal("hide");
            });

            // Add load sources
            (function () {
                var sources = EditorWidgets.LocalFile.sources;
                for(key in sources) if(sources.hasOwnProperty(key)){
                    $("#loadDestinations").append('<label class="radio">' +
                        '<input type="radio" name="loadDestination" value="' + key + '">' + sources[key].label + '</label>');
                }
            }());

            // Loading a track
            $("#loadTrackButton").click(function() {
                var kind = $("#loadType").val();
                var language = $("#loadLanguage").val();
                var where = $("#loadDestination").val();
                EditorWidgets.LocalFile(where,/.*\.(vtt|srt)/,function(fileObj){
                    TextTrack.parse({
                        content: fileObj.data,
                        mime: fileObj.mime,
                        kind: kind,
                        label: fileObj.name,
                        lang: language,
                        success: function(track, mime) {
                            track.mode = "showing";
                            timeline.addTextTrack(track, mime, true);
                            videoPlayer.captionRenderer.addTextTrack(track);
                            videoPlayer.controlBar.addTrack(track);
                            transcript.addTrack(track);
                        }
                    });
                });
                $("#loadTrackModal").modal("hide");
            });
        }
    });
});