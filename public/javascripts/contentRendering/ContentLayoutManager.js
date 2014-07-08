/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/16/13
 * Time: 2:31 PM
 * To change this template use File | Settings | File Templates.
 */
var ContentLayoutManager = (function() {
    "use strict";

    var tabIcons = {
        Transcript: "th-list",
        Definitions: "book",
        Annotations: "comment"
    };

    function generateTabs(tabNames) {
        var headers;
        if (tabNames.length === 1) {
            return '<h2>'+tabNames[0]+'</h2><div id="'+tabNames[0]+'"></div>';
        } else {
            // Generate the headers
            if (Ayamel.utils.mobile.isMobile || document.body.classList.contains("embed")) {
                headers = tabNames.map(function(name){
                    return '<li><a href="#'+name+'"><i class="icon-'+tabIcons[name]+'"></i></a></li>';
                }).join("");
            } else {
                headers = tabNames.map(function(name){
                    return '<li><a href="#'+name+'">'+name+'</a></li>';
                }).join("");
            }

            return '<ul class="nav nav-tabs" id="videoTabs">'+headers+'</ul><div class="tab-content">'+tabNames.map(function(name){
                return '<div class="tab-pane" id="'+name+'"></div>';
            }).join("")+'</div>';
        }
    }

    function generateTwoPanel(container, tabNames) {
        var tabs = generateTabs(tabNames);
        var layout = Ayamel.utils.parseHTML('<div class="row-fluid">\
            <div class="span8">\
                <div id="player"></div>\
            </div>\
            <div class="span4"></div>\
        </div>');
        
        container.appendChild(layout);

        layout.querySelector('.span4').innerHTML = tabs;

        // Return the player and tab panes
        var panes = {
            player: layout.querySelector("#player")
        };

        // Include the tab panes
         if (tabNames.length === 1) {
            // No tabs, so include the container
             panes[tabNames[0]] = {
                tab: null,
                content: layout.querySelector("#" + tabNames[0])
            };
         } else {
             // Include links to the actual tab and the corresponding content container
             tabNames.forEach(function(name){
                 panes[name] = {
                     tab: layout.querySelector("#videoTabs a[href='#" + name + "']"),
                     content: layout.querySelector("#" + name)
                 };
             });

             // Enable the tabs
             $(layout).find("#videoTabs a").click(function (e) {
                 e.preventDefault();
                 $(this).tab('show');
             });
             $(panes[tabNames[0]].tab).tab("show");
         }
         return panes;
     }

     function generateTwoPanelMobile(container, tabNames) {
         var tabs = generateTabs(tabNames);
         var layout = Ayamel.utils.parseHTML(
                '<div class="primary"></div>\
            <div class="secondary">\
            <div class="secondaryContent"></div>\
            </div>'
        );
            
        var primary = layout.firstChild;
        var secondary = layout.lastChild;
        var secondaryContent = secondary.querySelector(".secondaryContent");
        secondaryContent.innerHTML = tabs;

        var panes = {
            player: primary
        };
        // Include the tab panes
        if (tabNames.length === 1) {

            // No tabs, so include the container
            panes[tabNames[0]] = layout.querySelector("#" + tabNames[0]);
        } else {
            // Include links to the actual tab and the corresponding content container
            tabNames.forEach(function (name) {
                panes[name] = {
                    tab: layout.querySelector("#videoTabs a[href='#" + name + "']"),
                    content: layout.querySelector("#" + name)
                };
            });

            // Enable the tabs
            $(layout).find("#videoTabs a").click(function (e) {
                e.preventDefault();
                $(this).tab('show');
            });
            $(panes[tabNames[0]].tab).tab("show");
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

            container.style.width = availableWidth;
            container.style.height = availableHeight;

            // Detect which orientation the device is
            if (availableWidth > availableHeight) {
                // Landscape
                document.body.classList.remove("portraitOrientation");
                document.body.classList.add("landscapeOrientation");
                
                // First see if we can fit the video with 100% height and have enough space for secondary
                var newWidth = (availableHeight - sizes.controls) * aspectRatio;
                if (newWidth <= window.innerWidth - sizes.secondary) {
                    // Yes we can
                    primary.style.width = newWidth + "px";
                    primary.style.height = availableHeight + "px";
                    
                    secondary.style.height = availableHeight + "px";
                    secondary.style.width = (availableWidth - newWidth) + "px";
                } else {
                    // No we can't. So give the secondary container everything it needs and adapt the player to the rest
                    newWidth = window.innerWidth - sizes.secondary;
                    newHeight = (newWidth / aspectRatio) + sizes.controls;

                    primary.style.width = newWidth + "px";
                    primary.style.height = newHeight + "px";
                    primary.style.marginTop = (availableHeight - newHeight) / 2;

                    secondary.style.width = sizes.secondary + "px";
                    secondary.style.height = availableHeight + "px";
                }
            
                secondary.style.left = newWidth + "px";
                secondary.style.top = "0px";
                
            } else {
                // Portrait
                document.body.classList.add("portraitOrientation");
                document.body.classList.remove("landscapeOrientation");

                // Set up the primary container
                newHeight = (availableWidth / aspectRatio) + sizes.controls;
                primary.style.width = availableWidth + "px";
                primary.style.height = newHeight + "px";

                // Set up the secondary container
                secondary.style.width = availableWidth + "px";
                secondary.style.height = (availableHeight - newHeight) + "px";
                secondary.style.left = "0px";
                secondary.style.top = newHeight + "px";
            }
        }

        container.appendChild(primary);
        container.appendChild(secondary);

        $(window).resize(function () {
            arrangeWindow();
        });
        arrangeWindow();

        return panes;
    }

    return {
        onePanel: function (container) {
            var player = document.createElement('div');
            player.id = 'player';
            container.appendChild(player);
            return {
                player: player
            };
        },

        twoPanel: function (container, tabNames) {
            if (Ayamel.utils.mobile.isMobile) {
                return generateTwoPanelMobile(container, tabNames);
            } else {
                return generateTwoPanel(container, tabNames);
            }
        }

    };
}());

