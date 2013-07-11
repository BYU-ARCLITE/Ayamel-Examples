/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/8/13
 * Time: 8:21 AM
 * To change this template use File | Settings | File Templates.
 */
var TranscriptPlayer2 = (function() {

    var templateUrl = "/assets/templates/transcriptPlayer.tmpl.html";

    // TODO: resizing

    function generateData(args) {
        var trackIndex = 0;
        return {
            transcripts: args.captionTracks.map(function(track) {
                var cueIndex = 0;
                return {
                    id: trackHash(track),
                    label: track.label,
                    trackindex: trackIndex++,
                    cues: track.cues.sort(function (a,b) {return a.startTime - b.startTime}).map(function(cue) {
                        return {
                            direction: Ayamel.utils.getTextDirection(cue.text),
                            text: cue.text,
                            cueindex: cueIndex++
                        };
                    })
                };
            })
        };
    }

    function cueHash(cue) {
        return cue.startTime + cue.text + cue.endTime;
    }

    var trackHashCounter = 0;
    function trackHash(track) {
        if (track.resourceId)
            return track.resourceId;
        if (track.hash)
            return track.hash;
        return (track.hash = "" + new Date().getTime() + ("" + trackHashCounter++));
    }

    function TranscriptPlayer2(args) {

        var _this = this;
        var activeId = "";
        var eventListeners = [];
        var activeCues = [];
        var trackCueMap = {};
        var filter = args.filter || function(){};
        var lastUpdate = 0;
        var updateFrequency = 1000;
        var tracks = args.captionTracks;
        var updated = true;
        var $select;
        var $element;

        this.sync = this.syncButton = args.syncButton || false;

        // Create the transcript player from the template
        function render(callback) {
            TemplateEngine.render(templateUrl, generateData(args), function(template, attach) {
                args.$holder.html($element = template);
                eventListeners.forEach(function(listener) {
                    $element[0].addEventListener(listener.event, listener.callback);
                });

                // Set up track selection
                activeId = !!activeId ? activeId : trackHash(tracks[0]);
                $(attach.transcripts).hide().filter("#transcript_" + activeId).show();
                $select = $(attach.select).change(function() {
                    activeId = $(this).val();
                    $(attach.transcripts).hide().filter("#transcript_" + activeId).show();
                }).val(activeId);

                // Set up the sync button
                var $syncButton = $(attach.sync);
                if (_this.syncButton) {
                    $syncButton.button('toggle');
                    $syncButton[0].addEventListener("click", function() {
                        _this.sync = !$(this).hasClass("active");
                    });
                } else
                    $syncButton.remove();

                // Set up cues
                if (!attach.transcripts instanceof Array) {
                    attach.transcripts = [attach.transcripts];
                }
                attach.transcripts.forEach(function(transcript) {
                    var track = tracks[transcript.dataset.trackindex];
                    trackCueMap[trackHash(track)] = {};

                    // For each child
                    var children = [];
                    for(var i=0; i<transcript.children.length; i++) children.push(transcript.children[i]);
                    children.forEach(function (child) {

                        // Add element to the hash cache
                        var cue = track.cues[child.dataset.cueindex];
                        trackCueMap[trackHash(track)][cueHash(cue)] = child;

                        // Run the filter on each child
                        filter(cue, $(child));

                        // Attach clicking
                        child.addEventListener("click", function() {
                            var event = document.createEvent("HTMLEvents");
                            event.initEvent("cueClick", true, true);
                            event.track = track;
                            event.cue = cue;
                            this.dispatchEvent(event);
                        });
                    });
                });

                callback && callback();
            });
        }
        render();

        /*
         * Define the module interface. It must have the following
         *  addEventListener: function(event, callback)
         *  addTrack: function(track)
         *  set currentTime
         *  update: function()
         */
        Object.defineProperties(this, {
            activeTranscript: {
                set: function(value) {
                    $select.val(trackHash(tracks[value]));
                }
            },
            addEventListener: {
                value: function(event, callback) {
                    if ($element)
                        $element[0].addEventListener(event, callback);
                    else
                        eventListeners.push({event: event, callback: callback});
                }
            },
            addTrack: {
                value: function(track) {
                    tracks.push(track);
                    this.update();
                }
            },
            currentTime: {
                set: function(value) {
                    if (!activeId)
                        return;

                    // Unhighlight inactive cues
                    $(activeCues).removeClass("active");

                    // Highlight active cues
                    var track = tracks.filter(function(t){return trackHash(t) === activeId;})[0];
                    activeCues = track.cues.filter(function(cue) {
                        return cue.startTime <= value && cue.endTime >= value;
                    }).map(function (cue) {
                        return trackCueMap[activeId][cueHash(cue)];
                    });
                    $(activeCues).addClass("active");

                    // Possibly scroll
                    if (this.sync && activeCues.length) {
                        var transcript = $("#transcript_" + activeId)[0];
                        var $cue = $(activeCues[0]);
                        transcript.scrollTop = 0;
                        var top = $cue.offset().top - $cue.parent().offset().top;
                        $cue.parent()[0].scrollTop = top - 20;
                    }
                }
            },
            update: {
                value: function() {
                    var updateTime = new Date().getTime();
                    updated = false;

                    if (updateTime >= lastUpdate + updateFrequency) {
                        updated = true;
                        lastUpdate = updateTime;
                        var scrollTop = $("#transcript_" + activeId)[0].scrollTop;
                        render(function() {
                            $("#transcript_" + activeId)[0].scrollTop = scrollTop;
                        });
                    } else {
                        // Try again in twice the frequency
                        window.setTimeout(function() {
                            if (!updated) {
                                _this.update();
                            }
                        }, updateFrequency * 2);
                    }
                }
            }
        });
    }

    return TranscriptPlayer2;
})();