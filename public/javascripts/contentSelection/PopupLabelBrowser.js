/**
 * For usage, see https://github.com/BYU-ARCLITE/Ayamel-Examples/wiki/Content-selection
 */
var PopupLabelBrowser = (function() {
    "use strict";
    var selectedContent = null,
        apply = false;

    var template =
        '<div id="popupLabelBrowserModal" class="modal bigModal hide fade" tabindex="-1" role="dialog" aria-labelledby="popupLabelBrowserModalLabel" aria-hidden="true">\
            <div class="modal-header">\
                <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>\
                <h3 id="myModalLabel">Select content by label</h3>\
            </div>\
            <div class="modal-body">\
                <ul class="nav nav-pills">\
                    <li><a href="#popupLabelBrowserMine" data-load="mine">My Content</a></li>\
                    <li><a href="#popupLabelBrowserPublic" data-load="public">Public</a></li>\
                </ul>\
                <div class="tab-content">\
                    <div class="tab-pane" id="popupLabelBrowserMine"></div>\
                    <div class="tab-pane" id="popupLabelBrowserPublic"></div>\
                </div>\
            </div>\
            <div class="modal-footer">\
                <div>\
                    <button class="btn" data-dismiss="modal" aria-hidden="true">Close</button>\
                    <button class="btn btn-primary disabled" id="popupLabelBrowserSelectButton">Select</button>\
                </div>\
            </div>\
        </div>';

    var itemTemplate =
        '<div class="contentItem tableFormat">\
            <div class="contentBadge {{contentType}}" {{#thumbnail}}style="background:url(\'{{thumbnail}}\') center no-repeat;background-size: cover;"{{/thumbnail}}></div>\
            <div class="contentName">{{name}}</div>\
            <div class="contentStats">{{views}} Views</div>\
            <div class="contentIcons">\
                {{#settings.enabledAnnotationDocuments.length}}<i class="icon-bookmark" title="This {{contentType}} has annotations."></i>{{/settings.enabledAnnotationDocuments.length}}\
                {{#content.settings.enabledCaptionTracks.length}}&nbsp;<img src="http://ayamel.byu.edu/assets/images/videos/captions.png" alt="This {{contentType}} has captions." title="This {{contentType}} has captions."/>{{/content.settings.enabledCaptionTracks.length}}\
                {{#(contentType === "video")}}&nbsp;<span class="badge badge-magenta" title="This video is set to level {{(settings.level || "1")}}.">{{(settings.level || "1")}}</span>{{/contentType}}\
            </div>\
        </div>';

    var labelTemplate =
        '{{^labels}}<em>No labels.</em>{{/labels}}\
        {{#labels:i}}\
            <h2><button on-click="hclick:{{i}}" class="btn pull-left {{#(highlighted == i)}}highlight{{/highlighted}}" style="margin: 6px 10px 0 0;"><i class="icon-ok"></i></button>{{.name}}</h2>\
            <div class="contentHolder tableFormat">\
            {{#.items}}{{>item}}{{/.items}}\
            </div>\
        {{/labels}}';

    function renderLabels(args) {
        var ractive, allContent,
            labels = [].concat.apply([], args.content.map(function(d){return d.labels;}));
        labels = labels.filter(function(e, i, arr){ return arr.lastIndexOf(e) === i; });
        labels = labels.map(function(label){
            return {
                name: label,
                items: args.content.filter(function(content) { return content.labels.indexOf(label) > -1; })
            };
        });
        allContent = labels.reduce(function(acc,next){ return acc.concat(next.items); },[]);

        ractive = new Ractive({
            el: args.$holder[0],
            template: labelTemplate,
            partials: {item: itemTemplate},
            data: {
                labels: labels,
                highlighted: -1
            }
        });

        ractive.on('hclick', function(i){
            ractive.set('highlighted', i);
            $("#popupLabelBrowserSelectButton").removeClass("disabled");
            selectedContent = allContent;
        });
    }

    var loadingMechanisms = {
        "mine": function($container) {
            $.ajax("/ajax/content/mine").then(function(data) {
                renderLabels({
                    content: data,
                    $holder: $container
                });
            });
        },
        "public": function($container) {
            $.ajax("/ajax/content/public").then(function(data) {
                renderLabels({
                    content: data,
                    $holder: $container
                });
            });
        }
    };

    function createModal(callback) {
        // Create the modal and add it to the document
        var $modal = $(template),
            $selectButton = $modal.find("#popupLabelBrowserSelectButton");
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
            var $pill = $modal.find(".nav-pills li:first-child a"),
                m = loadingMechanisms[$pill.attr("data-load")];
            $pill.tab("show");
            m.call(null, $($pill.attr("href")));
        });

        // Add submission functionality
        $modal.on("hide", function() {
            if(apply){ callback(selectedContent); }
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
        selectContent: selectContent
    };
}());