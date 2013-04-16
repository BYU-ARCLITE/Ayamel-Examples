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
    var pillHeader          = '<li><a href="#{{id}}">{{name}}</a></li>';

    var pillContentContainer = '<div>{{>contents}}</div>';
    var pillContent          = '<div class="transcriptContent" id="{{id}}"></div>';

    var cueTemplate = '<div class="transcriptCue" data-start="{{start}}" data-end="{{end}}">{{text}}</div>';

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

    function addTranscripts($holder, transcripts, videoPlayer) {
        transcripts.forEach(function (transcript) {

            var $transcriptHolder = $holder.find("#" + makeId(transcript.title));

            transcript.content.files.forEach(function (file) {
                if (file.mime === "text/vtt") {
                    TextTrack.get({
                        kind: "subtitles",
                        label: transcript.title || "Unnamed",
                        lang: transcript.language || "en",
                        url: file.downloadUri,
                        success: function(){
                            this.cues.forEach(function (cue) {
                                var html = Mustache.to_html(cueTemplate, {
                                    start: cue.startTime,
                                    end: cue.endTime,
                                    text: cue.text
                                });
                                var $cue = $(html).click(function() {
                                    videoPlayer.currentTime = cue.startTime;
                                });
                                $transcriptHolder.append($cue);
                            });
                        }
                    });
                }
            });
        });
    }

    return {
        add: function(transcripts, $container, videoPlayer) {
            var $holder = createHolder(transcripts);
            $container.append($holder);
            addTranscripts($holder, transcripts, videoPlayer);
        }
    };

}());