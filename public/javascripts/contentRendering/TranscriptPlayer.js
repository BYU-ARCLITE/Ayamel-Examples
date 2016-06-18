/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/8/13
 * Time: 8:21 AM
 * To change this template use File | Settings | File Templates.
 */
var TranscriptPlayer = (function(){

    // TODO: resizing

    /* args: captionTracks, holder, sync */
    function TranscriptPlayer(args) {

        var currentTime = 0,
            element = args.holder,
            tracks = args.captionTracks.filter(function(track){
                return track.kind === "captions" ||
                       track.kind === "subtitles" ||
                       track.kind === "descriptions";
            }), ractive;

        // Create the transcript player from the template

        ractive = new Ractive({
            el: element,
            template: '<div class="transcriptDisplay">\
                <div class="form-inline transcriptSelect">\
                    <select value="{{activeIndex}}">\
                        {{#transcripts:i}}<option value="{{i}}">{{.label}}</option>{{/transcripts}}\
                    </select>\
                    <button on-tap="sync" type="button" class="{{sync?"btn active":"btn"}}" title="Anchor transcript to media location"><i class="icon-anchor"></i></button>\
                </div>\
                <hr/>\
                <div class="transcriptContentHolder">\
                    {{#transcripts:ti}}\
                    <div class="transcriptContent" style="display:{{ ti === activeIndex ? "block" : "none" }}" data-trackindex="{{ti}}">\
                        {{#[].slice.call(.cues):ci}}\
                        <div class="transcriptCue {{direction(.)}}" on-tap="cueclick" data-cueindex="{{ci}}" data-trackindex="{{ti}}">{{{HTML(.)}}}</div>\
                        {{/.cues}}\
                    </div>\
                    {{/transcripts}}\
                </div>\
            </div>',
            data: {
                activeIndex: 0,
                transcripts: tracks,
                sync: args.sync || false,
                direction: function(cue){ return Ayamel.Text.getDirection(cue.getCueAsHTML().textContent); },
                HTML: function(cue){
                    var HTML = document.createElement('span');
                    HTML.appendChild(args.annotator?
                            args.annotator.Text(cue.text.replace(/<[^]*?>/gm, '')):
                            cue.getCueAsHTML()
                    );
                    return HTML.outerHTML;
                }
            }
        });
        ractive.on('sync',function(e){ ractive.set('sync',!ractive.get("sync")); });
        ractive.on('cueclick',function(e){
            var target = e.node,
                ci = target.dataset.cueindex,
                ti = target.dataset.trackindex,
                track = tracks[ti];
            element.dispatchEvent(new CustomEvent("cueclick",{bubbles:true,detail:{track:track,cue:track.cues[ci]}}));
        });

        /*
         * Define the module interface.
         */
        Object.defineProperties(this, {
            sync: {
                set: function(value){
                    ractive.set('sync', !!value);
                    return ractive.get("sync");
                },
                get: function(){ return ractive.get("sync"); }
            },
            activeTranscript: {
                set: function(value) { ractive.set('activeIndex', value); },
                get: function() { return ractive.get("activeIndex"); }
            },
            addEventListener: {
                value: function(event, callback, capture){ element.addEventListener(event, callback, capture||false); }
            },
            addTrack: {
                value: function(track) {
                    if(track.kind !== "captions" &&
                       track.kind !== "subtitles" &&
                       track.kind !== "descriptions"
                    ){ return; }
                    if(~tracks.indexOf(track)){ return; }
                    ractive.get("transcripts").push(track);
                }
            },
            updateTrack: {
                value: function(track) {
                    var i = tracks.indexOf(track);
                    if(~i){ ractive.set("transcripts["+i+"]", track); }
                }
            },
            currentTime: {
                get: function(){ return currentTime; },
                set: function(value) {
                    var activeCues, parent, top = 1/0, bottom = -1/0,
                        activeIndex = ractive.get("activeIndex"),
                        track = ractive.get("transcripts")[activeIndex];
                    currentTime = +value;
                    [].forEach.call(document.querySelectorAll('.transcriptContent[data-trackindex="'+activeIndex+'"] > .transcriptCue'),
                        function(node){
                            var cue = track.cues[node.dataset.cueindex];
                            node.classList[(currentTime >= cue.startTime && currentTime <= cue.endTime)?'add':'remove']('active');
                        }
                    );

                    // Possibly scroll
                    if(!ractive.get("sync")){ return; }
                    activeCues = document.querySelectorAll('.transcriptContent[data-trackindex="'+activeIndex+'"] > .active');
                    if(activeCues.length === 0){ return; }
                    [].forEach.call(activeCues, function(activeCue){
                        top = Math.min(top, activeCue.offsetTop);
                        bottom = Math.max(bottom, activeCue.offsetTop + activeCue.offsetHeight);
                    });

                    parent = document.querySelector('.transcriptContentHolder');
                    parent.scrollTop = (top - parent.offsetHeight + bottom)/2 - parent.offsetTop;
                }
            },
            update: { value: function(){ ractive.set('transcripts', tracks); } }
        });
    }

    return TranscriptPlayer;
})();
