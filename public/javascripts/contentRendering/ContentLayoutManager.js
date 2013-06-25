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

            var sizes = {
                header: 41,
                controls: 101,
                secondary: 300
            };
            var aspectRatio = Ayamel.aspectRatios.hdVideo;

            // Have the contents container fill the rest of the screen
            var availableWidth = window.innerWidth;
            var availableHeight = window.innerHeight - sizes.header;
            var newHeight;

            $container.width(availableWidth).height(availableHeight);

            // Detect which orientation the device is
            if (availableWidth > availableHeight) {
                // Landscape
                $("body").addClass("landscapeOrientation").removeClass("portraitOrientation");

                // First see if we can fit the video with 100% height and have enough space for secondary
                var newWidth = (availableHeight - sizes.controls) * aspectRatio;
                if (newWidth <= window.innerWidth - sizes.secondary) {
                    // Yes we can
                    $primary.height(availableHeight).width(newWidth);
                    $secondary.height(availableHeight).width(availableWidth - newWidth).css("left", newWidth).css("top", 0);
                } else {
                    // No we can't. So give the secondary container everything it needs and adapt the player to the rest
                    newWidth = window.innerWidth - sizes.secondary;
                    newHeight = (newWidth / aspectRatio) + sizes.controls;
                    var marginTop = (availableHeight - newHeight) / 2;
                    $primary.height(newHeight).width(newWidth).css("margin-top", marginTop);
                    $secondary.height(availableHeight).width(sizes.secondary).css("left", newWidth).css("top", 0);
                }
            } else {
                // Portrait
                $("body").addClass("portraitOrientation").removeClass("landscapeOrientation");

                // Set up the primary container
                newHeight = (availableWidth / aspectRatio) + sizes.controls;
                $primary.width(availableWidth).height(newHeight);

                // Set up the secondary container
                $secondary.width(availableWidth).height(availableHeight - newHeight).css("left", 0).css("top", newHeight);
            }

//            $secondaryContent.height(secondaryHeight - 16);
//            $secondaryContent.find('.tab-pane').height(secondaryHeight - 76);
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
