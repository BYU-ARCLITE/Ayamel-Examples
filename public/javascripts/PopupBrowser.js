/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/1/13
 * Time: 9:34 AM
 * To change this template use File | Settings | File Templates.
 */
var PopupBrowser = (function() {

    var selectedContent = null;
    var apply = false;
    var crossDomain = false;
    var host = "/";

    var template =
        '<div id="popupBrowserModal" class="modal bigModal hide fade" tabindex="-1" role="dialog" aria-labelledby="popupBrowserModalLabel" aria-hidden="true">' +
            '<div class="modal-header">' +
                '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>' +
                '<h3 id="myModalLabel">Select content</h3>' +
            '</div>' +
            '<div class="modal-body">' +
                '<ul class="nav nav-pills">' +
                    '<li><a href="#popupBrowserMine" data-load="mine">My Content</a></li>' +
                    '<li><a href="#popupBrowserCourse" data-load="course">Course Content</a></li>' +
                    '<li><a href="#popupBrowserPublic" data-load="public">Public</a></li>' +
                    '<li><a href="#popupBrowserSearch" data-load="search">Search</a></li>' +
                '</ul>' +
                '<div class="tab-content">' +
                    '<div class="tab-pane" id="popupBrowserMine"></div>' +
                    '<div class="tab-pane" id="popupBrowserCourse"></div>' +
                    '<div class="tab-pane" id="popupBrowserPublic"></div>' +
                    '<div class="tab-pane" id="popupBrowserSearch"></div>' +
                '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
                '<div>' +
                    '<button class="btn" data-dismiss="modal" aria-hidden="true">Close</button>' +
                    '<button class="btn btn-primary disabled" id="popupBrowserSelectButton">Select</button>' +
                '</div>' +
            '</div>' +
        '</div>';

    function ajax(path, success) {
        var params = {
            success: success
        };
        if (crossDomain) {
            params.xhrFields = {withCredentials: true};
        }
        $.ajax(host + path, params);
    }

    function click(content, courseId, $element) {
        $(".selectedContent").removeClass("selectedContent");
        $element.addClass("selectedContent");
        $("#popupBrowserSelectButton").removeClass("disabled");
        selectedContent = content;
    }

    var loadingMechanisms = {
        "mine": function($container) {
            ajax("ajax/content/mine", function(data) {
                var labels = [].concat.apply([], data.map(function(d){return d.labels;}));
                ContentItemRenderer.renderAll({
                    content: data,
                    $holder: $container,
                    format: "table",
                    sizing: true,
                    sorting: true,
                    labels: labels,
                    filters: ContentItemRenderer.standardFilters,
                    click: click
                });
            });
        },
        "course": function($container) {
            ajax("ajax/content/course", function(data) {
                $container.html("");
                Object.keys(data).forEach(function(courseName) {
                    $container.append("<h1>" + courseName + "</h1><div id='content_" + courseName+"'></div>");
                    var labels = [].concat.apply([], data[courseName].map(function(d){return d.labels;}));
                    ContentItemRenderer.renderAll({
                        content: data[courseName],
                        $holder: $container.find("#content_" + courseName),
                        format: "table",
                        sizing: true,
                        sorting: true,
                        labels: labels,
                        filters: ContentItemRenderer.standardFilters,
                        click: click
                    });
                });
            });
        },
        "public": function($container) {
            ajax("ajax/content/public", function(data) {
                var labels = [].concat.apply([], data.map(function(d){return d.labels;}));
                ContentItemRenderer.renderAll({
                    content: data,
                    $holder: $container,
                    format: "table",
                    sizing: true,
                    sorting: true,
                    labels: labels,
                    filters: ContentItemRenderer.standardFilters,
                    click: click
                });
            });
        },
        "search": function($container) {
            $container.html("search");
        }
    };

    function createModal(callback) {
        // Create the modal and add it to the document
        var $modal = $(template);
        var $selectButton = $modal.find("#popupBrowserSelectButton");
        $("body").append($modal);

        // Set up the pills
        $modal.find(".nav-pills a").click(function (e) {
            e.preventDefault();
            $(this).tab("show");
            $selectButton.addClass("disabled");

            // Run the loading mechanism
            var m = loadingMechanisms[$(this).attr("data-load")];
            m.call(null, $($(this).attr("href")));
        });
        $modal.on("show", function () {
            apply = false;
            $selectButton.addClass("disabled");
        });


        // Add submission functionality
        $modal.on("hide", function() {
            if (apply)
                callback(selectedContent);
        });
        $selectButton.click(function() {
            if (!$(this).hasClass("disabled")) {
                apply = true;
                $modal.modal("hide");
            }
        });

        return $modal;
    }

    function selectContent(callback) {
        // Attempt to get the modal
        var $popupBrowserModal = $("#popupBrowserModal");

        // If it doesn't exist, create it
        if (!$popupBrowserModal.length) {
            $popupBrowserModal = createModal(callback);
        }

        $popupBrowserModal.modal("show");
    }

    return {
        selectContent: selectContent,
        setCrossDomain: function(value) {
            crossDomain = value;
        },
        setHost: function(value) {
            host = value;
        }
    };
})();