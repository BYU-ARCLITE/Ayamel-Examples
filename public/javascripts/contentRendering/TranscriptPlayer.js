/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/8/13
 * Time: 8:21 AM
 * To change this template use File | Settings | File Templates.
 */
var TranscriptPlayer = (function() {

    // TODO: resizing

    function TranscriptPlayer(args) {

        var _this = this,
            tracks = args.captionTracks,
            element = args.$holder.get(0),
            ractive;

        // Create the transcript player from the template

        ractive = new Ractive({
            el: element,
            template: '<div class="transcriptDisplay">\
                <div class="form-inline">\
                    <select value="{{activeIndex}}">\
                        {{#transcripts:i}}<option value="{{i}}">{{.label}}</option>{{/transcripts}}\
                    </select>\
                    {{#allowsync}}<button on-tap="sync" type="button" class="{{sync?"btn active":"btn"}}" data-toggle="button" title="Sync with media"><i class="icon-refresh"></i></button>{{/allowsync}}\
                </div>\
                <div>\
                    {{#transcripts:ti}}\
                    {{#(ti === activeId)}}\
                    <div class="transcriptContent">\
                        {{#.cues:ci}}\
						<div class="{{(currentTime > .startTime && currentTime < .endTime)?"transcriptCue active":"active"}} {{direction(.text)}}" on-tap="cueclick:{{ti}},{{ci}}" data-cueindex="{{ci}}">{{.text}}</div>\
						{{/.cues}}\
                    </div>\
                    {{/filter_expr}}\
                    {{/transcripts}}\
                </div>\
            </div>',
            data: {
                currentTime: 0,
                transcripts: tracks,
                allowsync: args.syncButton || false,
                sync: args.syncButton || false,
                direction: function(text){ return Ayamel.utils.getTextDirection(text); }
            }
        });
        ractive.on('sync',function() {
            _this.sync = !_this.sync;
            this.set('sync', _this.sync);
        });
        ractive.on('cueclick',function(e, ti, ci){
            var track = tracks[ti],
                cue = track.cues[ci],
                event = document.createEvent("HTMLEvents");
            event.initEvent("cueClick", true, true);
            event.track = track;
            event.cue = cue;
            e.original.target.dispatchEvent(event);
        });

        /*
         * Define the module interface. It must have the following
         *  addEventListener: function(event, callback)
         *  addTrack: function(track)
         *  set currentTime
         *  update: function()
         */
        Object.defineProperties(this, {
            sync: {
                set: function(value){ ractive.set('sync', !!value); },
                get: function(){ return ractive.data.sync; }
            },
            activeTranscript: {
                set: function(value) { ractive.set('activeIndex', value); },
                get: function() { return ractive.data.activeIndex; }
            },
            addEventListener: {
                value: function(event, callback, capture){ element.addEventListener(event, callback, capture||false); }
            },
            addTrack: {
                value: function(track) {
                    tracks.push(track);
                    ractive.data.transcripts.push(track);
                }
            },
            currentTime: {
                set: function(value) {
                    var activeCue;
                    if(args.noUpdate || !ractive.data.activeId){ return; }
                    ractive.set('currentTime', value);
                    // Possibly scroll
                    if(!ractive.data.sync){ return; }
                    activeCue = ractive.find('.transcriptCue.active');
                    if(activeCue){ activeCue.parentNode.scrollTop = activeCue.offsetTop - activeCue.parentNode.offsetTop - 20; }
                }
            },
            update: { value: function() {} }
        });
    }

    return TranscriptPlayer;
})();