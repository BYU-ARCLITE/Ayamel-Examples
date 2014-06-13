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
			currentTime = 0,
            ractive;

        // Create the transcript player from the template

        ractive = new Ractive({
            el: element,
            template: '<div class="transcriptDisplay">\
                <div class="form-inline">\
                    <select value="{{activeIndex}}">\
                        {{#transcripts:i}}<option value="{{i}}">{{.label}}</option>{{/transcripts}}\
                    </select>\
                    <!--{{#allowsync}}<button on-tap="sync" type="button" class="{{sync?"btn active":"btn"}}" data-toggle="button" title="Sync with media"><i class="icon-refresh"></i></button>{{/allowsync}}-->\
                </div>\
                <div>\
                    {{#transcripts:ti}}\
                    <div class="transcriptContent" style="display:{{ ti === activeIndex ? "block" : "none" }}" data-trackindex="{{ti}}">\
                        {{#.cues:ci}}\
                        <div class="transcriptCue {{direction(.text)}}" on-tap="cueclick" data-cueindex="{{ci}}">{{.text}}</div>\
                        {{/.cues}}\
                    </div>\
                    {{/transcripts}}\
                </div>\
            </div>',
            data: {
                activeIndex: 0,
                transcripts: tracks,
                allowsync: args.syncButton || false,
                sync: args.syncButton || false,
                direction: function(text){ return Ayamel.utils.getTextDirection(text); }
            }
        });
        ractive.on('sync',function(e){ ractive.set('sync',!ractive.data.sync); });
        ractive.on('cueclick',function(e){
			var target = e.original.target,
				ti = target.parentNode.dataset.trackindex,
			    ci = target.dataset.cueindex,
                track = tracks[ti];
			target.dispatchEvent(new CustomEvent("cueclick",{bubbles:true,detail:{track:track,cue:track.cues[ci]}}));
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
                set: function(value){
					ractive.set('sync', !!value);
					return ractive.data.sync;
				},
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
				get: function(){ return currentTime; },
                set: function(value) {
                    var activeCue, parent,
						track = ractive.data.transcripts[ractive.data.activeIndex];
                    currentTime = +value;
					[].forEach.call(document.querySelectorAll('.transcriptContent[data-trackindex="'+ractive.data.activeIndex+'"] > .transcriptCue'),
						function(node){
							var cue = track.cues[node.dataset.cueindex];
							node.classList[(currentTime >= cue.startTime && currentTime <= cue.endTime)?'add':'remove']('active');
						}
					);
                    // Possibly scroll
                    if(!ractive.data.sync){ return; }
                    activeCue = document.querySelector('.transcriptCue.active');
                    if(activeCue){
						parent = activeCue.parentNode;
						parent.scrollTop = activeCue.offsetTop - parent.offsetTop - (parent.offsetHeight - activeCue.offsetHeight)/2;
					}
                }
            },
            update: { value: function() {} }
        });
    }

    return TranscriptPlayer;
})();
