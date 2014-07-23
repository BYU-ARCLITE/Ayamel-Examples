/**
 * For usage see: https://github.com/BYU-ARCLITE/Ayamel-Examples/wiki/Content-selection
 */
var PopupBrowser = (function() {

    var selectedContent = null;
    var apply = false;
    var crossDomain = false;
    var host = "/";

    var template =
        '<div id="popupBrowserModal" class="modal bigModal hide fade" tabindex="-1" role="dialog" aria-labelledby="popupBrowserModalLabel" aria-hidden="true">\
            <div class="modal-header">\
                <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>\
                <h3 id="myModalLabel">Select content</h3>\
            </div>\
            <div class="modal-body">\
                <ul class="nav nav-pills">\
                    <li><a href="#popupBrowserMine" name="#popupBrowserMine" data-load="mine">My Content</a></li>\
                    <li><a href="#popupBrowserCourse" name="#popupBrowserCourse" data-load="course">Course Content</a></li>\
                    <li><a href="#popupBrowserPublic" name="#popupBrowserPublic" data-load="public">Public</a></li>\
                    <li><a href="#popupBrowserSearch" name="#popupBrowserSearch" data-load="search">Search</a></li>\
                </ul>\
                <div class="tab-content">\
                    <div class="tab-pane" id="popupBrowserMine"></div>\
                    <div class="tab-pane" id="popupBrowserCourse"></div>\
                    <div class="tab-pane" id="popupBrowserPublic"></div>\
                    <div class="tab-pane" id="popupBrowserSearch"></div>\
                </div>\
            </div>\
            <div class="modal-footer">\
                <div>\
                    <button class="btn" data-dismiss="modal" aria-hidden="true">Close</button>\
                    <button class="btn btn-primary disabled" id="popupBrowserSelectButton">Select</button>\
                </div>\
            </div>\
        </div>';

    function ajax(path, success) {
        var params = {
            success: success
        };
        if (crossDomain) {
            params.xhrFields = {withCredentials: true};
        }
        $.ajax(host + path, params);
    }

    function click(content, courseId, element) {
        [].forEach.call(document.querySelectorAll(".selectedContent"),function(n){n.classList.remove("selectedContent");});
        element[0].classList.add("selectedContent");
        document.getElementById("popupBrowserSelectButton").classList.remove("disabled");
        selectedContent = content;
    }

    var loadingMechanisms = {
        "mine": function(container) {
            ajax("ajax/content/mine", function(data) {
                var labels = [].concat.apply([], data.map(function(d){return d.labels;}));
                ContentItemRenderer.renderAll({
                    content: data,
                    courseId: 0,
                    holder: container,
                    format: "table",
                    sizing: true,
                    sorting: true,
                    labels: labels,
                    filters: ContentItemRenderer.standardFilters,
                    click: click
                });
            });
        },
        "course": function(container) {
            ajax("ajax/content/course", function(data) {
                container.innerHTML = "";
                Object.keys(data).forEach(function(courseName, index) {
                    var id = "courseContent" + index;
                    container.appendChild(Ayamel.utils.parseHTML("<h1>" + courseName + "</h1><div id='" + id + "'></div>"));
                    var labels = [].concat.apply([], data[courseName].map(function(d){return d.labels;}));
                    ContentItemRenderer.renderAll({
                        content: data[courseName],
                        courseId: index,
                        holder: container.querySelector("#" + id),
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
        "public": function(container) {
            ajax("ajax/content/public", function(data) {
                var labels = [].concat.apply([], data.map(function(d){return d.labels;}));
                ContentItemRenderer.renderAll({
                    content: data,
                    courseId: 0,
                    holder: container,
                    format: "table",
                    sizing: true,
                    sorting: true,
                    labels: labels,
                    filters: ContentItemRenderer.standardFilters,
                    click: click
                });
            });
        },
        "search": function(container) {
            container.innerHTML = "search";
        }
    };

    function createModal(callback) {
        // Create the modal and add it to the document
        var $modal = $(template);
        var $selectButton = $modal.find("#popupBrowserSelectButton");
        $("body").append($modal);

        // Prevent pill events from spilling into the modal
        $modal.find(".modal-body")
            .on("show", function(e) {
                e.stopPropagation();
            }).on("shown", function(e) {
                e.stopPropagation();
            });

        // Set up the pills
        $modal.find(".nav-pills a").click(function (e) {
            e.preventDefault();
            $(this).tab("show");
            $selectButton.addClass("disabled");

            // Run the loading mechanism
            loadingMechanisms[this.dataset["load"]](document.querySelector(this.name));
        });
        $modal.on("show", function () {
            apply = false;
            $selectButton.addClass("disabled");
        });
        $modal.on("shown", function() {
            // Enable the first tab
            var $pill = $modal.find(".nav-pills li:first-child a");
            $pill.tab("show");
            loadingMechanisms[$pill.attr("data-load")](document.querySelector($pill.attr("href")));
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
        },
        getHost: function() {
            return host;
        }
    };
})();