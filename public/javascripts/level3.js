$(function() {

    var renderer,
        translator;

    // Set up the translator
    translator = new TextTranslator($("#definitions").get(0));
    translator.addTranslationEngine(arcliteTranslationEngine, 1);
    translator.addTranslationEngine(wordReferenceTranslationEngine, 2);
    translator.addTranslationEngine(googleTranslationEngine, 3);

    function createCaptionSelectionMenu(parentElement) {
        var template =
            '<div class="dropdown">' +
            '    <a class="btn btn-inverse" data-toggle="dropdown" href="#">Select Caption Track <b class="caret"></b></a>' +
            '    <ul class="dropdown-menu" id="captionTracks" role="menu" aria-labelledby="dLabel">' +
            '    </ul>' +
            '</div>';

        $(parentElement).append(template);
    }

    function addTrackToCaptionSelectionMenu(track) {
        var activeIconTemplate = '<i class="icon-eye-open"></i> ',
            template = '<li><a href="#">{{>active}}{{name}}</a></li>',
            html = Mustache.to_html(template, {
                name: track.label
            }, {
                active: track.mode === "showing" ? activeIconTemplate : ""
            });

        $("#captionTracks")
            .append(html)
            .find("li:last-child > a")
            .click(function () {
                // Disable all the tracks
                renderer.tracks.forEach(function (track) {
                    track.mode = "disabled";
                });

                // Remove the icons
                $("#captionTracks").find(".icon-eye-open").remove();

                // Enable this track
                track.mode = "showing";

                // Add the icon
                $(this).prepend(activeIconTemplate);
            });
    }

    // Load the resource
    new Resource(video.resourceId, function(resource) {

        // Install the html5 video player
        Ayamel.AddVideoPlayer(h5PlayerInstall, 1, function() {
            var player = $('#player').get(0),

                // Create the player
                videoPlayer = new Ayamel.VideoPlayer({
                    element: player,
                    aspectRatio: 45,
                    resource: resource,
                    components: ["play", "volume", "captions"]
                }),
                videoElement = $("#player").find("video").get(0),
                captionsElement = $("#captions").get(0);

            // Create the caption renderer
            renderer = new CaptionRenderer(videoElement, {
                appendCueCanvasTo: captionsElement,
                styleCue: function(DOMNode, track){
                    translator.attach(DOMNode, track.language, "en");
                    return DOMNode;
                }
            });

            // Bind the caption renderer to the video element
            renderer.bindMediaElement(videoElement);

            // Create the caption track menu
            createCaptionSelectionMenu(videoPlayer.controls.captionElement);

            // Add the caption tracks
            video.captionTracks.forEach(function (captionTrack) {

                // Start by getting the resource
                new Resource(captionTrack.resourceId, function (resource) {

                    // Create a text track
                    TextTrack.get({
                        kind: "subtitles",
                        label: captionTrack.name,
                        lang: captionTrack.language,
                        url: resource.content.files[0].downloadUri,
                        success: function(){
                            var track = this;
                            renderer.addTextTrack(track);

                            // If this is the first track then show it
                            if(renderer.tracks.length === 1) {
                                track.mode = 'showing';
                            }

                            // Add the track to the selection menu
                            addTrackToCaptionSelectionMenu(track);
                        }
                    });
                });
            });
        });
    });
});