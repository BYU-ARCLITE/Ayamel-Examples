/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/16/13
 * Time: 2:31 PM
 * To change this template use File | Settings | File Templates.
 */
var VideoLayoutManager = (function() {
    "use strict";

    var noTabs = '<h2>{{name}}</h2><div id="{{name}}"></div>';

    var tabHeaderHolder = '<ul class="nav nav-tabs" id="videoTabs">{{>tabHeaders}}</ul>';
    var tabHeader       = '<li><a href="#{{name}}">{{name}}</a></li>';

    var tabContentHolder = '<div class="tab-content">{{>tabContents}}</div>';
    var tabContent       = '<div class="tab-pane" id="{{name}}"></div>';

    var twoPanelLayout =
        '<div class="row-fluid">' +
            '<div class="span8">' +
                '<div id="player"></div>' +
            '</div>' +
            '<div class="span4">{{>tabs}}</div>' +
        '</div>';


    function generateTabs(tabNames) {
        if (tabNames.length === 1) {
            return Mustache.to_html(noTabs, {name: tabNames[0]});
        } else {
            // Generate the headers
            var headers = tabNames.map(function (name) {
                return Mustache.to_html(tabHeader, {name: name});
            }).join("");
            var header = Mustache.to_html(tabHeaderHolder, {}, {tabHeaders: headers});

            // Generate the content
            var contents = tabNames.map(function (name) {
                return Mustache.to_html(tabContent, {name: name});
            }).join("");
            var content = Mustache.to_html(tabContentHolder, {}, {tabContents: contents});

            return header + content;
        }
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
            var tabs = generateTabs(tabNames);
            var html = Mustache.to_html(twoPanelLayout, {}, {tabs: tabs});
            var $layout = $(html);
            $container.html($layout)

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

    };
}());
