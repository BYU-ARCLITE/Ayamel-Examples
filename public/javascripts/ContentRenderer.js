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

    function renderImage(resource, holder) {
        var file = findFile(resource, function (file) {
            return file.representation === "original";
        });
        if (file === null) {
            $(holder).html("<em>There was an error displaying this content</em>");
        } else {

            // Create a container for the image
            var $imgHolder = $("<div id='imgHolder'></div>");
            $(holder).append($imgHolder);

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

    function renderVideo(resource, holder) {
        // TODO: Render video
    }

    function renderAudio(resource, holder) {
        // TODO: Render audio
    }

    function renderResource(resourceId, holder) {
        var resourceUrl = resourceLibraryUrl + "/" + resourceId;
        new Resource(resourceUrl, function (resource) {

            switch (resource.type) {
                case "image":
                    renderImage(resource, holder);
                    break;
            }
        });
    }

    return {

        render: function (content, holder) {
            if (typeof content == "object") {
                renderResource(content.resourceId, holder);
            }
            if (typeof content == "number") {
                $.ajax("/content/" + content + "/json", {
                    dataType: "json",
                    success: function (data) {
                        renderResource(data, holder);
                    }
                });
            }
        },

        setResourceLibraryUrl: function (url) {
            resourceLibraryUrl = url;
        }
    };
}());