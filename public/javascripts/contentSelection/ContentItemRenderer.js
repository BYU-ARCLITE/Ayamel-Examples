/**
 * For usage, see https://github.com/BYU-ARCLITE/Ayamel-Examples/wiki/Content-selection
 */
var ContentItemRenderer = (function() {

    var contentTemplates = {
        block:
            '<div class="contentItem blockFormat">\
                <div class="contentBadge {{type}}" style="{{#thumbnail}}background:url(\'{{thumbnail}}\') center no-repeat;background-size:cover;{{/thumbnail}}"></div>\
                <div class="contentDescription">\
                    <h3>{{title}}</h3>\
                    <div class="contentStats">{{views}} views</div>\
                    <div class="contentIcons">\
                        {{#annotations}}<i class="icon-bookmark" title="This {{type}} has annotations."></i>{{/annotations}}\
                        {{#captions}}&nbsp;<img src="/assets/images/videos/captions.png" alt="This {{type}} has captions." title="This {{type}} has captions."/>{{/captions}}\
                        {{#isVideo}}&nbsp;<span class="badge badge-magenta" title="This video is set to level {{level}}.">{{level}}</span>{{/isVideo}}\
                    </div>\
                </div>\
            </div>',

        table:
            '<div class="contentItem tableFormat">\
                <div class="contentBadge {{type}}" style="{{#thumbnail}}background:url(\'{{thumbnail}}\') center no-repeat;background-size:cover;{{/thumbnail}}"></div>\
                <div class="contentName">{{title}}</div>\
                <div class="contentStats">{{views}} Views</div>\
                <div class="contentIcons">\
                    {{#annotations}}<i class="icon-bookmark" title="This {{type}} has annotations."></i>{{/annotations}}\
                    {{#captions}}&nbsp;<img src="/assets/images/videos/captions.png" alt="This {{type}} has captions." title="This {{type}} has captions."/>{{/captions}}\
                    {{#isVideo}}&nbsp;<span class="badge badge-magenta" title="This video is set to level {{level}}.">{{level}}</span>{{/isVideo}}\
                </div>\
            </div>',

        icon:
            '<div class="contentItem iconFormat">\
                <div class="contentBadge {{type}}" style="{{#thumbnail}}background:url(\'{{thumbnail}}\') center no-repeat;background-size:cover;{{/thumbnail}}"></div>\
            </div>',

        iconContent: //popover for icons
            '<div class="inline-block pad-right-high pull-left">{{views}} views</div>\
            <div class="inline-block pad-left-high pull-right">\
                {{#annotations}}<i class="icon-bookmark" title="This {{type}} has annotations."></i>{{/annotations}}\
                {{#captions}}&nbsp;<img src="/assets/images/videos/captions.png" alt="This {{type}} has captions." title="This {{type}} has captions."/>{{/captions}}\
                {{#isVideo}}&nbsp;<span class="badge badge-magenta" title="This video is set to level {{level}}.">{{level}}</span>{{/isVideo}}\
            </div>\
            <div class="clearfix pad-top-low"></div>'
    };

    var templateConditions = {
        captions: function (content) {
            if (templateConditions.isTimedMedia(content) && content.settings.level < 2)
                return false;
            return !!content.settings.enabledCaptionTracks;
        },
        annotations: function (content) {
            if (templateConditions.isTimedMedia(content) && content.settings.level < 4)
                return false;
            return content.settings.enabledAnnotationDocuments;
        },
        isVideo: function (content) {
            return content.contentType === "video";
        },
        isAudio: function (content) {
            return content.contentType === "audio";
        },
        isTimedMedia: function (content) {
            return (content.contentType === "video") || (content.contentType === "audio");
        }
    }

    function renderContent(args) {
        var ractive,
            content = args.content,
            el = document.createElement('span');

        ractive = new Ractive({
            el: el,
            template: contentTemplates[args.format],
            data: {
                title: content.name,
                type: content.contentType,
                thumbnail: content.thumbnail,
                views: content.views,
                level: content.settings.level || 1,
                annotations: templateConditions.annotations(content),
                captions: templateConditions.captions(content),
                isVideo: templateConditions.isVideo(content)
            }
        });

        el.addEventListener('click', function(){
            if (typeof args.click === 'function') {
                args.click(args.content, args.courseId, $(this));
            } else {
                window.open(
                    args.courseId?"/course/" + args.courseId + "/content/" + args.content.id:
                    args.content.courseId?"/course/" + args.content.courseId + "/content/" + args.content.id:
                    "/content/" + args.content.id,
                    '_blank'
                );
            }
        },false);

        return $(el);
    }

    function enablePopover(content, $element) {
        var ractive = new Ractive({
            el: 'container',
            template: contentTemplates.iconContent,
            data: {
                type: content.contentType,
                views: content.views,
                level: content.settings.level || 1,
                annotations: templateConditions.annotations(content),
                captions: templateConditions.captions(content),
                isVideo: templateConditions.isVideo(content)
            }
        });

        $element.popover({
            html:true,
            placement: "bottom",
            trigger: "hover",
            title: content.name,
            content: ractive.toHTML(),
            container: "body"
        });
    }

    function adjustFormat(args) {
        var tableThreshold = 20;
        return (args.content.length > tableThreshold)?"table":"block";
    }

    function createSizer(args) {
        var template =
            '<div class="btn-group" data-toggle="buttons-radio">\
                <button class="btn" data-format="block"><i class="icon-th-large"></i></button>\
                <button class="btn" data-format="table"><i class="icon-th-list"></i></button>\
                <button class="btn" data-format="icon"><i class="icon-th"></i></button>\
            </div>';

        var $element = $(template).button();
        $element.children("button[data-format='" + args.format + "']").addClass("active");
        $element.children("button").click(function() {
            var format = $(this).attr("data-format");
            ContentItemRenderer.renderAll({
                content: args.content,
                $holder: args.$holder,
                format: format,
                sizing: true,
                sorting: args.sorting,
                organization: args.organization,
                labels: args.labels,
                filters: args.filters,
                courseId: args.courseId,
                click: args.click
            });
        });

        return $element;
    }

    function createOrganizer(args) {
        var template =
            '<div class="btn-group" data-toggle="buttons-radio">\
                <button class="btn" data-organization="contentType"><i class="icon-play-circle"></i> Content Type</button>\
                <button class="btn" data-organization="labels"><i class="icon-tags"></i> Labels</button>\
            </div>';

        var $element = $(template).button();
        $element.children("button[data-organization='" + args.organization + "']").addClass("active");
        $element.children("button").click(function() {
            var organization = $(this).attr("data-organization");
            ContentItemRenderer.renderAll({
                content: args.content,
                $holder: args.$holder,
                format: args.format,
                sizing: true,
                sorting: args.sorting,
                organization: organization,
                labels: args.labels,
                filters: args.filters,
                courseId: args.courseId,
                click: args.click
            });
        });

        return $element;
    }

    return {
        render: function(args) {
            var $element = renderContent(args);
            args.$holder.append($element);

            if (args.format === "icon") {
                // Enable the popover
                enablePopover(args.content, $element);
            }
        },

        renderAll: function(args) {
            // Clear out the holder
            args.$holder.html("");

            // Adjust args
            args.format = args.format || "block";
            if (args.format === "auto") {
                args.format = adjustFormat(args);
            }

            // Set up sizing
            if (args.sizing) {
                args.$holder.append(createSizer(args));
            }

            // Set up organizing
            var filters = args.filters;
            if (args.labels) {
                args.organization = args.organization || "labels";
                args.$holder.append(createOrganizer(args));

                if (args.organization === "labels") {
                    filters = {};
                    args.labels.forEach(function (label) {
                        filters['<h3><i class="icon-tag"></i> ' + label + '</h3>'] = function (content) {
                            return content.labels.indexOf(label) >= 0;
                        };
                    });
                    filters['<h3>Unlabeled</h3>'] = function (content) {
                        return content.labels.length === 0;
                    };
                }
            } else {
                args.organization = "contentType";
            }

            // Set up sorting
            if (args.sorting) {
                // TODO: Setup sorting
                console.log("TODO: Setup sorting");
            }


            // Add the content to the holder
            if (filters) {

                // Filter the content into categories
                Object.keys(filters).forEach(function (filterName) {

                    // Filter the content
                    var filteredContent = args.content.filter(filters[filterName]);

                    // If there were results then show them
                    if (filteredContent.length) {

                        // Add the name of the filter
                        args.$holder.append(filterName);

                        // Add the content
                        var $contentHolder = $('<div class="contentHolder ' + args.format + 'Format"></div>');
                        args.$holder.append($contentHolder);
                        filteredContent.forEach(function (content) {
                            ContentItemRenderer.render({
                                content: content,
                                $holder: $contentHolder,
                                format: args.format,
                                courseId: args.courseId,
                                click: args.click
                            })
                        });
                    }
                });
            } else {

                // No filter, so just show everything
                var $contentHolder = $('<div class="contentHolder"></div>');
                args.$holder.append($contentHolder);
                args.content.forEach(function (content) {
                    ContentItemRenderer.render({
                        content: content,
                        $holder: $contentHolder,
                        format: args.format,
                        courseId: args.courseId,
                        click: args.click
                    });
                });
            }
        },
        standardFilters: {
            '<h2 class="pad-top-high"><i class="icon-film"></i> Videos</h2>': function(content) {
                return content.contentType === "video";
            },
            '<h2 class="pad-top-high"><i class="icon-picture"></i> Images</h2>': function(content) {
                return content.contentType === "image";
            },
            '<h2 class="pad-top-high"><i class="icon-volume-up"></i> Audio</h2>': function(content) {
                return content.contentType === "audio";
            },
            '<h2 class="pad-top-high"><i class="icon-file"></i> Text</h2>': function(content) {
                return content.contentType === "text";
            },
            '<h2 class="pad-top-high"><i class="icon-list-ol"></i> Playlists</h2>': function(content) {
                return content.contentType === "playlist";
            },
            '<h2 class="pad-top-high"><i class="icon-question-sign"></i> Question Sets</h2>': function(content) {
                return content.contentType === "questions";
            }
        }
    };
}());
