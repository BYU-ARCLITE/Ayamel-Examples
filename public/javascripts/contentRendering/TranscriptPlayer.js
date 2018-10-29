/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/8/13
 * Time: 8:21 AM
 * To change this template use File | Settings | File Templates.
 */
var TranscriptPlayer = (function(){

    // TODO: resizing

    /* args: captionTracks, holder, sync, annotator */
    function TranscriptPlayer(args) {

        var currentTime = 0,
            annotator = args.annotator,
            element = args.holder,
            tracks = args.captionTracks.filter(function(track){
                return track.kind === "captions" ||
                       track.kind === "subtitles" ||
                       track.kind === "descriptions";
            }), transcriptDisplay,
            // replacing ractive variables
            sync = args.sync || false,
            activeIndex = 0;

        // Transcript DOM
        var transcriptSelect = document.createElement("div"),
            syncButton = document.createElement("button"),
            transcriptContentHolder = document.createElement("div"),
            transcriptSelector = document.createElement("select"),
            iconAnchorElement = document.createElement("i"),
            transcriptDisplay = document.createElement("div");

        (function initTranscriptPlayer() {
            transcriptDisplay.classList.add("transcriptDisplay");
            transcriptSelect.classList.add("form-inline");
            transcriptSelect.classList.add("transcriptSelect");
            transcriptContentHolder.classList.add("transcriptContentHolder");
            iconAnchorElement.classList.add("icon-anchor");
            syncButton.title = "Anchor transcript to media location";

            syncButton.appendChild(iconAnchorElement);
            syncButton.addEventListener("click", function(e) {
                sync = !sync;
                if (sync) {
                    syncButton.classList.add("active");
                }
                else {
                    syncButton.classList.remove("active");
                }
            });
            syncButton.setAttribute("type", "button");
            syncButton.classList.add("btn");
            if (sync) {
                syncButton.classList.add("active");
            }

            transcriptSelect.appendChild(transcriptSelector);
            transcriptSelect.appendChild(syncButton);
            transcriptSelector.addEventListener("change", function(e) {
                activeIndex = e.target.selectedIndex;
                transcriptContentHolder.querySelectorAll(".transcriptContent").forEach(function(t, i) {
                    t.style.display = i == activeIndex ? "block" : "none";
                });
            });

            transcriptDisplay.appendChild(transcriptSelect);
            transcriptDisplay.appendChild(document.createElement("hr"));
            transcriptDisplay.appendChild(transcriptContentHolder);
            element.appendChild(transcriptDisplay);
        })();

        function addTrack(ti) {
            if (tracks.length < ti + 1) { return false; }
            var transcriptOption = document.createElement("option"),
                transcriptContent = document.createElement("div"),
                transcript = tracks[ti];

            transcriptOption.innerHTML = transcript.label;
            transcriptSelector.appendChild(transcriptOption);
            transcriptContent.style.display = activeIndex == ti ? "block" : "none";
            transcriptContent.setAttribute("data-trackindex", ti);
            transcriptContent.classList.add("transcriptContent");

            transcript.cues.forEach(function(cue, i) {
                var q = document.createElement("div"),
                    html_cue = cue.getCueAsHTML();

                q.classList.add("transcriptCue");
                q.classList.add(Ayamel.Text.getDirection(html_cue.textContent));
                q.setAttribute("data-trackindex", ti);
                q.setAttribute("data-cueindex", i);
                q.appendChild(html_cue);
                q.addEventListener("click", function(e) {
                    element.dispatchEvent(new CustomEvent("cueclick",{bubbles:true,detail:{track:transcript,cue:cue}}));
                });
                transcriptContent.appendChild(q);
            });

            transcriptContentHolder.appendChild(transcriptContent);
            return true;
        }

        /*
         * Define the module interface.
         */
        Object.defineProperties(this, {
            sync: {
                set: function(value){
                    sync = !!value;
                    return sync;
                },
                get: function(){ return sync; }
            },
            activeTranscript: {
                set: function(value) {activeIndex = value; },
                get: function() { return activeIndex; }
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
                    tracks.push(track);
                    return addTrack(tracks.indexOf(track));
                }
            },
            updateTrack: {
                value: function(track) {
                    var i = tracks.indexOf(track);
                    if(~i){ console.log("updateTrack not implemented. Report this if the Transcripts are not loading correctly.") }
                }
            },
            currentTime: {
                get: function(){ return currentTime; },
                set: function(value) {
                    var activeCues, parent, top = 1/0, bottom = -1/0,
                        track = tracks[activeIndex];

                    currentTime = +value;
                    [].forEach.call(document.querySelectorAll('.transcriptContent[data-trackindex="'+activeIndex+'"] > .transcriptCue'),
                        function(node){
                            var cue = track.cues[node.dataset.cueindex];
                            node.classList[(currentTime >= cue.startTime && currentTime <= cue.endTime)?'add':'remove']('active');
                        }
                    );
                    // Possibly scroll
                    if(!sync) { return; }
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
            setAnnotator: { value: function(ann){ annotator = ann; } },
            update: { value: function(){ console.log("Transcript Player Update all tracks not implemented. Report this if the transcripts are not loading correctly.") } }
        });
    }

    return TranscriptPlayer;
})();
