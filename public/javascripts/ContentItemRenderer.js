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
            '            {{#annotations}}<i class="icon-tags" title="This {{type}} has annotations."></i>{{/annotations}}' +
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
            '        {{#annotations}}<i class="icon-tags" title="This {{type}} has annotations."></i>{{/annotations}}' +
            '        {{#captions}}&nbsp;<img src="/assets/images/videos/captions.png" alt="This {{type}} has captions." title="This {{type}} has captions."/>{{/captions}}' +
            '        {{#isVideo}}&nbsp;<span class="badge badge-magenta" title="This video is set to level {{level}}.">{{level}}</span>{{/isVideo}}' +
            '    </div>' +
            '</div>',

        icon:
            '<div class="contentItem iconFormat">' +
            '    <div class="contentBadge video"></div>' +
            '</div>',

        iconContent:
            '<div class="inline-block pad-right-high pull-left">{{views}} views</div>' +
            '<div class="inline-block pad-left-high pull-right">' +
            '    {{#annotations}}<i class="icon-tags" title="This {{type}} has annotations."></i>{{/annotations}}' +
            '    {{#captions}}&nbsp;<img src="/assets/images/videos/captions.png" alt="This {{type}} has captions." title="This {{type}} has captions."/>{{/captions}}' +
            '    {{#isVideo}}&nbsp;<span class="badge badge-magenta" title="This video is set to level {{level}}.">{{level}}</span>{{/isVideo}}' +
            '</div>' +
            '<div class="clearfix pad-top-low"></div>',


        conditions: {
            captions: function (content) {
                return function () {
                    return content.settings.enabledCaptionTracks;
                };
            },
            annotations: function (content) {
                return function () {
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
            level: function (content) {
                if (content.settings.level)
                    return content.settings.level;
                return 1;
            },
            views: function (content) {
                return content.views;
            }
        }
    };

    function renderContent(content, template) {
        var html = Mustache.to_html(template, {
            title: content.name,
            type: content.contentType,
            views: contentTemplates.helpers.views(content),
            level: contentTemplates.helpers.level(content),
            annotations: contentTemplates.conditions.annotations(content),
            captions: contentTemplates.conditions.captions(content),
            isVideo: contentTemplates.conditions.isVideo(content)
        });

        var $element = $(html).click(function () {
            window.location = "/content/" + content.id;
        });
        if (content.thumbnail) {
            $element.children(".contentBadge")
                .css("background", "url('" + content.thumbnail + "') center no-repeat")
                .css("background-size", "cover");
        }

        return $element;
    }

    function enablePopover(content, $element) {
        var data = Mustache.to_html(contentTemplates.iconContent, {
            type: content.contentType,
            views: contentTemplates.helpers.views,
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
                filters: args.filters
            });
        });

        return $element;
    }

    return {
        render: function(args) {
            var $element = renderContent(args.content, contentTemplates[args.format]);
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

            // Set up sorting
            if (args.sorting) {
                // TODO: Setup sorting
                console.log("TODO: Setup sorting");
            }

            // Add the content to the holder
            if (args.filters) {

                // Filter the content into categories
                Object.keys(args.filters).forEach(function (filterName) {

                    // Filter the content
                    var filteredContent = args.content.filter(args.filters[filterName]);

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
                                format: args.format
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
                        format: args.format
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