/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/16/13
 * Time: 4:14 PM
 * To change this template use File | Settings | File Templates.
 */
var TranscriptDisplay = (function() {
    "use strict";

    var pillHeaderContainer = '<ul class="nav nav-pills">{{>headers}}</ul>';
    var pillHeader          = '<li><a href="#transcript_{{id}}">{{name}}</a></li>';

    var pillContentContainer = '<div>{{>contents}}</div>';
    var pillContent          = '<div class="transcriptContent" id="transcript_{{id}}"></div>';

    var cueTemplate = '<div class="transcriptCue {{direction}}">{{>text}}</div>';

    var rtlLanguages = [
        "ar", "ara",        // Arabic
        "fa", "per", "fas", // Persian
        "ur", "urd",        // Urdu
        "he", "heb",        // Hebrew
        "syr", "syc",       // Syriac and Classical Syriac
        "dv", "div",        // Dhivehi
        "nqo",              // N'Ko
        "arc", "sam",       // Official Aramaic and Samaritan Aramaic
        "ae", "ave",        // Avestan
        "pal"               // Pahlavi
    ];

    function makeId(title) {
        return title.replace(/\s/g, "");
    }

    function createElement(args) {
        var names = args.transcripts.map(function(t) {return t.title;});

        // Generate the headers
        var headers = names.map(function (name) {
            return Mustache.to_html(pillHeader, {id: makeId(name), name: name});
        }).join("");
        var header = Mustache.to_html(pillHeaderContainer, {}, {headers: headers});

        // Generate the contents
        var contents = names.map(function (name) {
            return Mustache.to_html(pillContent, {id: makeId(name)});
        }).join("");
        var content = Mustache.to_html(pillContentContainer, {}, {contents: contents});

        // Finalize
        var $element =  $('<div id="transcriptDisplay"></div>').append(header + content);
        args.$holder.html($element);

        // Enable the tabs
        $element.find("a").click(function (e) {
            e.preventDefault();
            $(this).tab("show");

            $element.find(".transcriptContent").hide();
            $($(this).attr("href")).show();

            // Throw a tab change event
            var event = document.createEvent("HTMLEvents");
            event.initEvent("transcriptionTabChange", true, true);
            event.tabName = $(this).text();
            var index = names.indexOf($(this).text());
            event.transcript = args.transcripts[index];
            $element[0].dispatchEvent(event);
        });
        $element.find("li:first-child a").tab("show");
        $element.find(".transcriptContent:not(:first-child)").hide();

        return $element;
    }

    function addTranscripts(display, filter) {
        display.transcripts.forEach(function (transcript) {

            // Find the place where we will display the transcript
            var $transcriptHolder = display.$element.find("#transcript_" + makeId(transcript.title));

            // Load the .vtt file
            transcript.content.files.forEach(function (file) {
                if (file.mime === "text/vtt") {
                    var language = transcript.language || "en";
                    var direction = rtlLanguages.indexOf(language) >= 0 ? "rtl" : "ltr";
                    TextTrack.get({
                        kind: "subtitles",
                        label: transcript.title || "Unnamed",
                        lang: language,
                        url: file.downloadUri,
                        success: function(){

                            // Add the cues for the track
                            this.cues.forEach(function (cue) {

                                var html = Mustache.to_html(cueTemplate, {direction: direction}, {text: cue.text});
                                var $cue = $(html).click(function() {

                                    // Throw a transcription cue click event
                                    var event = document.createEvent("HTMLEvents");
                                    event.initEvent("transcriptionCueClick", true, true);
                                    event.cue = cue;
                                    event.cueIndex = cue.track.cues.indexOf(cue);
                                    event.transcript = transcript;
                                    display.$element[0].dispatchEvent(event);
                                });

                                // Possibly do additional work with the cue
                                if (filter) {
                                    filter(cue, $cue);
                                }

                                display.cueStates.push({
                                    $cue: $cue,
                                    startTime: cue.startTime,
                                    endTime: cue.endTime,
                                    active: false
                                });
                                $transcriptHolder.append($cue);
                            });
                        }
                    });
                }
            });
        });
    }

    function TranscriptDisplay(args) {
        this.transcripts = args.transcripts;
        this.$holder = args.$holder;
        this.$element = createElement(args);
        this.cueStates = [];

        // Generate the transcripts
        addTranscripts(this, args.filter);
    }

    TranscriptDisplay.prototype.addEventListener = function(event, callback) {
        this.$element[0].addEventListener(event, callback);
    };

    TranscriptDisplay.prototype.bindToMediaPlayer = function(mediaPlayer) {
        var _this = this;

        // Possibly link this with a media player
        mediaPlayer.addEventListener("timeupdate", function(event) {
            var currentTime = mediaPlayer.currentTime;

            // Highlight cues
            _this.cueStates.forEach(function(cueState) {
                if (currentTime >= cueState.startTime && currentTime <= cueState.endTime) {
                    if (!cueState.active) {
                        cueState.$cue.addClass("active");
                        cueState.active = true;
                    }
                } else {
                    if (cueState.active) {
                        cueState.$cue.removeClass("active");
                        cueState.active = false;
                    }
                }
            })
        });

        this.addEventListener("transcriptionCueClick", function (event) {
            mediaPlayer.currentTime = event.cue.startTime;
        });
    };

    return TranscriptDisplay;

}());