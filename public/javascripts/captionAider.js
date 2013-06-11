function renderCue(cue) {
    return captionEditor.make(cue);
}

// Render the content

content.settings = {
    level: 2,
    enabledCaptionTracks: content.settings.enabledCaptionTracks,
    includeTranscriptions: "true"
};
contentHolder = $("#contentHolder")[0];
ContentRenderer.render({
    content: content,
    userId: 1,
    owner: true,
    teacher: false,
    courseId: 0,
    holder: contentHolder,
    coursePrefix: "",
    annotate: true,
    startTime: 0,
    endTime: -1,
    renderCue: renderCue,
    callback: function(args) {
        var commandStack = new EditorWidgets.CommandStack(),
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
            automove = document.getElementById("automove"),
            videoPlayer = args.videoPlayer,
            renderer = videoPlayer.captionRenderer;

        captionEditor = CaptionEditor({
            stack: commandStack,
            renderer: renderer,
            timeline: timeline
        });

        window.addEventListener('resize',function(){
            "use strict";
            timeline.width = window.innerWidth;
//            editor.classList[(window.innerHeight < editor.clientHeight + stage.clientHeight)?'add':'remove']("fade");
        }, false);

        // Set up listeners
        function setlen(){ timeline.length = videoPlayer.duration; timestamp.textContent = timeline.timeCode; }
        function frame_change() { timeline.currentTime = this.currentTime; }

        videoPlayer.addEventListener('loadedmetadata',setlen,false);
        videoPlayer.addEventListener('durationchange',setlen,false);
        videoPlayer.addEventListener("timeupdate",frame_change.bind(videoPlayer),false);
        timeline.on('jump', function(time){ videoPlayer.currentTime = time; });
        timeline.on('move', function(){ renderer.rebuildCaptions(false); });
        timeline.on('resizer', function(){ renderer.rebuildCaptions(false); });
        timeline.on('resizel', function(){ renderer.rebuildCaptions(false); });

        timeline.on('delete',function(seg) {
            "use strict";
            if(timeline.spanInView(seg.startTime,seg.endTime)){
                renderer.rebuildCaptions(true);
            }
        });
        timeline.on('create',function(seg) {
            "use strict";
//            if(automove.classList.contains('active')){
//                timeline.currentTool = Timeline.MOVE;
//                $("#movb").button("toggle");
//            }
            if(seg.active){ renderer.rebuildCaptions(false); }
        });
        timeline.on('unpaste',function(segs) {
            "use strict";
            if(segs.some(function(seg){ return timeline.spanInView(seg.startTime,seg.endTime); })){
                renderer.rebuildCaptions(true);
            }
        });
        timeline.on('paste',function(segs) {
            "use strict";
            if(segs.some(function(seg){ return seg.active; })){ renderer.rebuildCaptions(false); }
        });
        timeline.on('merge',function(seg) {
            "use strict";
            renderer.rebuildCaptions(true);
        });
        timeline.on('unmerge',function(seg) {
            "use strict";
            renderer.rebuildCaptions(true);
        });
        timeline.on('split',function(seg) {
            "use strict";
            renderer.rebuildCaptions(true);
        });
        timeline.on('timeupdate', function(){ timestamp.textContent = timeline.timeCode; });

        // For now, load all the available tracks

    }
});