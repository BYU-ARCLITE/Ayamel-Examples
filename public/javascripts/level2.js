$(function() {

    var renderer;

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