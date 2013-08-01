/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/1/13
 * Time: 9:34 AM
 * To change this template use File | Settings | File Templates.
 */
var PopupLabelBrowser = (function() {

    var selectedContent = null;
    var apply = false;
    var crossDomain = false;
    var host = "/";

    var template =
        '<div id="popupLabelBrowserModal" class="modal bigModal hide fade" tabindex="-1" role="dialog" aria-labelledby="popupLabelBrowserModalLabel" aria-hidden="true">' +
            '<div class="modal-header">' +
                '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>' +
                '<h3 id="myModalLabel">Select content by label</h3>' +
            '</div>' +
            '<div class="modal-body">' +
                '<ul class="nav nav-pills">' +
                    '<li><a href="#popupLabelBrowserMine" data-load="mine">My Content</a></li>' +
                    '<li><a href="#popupLabelBrowserPublic" data-load="public">Public</a></li>' +
                '</ul>' +
                '<div class="tab-content">' +
                    '<div class="tab-pane" id="popupLabelBrowserMine"></div>' +
                    '<div class="tab-pane" id="popupLabelBrowserPublic"></div>' +
                '</div>' +
            '</div>' +
            '<div class="modal-footer">' +
                '<div>' +
                    '<button class="btn" data-dismiss="modal" aria-hidden="true">Close</button>' +
                    '<button class="btn btn-primary disabled" id="popupLabelBrowserSelectButton">Select</button>' +
                '</div>' +
            '</div>' +
        '</div>';

    var itemTemplate =
            '<div class="contentItem tableFormat">' +
            '    <div class="contentBadge {{type}}"></div>' +
            '    <div class="contentName">{{title}}</div>' +
            '    <div class="contentStats">{{views}} Views</div>' +
            '    <div class="contentIcons">' +
            '        {{#annotations}}<i class="icon-bookmark" title="This {{type}} has annotations."></i>{{/annotations}}' +
            '        {{#captions}}&nbsp;<img src="http://ayamel.byu.edu/assets/images/videos/captions.png" alt="This {{type}} has captions." title="This {{type}} has captions."/>{{/captions}}' +
            '        {{#isVideo}}&nbsp;<span class="badge badge-magenta" title="This video is set to level {{level}}.">{{level}}</span>{{/isVideo}}' +
            '    </div>' +
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


    function renderItem(content) {
        var html = Mustache.to_html(itemTemplate, {
            title: content.name,
            type: content.contentType,
            views: content.views,
            level: content.settings.level || 1,
            annotations: content.settings.enabledAnnotationDocuments,
            captions: content.settings.enabledCaptionTracks,
            isVideo: content.contentType === "video"
        });
        var $element = $(html);
        if (content.thumbnail) {
            $element.children(".contentBadge")
                .css("background", "url('" + content.thumbnail + "') center no-repeat")
                .css("background-size", "cover");
        }
        return $element;
    }

    function renderLabels(args) {
        var labels = [].concat.apply([], args.content.map(function(d){return d.labels;}))
            .filter(function (e, i, arr) {
                return arr.lastIndexOf(e) === i;
            });
        if (!labels.length)
            args.$holder.html("<em>No labels.</em>");
        else {
            args.$holder.html("");
            labels.forEach(function(label) {
                var $header = $("<h2><button class='btn pull-left' style='margin: 6px 10px 0 0;'><i class='icon-ok'></i></button>" + label + "</h2>");
                var $div = $('<div class="contentHolder tableFormat"></div>');
                var allContent = [];

                // Add content under the labels
                args.content.forEach(function(content) {
                    if (content.labels.indexOf(label) > -1) {
                        $div.append(renderItem(content));
                        allContent.push(content);
                    }
                });

                // Set up label selection
                $header.children("button").click(function() {
                    args.$holder.find("h2").removeClass("highlight");
                    $header.addClass("highlight");
                    $("#popupLabelBrowserSelectButton").removeClass("disabled");
                    selectedContent = allContent;
                });

                args.$holder.append($header);
                args.$holder.append($div);
            });
        }
    }

    var loadingMechanisms = {
        "mine": function($container) {
            ajax("ajax/content/mine", function(data) {
                renderLabels({
                    content: data,
                    $holder: $container
                });
            });
        },
        "public": function($container) {
            ajax("ajax/content/public", function(data) {
                renderLabels({
                    content: data,
                    $holder: $container
                });
            });
        }
    };

    function createModal(callback) {
        // Create the modal and add it to the document
        var $modal = $(template);
        var $selectButton = $modal.find("#popupLabelBrowserSelectButton");
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
            var m = loadingMechanisms[$(this).attr("data-load")];
            m.call(null, $($(this).attr("href")));
        });
        $modal.on("show", function () {
            apply = false;
            $selectButton.addClass("disabled");
        });
        $modal.on("shown", function() {
            // Enable the first tab
            var $pill = $modal.find(".nav-pills li:first-child a");
            $pill.tab("show");
            var m = loadingMechanisms[$pill.attr("data-load")];
            m.call(null, $($pill.attr("href")));
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
        var $popupLabelBrowserModal = $("#popupLabelBrowserModal");

        // If it doesn't exist, create it
        if (!$popupLabelBrowserModal.length) {
            $popupLabelBrowserModal = createModal(callback);
        }

        $popupLabelBrowserModal.modal("show");
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