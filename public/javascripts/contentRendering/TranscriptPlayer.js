/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 6/13/13
 * Time: 2:59 PM
 * To change this template use File | Settings | File Templates.
 */
var TranscriptPlayer = (function () {

    // TODO: Adding listeners to the DOM
    // TODO: Sync button
    // TODO: Resizing

    var template =
        '<div class="transcriptDisplay">' +
            '<select></select>' +
            '<div></div>' +
        '</div>';

    var optionTemplate = '<option value={{index}}>{{name}}</option>';

    var cueTemplate = "<div class='transcriptCue {{direction}}'>{{text}}</div>";

    function loadTracks(captionTracks, callback) {
        async.forEach(captionTracks, this.addTrack.bind(this), callback);
    }

    function renderTranscript(index) {
        var _this = this,
            $element = $("<div class='transcriptContent'></div>");

        this.cueMap[index] = {};
        this.tracks[index].cues.forEach(function(cue) {
            var id = cue.track.cues.indexOf(cue);
            var $cue = $(Mustache.to_html(cueTemplate, {text: cue.text, direction: Ayamel.utils.getTextDirection(cue.text)}));
            _this.filter(cue, $cue);
            $cue.click(function() {
                var event = document.createEvent("HTMLEvents");
                event.initEvent("cueClick", true, true);
                event.cue = cue;
                event.track = _this.tracks[index];
                this.dispatchEvent(event);
            });

            _this.cueMap[index][id] = $cue;
            $element.append($cue);
        });
        return $element;
    }

    function render($holder) {
        var _this = this;
        var i;
        var $select;
        var $transcriptContainer;

        // Create the element
        $select = this.$element.children("select").html("");
        $transcriptContainer = this.$element.children("div").html("");

        // Add the tracks
        this.cueMap = {};
        for (i=0; i<this.tracks.length; i++) {
            $select.append(Mustache.to_html(optionTemplate, {index: i, name: this.tracks[i].label}));
            $transcriptContainer.append(renderTranscript.call(this, i));
        }

        // Set up changing
        $select[0].removeEventListener("change");
        $select[0].addEventListener("change", function() {
            _this.activeTranscript = $(this).val();
        });

        $holder.html(this.$element);
    }

    function TranscriptPlayer(args) {
        var _this = this;
        var activeTrack = -1;

        this.$element = $(template);
        this.tracks = [];
        this.activeCues = [];
        this.filter = args.filter || function(){};

        Object.defineProperties(this, {
            currentTime: {
                set: function (value) {
                    var time = Number(value);

                    // Remove highlight
                    _this.activeCues.forEach(function ($cue) {
                        $cue.removeClass("active");
                    });
                    _this.activeCues = [];

                    // Highlight any active cues
                    this.tracks[activeTrack].cues.forEach(function (cue) {
                        if (cue.startTime <= time && cue.endTime >= time) {
                            var id = cue.track.cues.indexOf(cue);
                            var $cue = _this.cueMap[activeTrack][id];
                            $cue.addClass("active");
                            _this.activeCues.push($cue);
                        }
                    });
                }
            },
            activeTranscript: {
                set: function(value) {
                    activeTrack = Number(value);
                    this.$element.find(".transcriptContent").hide();
                    this.$element.find(".transcriptContent:nth-child(" + (activeTrack + 1) + ")").show();

                    var event = document.createEvent("HTMLEvents");
                    event.initEvent("trackChange", true, true);
                    event.track = this.tracks[activeTrack];
                    _this.$element[0].dispatchEvent(event);
                }
            },
            update: {
                value: function() {
                    render.call(this, args.$holder);
                    _this.activeTranscript = activeTrack;
                }
            }
        });

        loadTracks.call(this, args.captionTracks, function () {
            render.call(_this, args.$holder);
            _this.activeTranscript = 0;
        });
    }

    TranscriptPlayer.prototype.addTrack = function (captionTrack, callback) {
        var _this = this;
        callback = callback || function() {
            _this.update();
        };
        if (captionTrack instanceof TextTrack) {
            this.tracks.push(captionTrack);
            callback();
        } else if (captionTrack instanceof ResourceLibrary.Resource) {
            // Get the first file
            var url = captionTrack.content.files[0].downloadUri;
            TextTrack.get({
                url: url,
                kind: "captions",
                label: captionTrack.title,
                lang: captionTrack.language,
                success: function (track) {
                    track.resourceId = captionTrack.id;
                    _this.tracks.push(track);
                    callback();
                }
            })
        } else {
            // For now puke
            throw new Error("Unknown caption track format.");
        }
    };

    TranscriptPlayer.prototype.addEventListener = function(event, callback) {
        this.$element[0].addEventListener(event, callback);
    };

    return TranscriptPlayer;
}());