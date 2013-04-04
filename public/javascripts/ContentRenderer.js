var ContentRenderer = (function () {
    "use strict";

    var resourceLibraryUrl = "";

    function renderResource(resourceId) {
        var resourceUrl = resourceLibraryUrl + "/" + resourceId;
        new Resource(resourceUrl, function (resource) {

            console.log(resource);

        });
    }

    function ContentRenderer() {}
    ContentRenderer.prototype.render = function(content) {
        if (typeof content == "object") {
            renderResource(content.resourceId);
        }
        if (typeof content == "number") {
            $.ajax("/content/" + content + "/json", {
                dataType: "json",
                success: function (data) {
                    renderResource(data);
                }
            });
        }
    };
    ContentRenderer.prototype.setResourceLibraryUrl = function(url) {
        resourceLibraryUrl = url;
    };

    return new ContentRenderer();
}());