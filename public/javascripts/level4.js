$(function() {

    var renderer,
        translator;

    var matchData = [
        new SimpleAnnotator.MatchData(/fils/g, "This means son."),
        new SimpleAnnotator.MatchData(/retrouve/g, '<img src="http://simplycatbreeds.org/images/Kitten.jpg" alt="cute!" />'),
        new SimpleAnnotator.MatchData(/la justice/g, '... Something <strong>can</strong> <em>go</em> here.')
    ];

    var annotatorHandler = function(item, content) {
//                $("#annotations").html("<h3>" + $(item).text() + "</h3>" + content);
    };

    var annotatorSetup = function(item, content) {
        $(item).popover({
            container: "body",
            content: content,
            html: true,
            placement: "bottom",
            title: $(item).text(),
            trigger: "hover"
        });
    };

    // Set up the translator
    translator = new TextTranslator($("#definitions").get(0));
    translator.addTranslationEngine(arcliteTranslationEngine, 1);
    translator.addTranslationEngine(wordReferenceTranslationEngine, 2);
    translator.addTranslationEngine(googleTranslationEngine, 3);

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
                    SimpleAnnotator.annotate(matchData, DOMNode, annotatorHandler, annotatorSetup);
                    translator.attach(DOMNode, track.language, "en");
                    return DOMNode;
                }
            });

            // Bind the caption renderer to the video element
            renderer.bindMediaElement(videoElement);

            // Add the caption tracks
            var captionComponent = videoPlayer.controls.getComponent("captions");
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
                            captionComponent.addTrack(track);
                        }
                    });
                });
            });
        });
    });
});