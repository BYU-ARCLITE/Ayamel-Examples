/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 6/13/13
 * Time: 2:59 PM
 * To change this template use File | Settings | File Templates.
 */
var TranscriptPlayer = (function () {

    // TODO: Resizing

    var template =
        '<div class="transcriptDisplay">' +
            '<div class="form-inline"><select></select> <button type="button" class="btn" data-toggle="button" title="Sync with media"><i class="icon-refresh"></i></button></div>' +
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
        var $button;
        var $transcriptContainer;

        // Create the element
        $select = this.$element.find("select").html("");
        $button = this.$element.find("button");
        $transcriptContainer = this.$element.children("div:last-child").html("");

        // Add the tracks
        this.cueMap = {};
        for (i=0; i<this.tracks.length; i++) {
            $select.append(Mustache.to_html(optionTemplate, {index: i, name: this.tracks[i].label}));
            $transcriptContainer.append(renderTranscript.call(this, i));
        }

        // Set up the sync button
        if (this.syncButton) {
            $button.button('toggle');
            $button[0].removeEventListener("click");
            $button[0].addEventListener("click", function() {
                _this.sync = !$(this).hasClass("active");
            });
        } else
            $button.remove();

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
        this.sync = this.syncButton = args.syncButton || false;


        Object.defineProperties(this, {
            currentTime: {
                set: function (value) {
                    var time = Number(value);

                    // Check the active cues Remove highlight
                    _this.activeCues = _this.activeCues.map(function (data) {
                        if (data[1].startTime > time || data[1].endTime < time) {
                            data[0].removeClass("active");
                            return null;
                        }
                        return data;
                    }).filter(function(d){return !!d;});

                    // Highlight any active cues
                    this.tracks[activeTrack].cues.forEach(function (cue) {
                        if (cue.startTime <= time && cue.endTime >= time) {
                            var id = cue.track.cues.indexOf(cue);
                            var $cue = _this.cueMap[activeTrack][id];
                            if (!$cue.hasClass("active")) {
                                $cue.addClass("active");
                                _this.activeCues.push([$cue, cue]);

                                // Scroll
                                if (_this.sync) {
                                    $cue.parent()[0].scrollTop = 0;
                                    var top = $cue.offset().top - $cue.parent().offset().top;
                                    $cue.parent()[0].scrollTop = top - 20;
                                }
                            }
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