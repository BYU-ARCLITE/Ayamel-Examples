/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/16/13
 * Time: 2:31 PM
 * To change this template use File | Settings | File Templates.
 */
var ContentLayoutManager = (function() {
    "use strict";

    var noTabs = '<h2>{{name}}</h2><div id="{{name}}"></div>';

    var tabHeaderHolder = '<ul class="nav nav-tabs" id="videoTabs">{{>tabHeaders}}</ul>';
    var tabHeader       = '<li><a href="#{{name}}">{{name}}</a></li>';
    var tabHeaderMobile = '<li><a href="#{{name}}"><i class="icon-{{icon}}"></i></a></li>';

    var tabContentHolder = '<div class="tab-content">{{>tabContents}}</div>';
    var tabContent       = '<div class="tab-pane" id="{{name}}"></div>';

    var twoPanelLayout =
        '<div class="row-fluid">' +
            '<div class="span8">' +
                '<div id="player"></div>' +
            '</div>' +
            '<div class="span4">{{>tabs}}</div>' +
        '</div>';

    var twoPanelLayoutMobile =
        '<div class="primary"></div>' +
        '<div class="secondary">' +
            '<div class="secondaryContent">{{>tabs}}</div>' +
        '</div>';

    var tabIcons = {
        Transcript: "th-list",
        Definitions: "book",
        Annotations: "comment"
    };

    function generateTabs(tabNames) {
        if (tabNames.length === 1) {
            return Mustache.to_html(noTabs, {name: tabNames[0]});
        } else {
            // Generate the headers
            var headers;
            if (Ayamel.utils.mobile.isMobile) {
                headers = tabNames.map(function (name) {
                    return Mustache.to_html(tabHeaderMobile, {name: name, icon: tabIcons[name]});
                }).join("");
            } else {
                headers = tabNames.map(function (name) {
                    return Mustache.to_html(tabHeader, {name: name});
                }).join("");
            }

            var header = Mustache.to_html(tabHeaderHolder, {}, {tabHeaders: headers});

            // Generate the content
            var contents = tabNames.map(function (name) {
                return Mustache.to_html(tabContent, {name: name});
            }).join("");
            var content = Mustache.to_html(tabContentHolder, {}, {tabContents: contents});

            return header + content;
        }
    }

    function generateTwoPanel($container, tabNames) {
        var tabs = generateTabs(tabNames);
        var html = Mustache.to_html(twoPanelLayout, {}, {tabs: tabs});
        var $layout = $(html);
        $container.html($layout);

        // Return the player and tab panes
        var panes = {
            $player: $layout.find("#player")
        };

        // Include the tab panes
        if (tabNames.length === 1) {

            // No tabs, so include the container
            panes["$" + tabNames[0]] = $layout.find("#" + tabNames[0]);
        } else {
            // Include links to the actual tab and the corresponding content container
            tabNames.forEach(function (name) {
                panes[name] = {
                    $tab: $layout.find("#videoTabs a[href='#" + name + "']"),
                    $content: $layout.find("#" + name)
                };
            });

            // Enable the tabs
            $layout.find("#videoTabs a").click(function (e) {
                e.preventDefault();
                $(this).tab('show');
            });
            panes[tabNames[0]].$tab.tab("show");
        }
        return panes;
    }

    function generateTwoPanelMobile($container, tabNames) {
        var tabs = generateTabs(tabNames);
        var html = Mustache.to_html(twoPanelLayoutMobile, {}, {tabs: tabs});
        var $layout = $(html);
        $container.html($layout);

        var $primary = $($layout[0]);
        var $secondary = $($layout[1]);
        var $secondaryContent = $secondary.children(".secondaryContent");

        var panes = {
            $player: $primary
        };

        // Include the tab panes
        if (tabNames.length === 1) {

            // No tabs, so include the container
            panes["$" + tabNames[0]] = $layout.find("#" + tabNames[0]);
        } else {
            // Include links to the actual tab and the corresponding content container
            tabNames.forEach(function (name) {
                panes[name] = {
                    $tab: $layout.find("#videoTabs a[href='#" + name + "']"),
                    $content: $layout.find("#" + name)
                };
            });

            // Enable the tabs
            $layout.find("#videoTabs a").click(function (e) {
                e.preventDefault();
                $(this).tab('show');
            });
            panes[tabNames[0]].$tab.tab("show");
        }

        function arrangeWindow() {

            // Have the contents container fill the rest of the screen
            var width = window.innerWidth;
            var height = window.innerHeight - $(".headerBar").height();
            var secondaryHeight;

            $container.width(width).height(height);

            // Detect which orientation the device is
            if (width > height) {
                // Landscape
                $("body").addClass("landscapeOrientation").removeClass("portraitOrientation");

                // Set up the primary container
                var primaryWidthPercentage = 0.65;
                $primary.width(width * primaryWidthPercentage).height(height);

                // Set up the secondary container
                secondaryHeight = height;
                var left = width * (1 - primaryWidthPercentage);
                $secondary.width(left).height(secondaryHeight).css("left", width - left).css("top", 0);
            } else {
                // Portrait
                $("body").addClass("portraitOrientation").removeClass("landscapeOrientation");

                // Set up the primary container
                $primary.width(width).css("height", "auto");
                var primaryHeight = $primary.height();
                if (primaryHeight === 0) {
                    // Figure out how big the player will be
                    var playerHeight = (width / Ayamel.aspectRatios.hdVideo) + 100;
                    $primary.height(primaryHeight = playerHeight);
                }

                // Set up the secondary container
                secondaryHeight = height - primaryHeight;
                $secondary.width(width).height(secondaryHeight).css("left", 0).css("top", primaryHeight);
            }

            $secondaryContent.height(secondaryHeight - 16);
            $secondaryContent.find('.tab-pane').height(secondaryHeight - 76);
        }

        $(window).resize(function () {
            arrangeWindow();
        });
        arrangeWindow();



        if (tabNames.length === 1) {
//            panes["$" + tabNames[0]] =
        }
        return panes;
    }

    return {
        onePanel: function ($container) {
            var $player = $('<div id="player"></div>');
            $container.html($player);
            return {
                $player: $player
            };
        },

        twoPanel: function ($container, tabNames) {
            if (Ayamel.utils.mobile.isMobile) {
                return generateTwoPanelMobile($container, tabNames);
            } else {
                return generateTwoPanel($container, tabNames);
            }
        }

    };
}());
