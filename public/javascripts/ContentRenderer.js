var ContentRenderer = (function () {
    "use strict";

    var resourceLibraryUrl = "";

    function findFile(resource, criteriaFunction) {
        for (var i = 0; i < resource.content.files.length; i++) {
            var file = resource.content.files[i];
            if (criteriaFunction(file)) {
                return file;
            }
        }
        return null;
    }

    /*
     * =====================
     *    Image Rendering
     */

    function renderImage(content, resource, holder) {
        var file = findFile(resource, function (file) {
            return file.representation === "original";
        });
        if (file === null) {
            $(holder).html("<em>There was an error displaying this content</em>");
        } else {

            // Create a container for the image
            var $imgHolder = $("<div id='imgHolder'></div>");
            $(holder).html($imgHolder);

            // Display the image
            var url = file.downloadUri;
            $imgHolder.css("background-image", "url('" + url + "')");

            // Load the image and check its dimensions to see if it is smaller than our display area. If so, change the
            // sizing of it.
            var img = new Image();
            img.src = url;
            img.onload = function () {
                if (this.width <= $imgHolder.width() && this.height <= $imgHolder.height()) {
                    $imgHolder.css("background-size", "initial");
                }
            };
        }
    }

    /*
     * =====================
     *    Video Rendering
     */

    function renderVideoLevel1(resource, holder) {

        // Install the HTML5 video player
        // TODO: Install other players

        var $player = $('<div id="player"></div>');
        $(holder).html($player);
        Ayamel.AddVideoPlayer(h5PlayerInstall, 1, function() {

            // Create the player
            var videoPlayer = new Ayamel.VideoPlayer({
                element: $player[0],
                aspectRatio: 45,
                resource: resource
            });
        });
    }

    function renderVideoLevel2(resource, holder) {
        $(holder).html("<em>Playback at this level has not been implemented yet.</em>");
    }

    function renderVideoLevel3(resource, holder) {
        $(holder).html("<em>Playback at this level has not been implemented yet.</em>");
    }

    function renderVideoLevel4(resource, holder) {
        $(holder).html("<em>Playback at this level has not been implemented yet.</em>");
    }

    function renderVideoLevel5(resource, holder) {
        $(holder).html("<em>Playback at this level has not been implemented yet.</em>");
    }

    function renderVideo(content, resource, holder) {
        // Render video
        switch (content.settings.level) {
            case "1":
                renderVideoLevel1(resource, holder);
                break;
            case "2":
                renderVideoLevel2(resource, holder);
                break;
            case "3":
                renderVideoLevel3(resource, holder);
                break;
            case "4":
                renderVideoLevel4(resource, holder);
                break;
            case "5":
                renderVideoLevel5(resource, holder);
                break;
        }
    }

    function renderAudio(content, resource, holder) {
        var file = findFile(resource, function (file) {
            return file.representation === "original";
        });
        if (file === null) {
            $(holder).html("<em>There was an error displaying this content</em>");
        } else {

            // TODO: Add an audio player to the Ayamel.js player
            // Create the audio player
            var $audio = $('<audio id="player" controls="controls"></audio>');
            $(holder).html($audio);

            // Get the URL from the resource and add it as an audio source
            var url =  file.downloadUri;
            var mime = file.mime;
            $audio.append('<source src="' + url + '" type="' + mime + '">');
        }
    }

    function renderPlaylist(content, holder) {
        PlaylistRenderer.render(content.resourceId, holder);
    }

    function renderContent(content, holder) {
        var resourceUrl = resourceLibraryUrl + "/" + content.resourceId;

        // Check if we are rendering something from the resource library
        if (content.contentType === "video" || content.contentType === "audio" || content.contentType === "image") {
            new Resource(resourceUrl, function (resource) {
                switch (resource.type) {
                    case "audio":
                        renderAudio(content, resource, holder);
                        break;
                    case "image":
                        renderImage(content, resource, holder);
                        break;
                    case "video":
                        renderVideo(content, resource, holder);
                        break;
                }
            });
        } else if (content.contentType === "playlist") {
            renderPlaylist(content, holder);
        }
    }

    return {

        render: function (content, holder) {
            if (typeof content == "object") {
                renderContent(content, holder);
            }
            if (typeof content == "number") {
                $.ajax("/content/" + content + "/json", {
                    dataType: "json",
                    success: function (data) {
                        renderContent(data, holder);
                    }
                });
            }
        },

        setResourceLibraryUrl: function (url) {
            resourceLibraryUrl = url;
        }
    };
}());