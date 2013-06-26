/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/23/13
 * Time: 9:27 AM
 * To change this template use File | Settings | File Templates.
 */
var ContentItemRenderer = (function() {

    var contentTemplates = {
        block:
            '<div class="contentItem blockFormat">' +
            '    <div class="contentBadge {{type}}"></div>' +
            '    <div class="contentDescription">' +
            '        <h3>{{title}}</h3>' +
            '        <div class="contentStats">{{views}} views</div>' +
            '        <div class="contentIcons">' +
            '            {{#annotations}}<i class="icon-bookmark" title="This {{type}} has annotations."></i>{{/annotations}}' +
            '            {{#captions}}&nbsp;<img src="/assets/images/videos/captions.png" alt="This {{type}} has captions." title="This {{type}} has captions."/>{{/captions}}' +
            '            {{#isVideo}}&nbsp;<span class="badge badge-magenta" title="This video is set to level {{level}}.">{{level}}</span>{{/isVideo}}' +
            '        </div>' +
            '    </div>' +
            '</div>',

        table:
            '<div class="contentItem tableFormat">' +
            '    <div class="contentBadge {{type}}"></div>' +
            '    <div class="contentName">{{title}}</div>' +
            '    <div class="contentStats">{{views}} Views</div>' +
            '    <div class="contentIcons">' +
            '        {{#annotations}}<i class="icon-bookmark" title="This {{type}} has annotations."></i>{{/annotations}}' +
            '        {{#captions}}&nbsp;<img src="/assets/images/videos/captions.png" alt="This {{type}} has captions." title="This {{type}} has captions."/>{{/captions}}' +
            '        {{#isVideo}}&nbsp;<span class="badge badge-magenta" title="This video is set to level {{level}}.">{{level}}</span>{{/isVideo}}' +
            '    </div>' +
            '</div>',

        icon:
            '<div class="contentItem iconFormat">' +
            '    <div class="contentBadge {{type}}"></div>' +
            '</div>',

        iconContent:
            '<div class="inline-block pad-right-high pull-left">{{views}} views</div>' +
            '<div class="inline-block pad-left-high pull-right">' +
            '    {{#annotations}}<i class="icon-bookmark" title="This {{type}} has annotations."></i>{{/annotations}}' +
            '    {{#captions}}&nbsp;<img src="/assets/images/videos/captions.png" alt="This {{type}} has captions." title="This {{type}} has captions."/>{{/captions}}' +
            '    {{#isVideo}}&nbsp;<span class="badge badge-magenta" title="This video is set to level {{level}}.">{{level}}</span>{{/isVideo}}' +
            '</div>' +
            '<div class="clearfix pad-top-low"></div>',


        conditions: {
            captions: function (content, courseId) {
                return function () {
                    if (courseId)
                        return content.settings["course_" + courseId + ":enabledCaptionTracks"];
                    return content.settings.enabledCaptionTracks;
                };
            },
            annotations: function (content, courseId) {
                return function () {
                    if (courseId)
                        return content.settings["course_" + courseId + ":enabledAnnotationDocuments"];
                    return content.settings.enabledAnnotationDocuments;
                };
            },
            isVideo: function (content) {
                return function () {
                    return content.contentType === "video";
                };
            }
        },

        helpers: {
            level: function (content, courseId) {
                if (courseId) {
                    if (content.settings["course_" + courseId + ":level"])
                        return content.settings["course_" + courseId + ":level"];
                    else
                        return 1;
                }
                if (content.settings.level)
                    return content.settings.level;
                return 1;
            },
            views: function (content) {
                return content.views;
            }
        }
    };

    function renderContent(args) {
        var template = contentTemplates[args.format];

        var html = Mustache.to_html(template, {
            title: args.content.name,
            type: args.content.contentType,
            views: contentTemplates.helpers.views(args.content),
            level: contentTemplates.helpers.level(args.content, args.courseId),
            annotations: contentTemplates.conditions.annotations(args.content, args.courseId),
            captions: contentTemplates.conditions.captions(args.content, args.courseId),
            isVideo: contentTemplates.conditions.isVideo(args.content)
        });

        var $element = $(html).click(function () {
            if (args.courseId) {
                window.location = "/course/" + args.courseId + "/content/" + args.content.id;
            } else {
                window.location = "/content/" + args.content.id;
            }
        });
        if (args.content.thumbnail) {
            $element.children(".contentBadge")
                .css("background", "url('" + args.content.thumbnail + "') center no-repeat")
                .css("background-size", "cover");
        }

        return $element;
    }

    function enablePopover(content, $element) {
        var data = Mustache.to_html(contentTemplates.iconContent, {
            type: content.contentType,
            views: contentTemplates.helpers.views(content),
            level: contentTemplates.helpers.level(content),
            annotations: contentTemplates.conditions.annotations(content),
            captions: contentTemplates.conditions.captions(content),
            isVideo: contentTemplates.conditions.isVideo(content)
        });

        $element.popover({
            html: true,
            placement: "bottom",
            trigger: "hover",
            title: content.name,
            content: data,
            container: "body"
        });
    }

    function adjustFormat(args) {
        var tableThreshold = 20;

        if (args.content.length > tableThreshold) {
            return "table";
        }
        return "block";
    }

    function createSizer(args) {
        var template =
            '<div class="btn-group" data-toggle="buttons-radio">' +
            '    <button class="btn" data-format="block"><i class="icon-th-large"></i></button>' +
            '    <button class="btn" data-format="table"><i class="icon-th-list"></i></button>' +
            '    <button class="btn" data-format="icon"><i class="icon-th"></i></button>' +
            '</div>';

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
                courseId: args.courseId
            });
        });

        return $element;
    }

    function createOrganizer(args) {
        var template =
            '<div class="btn-group" data-toggle="buttons-radio">' +
            '    <button class="btn" data-organization="contentType"><i class="icon-play-circle"></i> Content Type</button>' +
            '    <button class="btn" data-organization="labels"><i class="icon-tags"></i> Labels</button>' +
            '</div>';

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
                courseId: args.courseId
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
                                courseId: args.courseId
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
                        courseId: args.courseId
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
            '<h2 class="pad-top-high"><i class="icon-list-ol"></i> Playlist</h2>': function(content) {
                return content.contentType === "playlist";
            }
        }
    };
}());