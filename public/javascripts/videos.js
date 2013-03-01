$(function() {
    var $videoContainer = $('.videos'),
        videoMap = {},
        videoGroupIndex;

    // Load each video group
    for (videoGroupIndex=0; videoGroupIndex < videoGroups.length; videoGroupIndex++) {
        var videoGroup = videoGroups[videoGroupIndex],
            videoIndex;

        // Render the video group title
        $videoContainer.append('<h2>' + videoGroup.name + '</h2>');

        // Render the videos
        for (videoIndex=0; videoIndex < videoGroup.videos.length; videoIndex++) {
            var video = videoGroup.videos[videoIndex];

            // Cache the video for later lookup by resource ID
            videoMap[video.resourceId] = video;

            // Make the actual rendering a callback of the resource because the loading of resources is asynchronous
            new Resource(video.resourceId, function(resource) {
                var video = videoMap[resource.id];
                VideoRenderer.render(video, resource, $videoContainer);
            });
        }
    }

});