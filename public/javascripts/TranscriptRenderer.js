/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/16/13
 * Time: 4:14 PM
 * To change this template use File | Settings | File Templates.
 */
var TranscriptRenderer = (function() {
    "use strict";

    var pillHeaderContainer = '<ul class="nav nav-pills">{{>headers}}</ul>';
    var pillHeader          = '<li><a href="#transcript_{{id}}">{{name}}</a></li>';

    var pillContentContainer = '<div>{{>contents}}</div>';
    var pillContent          = '<div class="transcriptContent" id="transcript_{{id}}"></div>';

    var cueTemplate = '<div class="transcriptCue {{direction}}" data-start="{{start}}" data-end="{{end}}">{{>text}}</div>';

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

    var allCues = [];

    function makeId(title) {
        return title.replace(/\s/g, "");
    }

    function createHolder(transcripts) {
        var names = transcripts.map(function(t) {return t.title;});

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

        // Enable the tabs
        var $holder = $(header + content);
        $holder.find("a").click(function (e) {
            e.preventDefault();
            $(this).tab("show");

            $holder.find(".transcriptContent").hide();
            $($(this).attr("href")).show();
        });
        $holder.find("li:first-child a").tab("show");
        $holder.find(".transcriptContent:not(:first-child)").hide();

        return $holder;
    }

    function addTranscripts($holder, transcripts, videoPlayer, callback) {
        transcripts.forEach(function (transcript) {

            var $transcriptHolder = $holder.find("#transcript_" + makeId(transcript.title));

            transcript.content.files.forEach(function (file) {
                if (file.mime === "text/vtt") {
                    var language = transcript.language || "en";
                    TextTrack.get({
                        kind: "subtitles",
                        label: transcript.title || "Unnamed",
                        lang: language,
                        url: file.downloadUri,
                        success: function(){
                            this.cues.forEach(function (cue) {
                                var direction = rtlLanguages.indexOf(language) >= 0 ? "rtl" : "ltr";
                                var html = Mustache.to_html(cueTemplate, {
                                    direction: direction,
                                    start: cue.startTime,
                                    end: cue.endTime
                                }, {
                                    text: cue.text
                                });
                                var $cue = $(html);

                                // Possibly bind the video player
                                if (videoPlayer) {
                                    $cue.click(function() {
                                        videoPlayer.currentTime = cue.startTime;
                                    });
                                }

                                if (callback) {
                                    callback($cue, cue, language);
                                }

                                allCues.push({
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

        if (videoPlayer) {
            videoPlayer.addEventListener("timeupdate", function(event) {
                var currentTime = videoPlayer.currentTime;

                // Highlight cues
                allCues.forEach(function(cueState) {
                    if (currentTime >= cueState.startTime && currentTime <= cueState.endTime) {
                        if (!cueState.active) {
                            cueState.$cue.addClass("active");
                            cueState.active = true;
                        }
                    } else {
                        if (cueState.active) {
                            $cue.removeClass("active");
                            cueState.active = false;
                        }
                    }
                })
            });
        }
    }

    return {
        add: function(transcripts, $container, videoPlayer, callback) {
            var $holder = createHolder(transcripts);
            $container.html($holder);
            addTranscripts($holder, transcripts, videoPlayer, callback);
        }
    };

}());