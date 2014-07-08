/**
 * For usage, see https://github.com/BYU-ARCLITE/Ayamel-Examples/wiki/Playgraph
 */
(function(PlayGraph) {

    console.log("Loading Ayamel widgets...");

    // Include necessary Ayamel scripts and styles
    var host = new RegExp("(http://[^/]+/).*").exec(document.referrer)[1];
    $("body")
        .append('<link rel="stylesheet" href="'+host+'assets/stylesheets/bigModal.css"/>')
        .append('<link rel="stylesheet" href="'+host+'assets/stylesheets/content.css"/>');
    $.getScript(host + "assets/javascripts/contentSelection/ContentItemRenderer.js");
    $.getScript(host + "assets/javascripts/contentRendering/ContentThumbnails.js");
    $.getScript(host + "assets/javascripts/contentSelection/PopupBrowser.js", function () {
        PopupBrowser.setHost(host);
        PopupBrowser.setCrossDomain(true);
    });

    var contentCache = {
        lookup: function(id, callback) {
            if (contentCache.hasOwnProperty(id)) {
                callback(contentCache[id]);
            } else {
                $.ajax(host + "ajax/content/" + id, {
                    xhrFields: {withCredentials: true},
                    success: function(content) {
                        contentCache[content.id] = content;
                        callback(content);
                    }
                });
            }
        }
    };

    /*
     *   _____        _          ______    _ _ _
     *  |  __ \      | |        |  ____|  | (_) |
     *  | |  | | __ _| |_ __ _  | |__   __| |_| |_ ___  _ __
     *  | |  | |/ _` | __/ _` | |  __| / _` | | __/ _ \| '__|
     *  | |__| | (_| | || (_| | | |___| (_| | | || (_) | |
     *  |_____/ \__,_|\__\__,_| |______\__,_|_|\__\___/|_|
     *
     */

    PlayGraph.registeredObjects.DataEditor = (function () {
        var template =
            '<div>\
                <div class="well"></div>\
                <div><button class="btn btn-success">Select Content</button></div>\
            </div>';

        function AyamelDataEditor(args) {
            var _this = this,
                element = Ayamel.utils.parseHTML(template);
            this.element = element;
            args.holder.innerHTML = "":
            args.holder.appendChild(element);

            // Selector
            element.querySelector("button").addEventListener('click', function(){
                PopupBrowser.selectContent(function(content){
                    // TODO: Keep track of the course as well
                    _this.content = content;
                });
            }, false);

            var activeContent = null;
            var contentDiv = element.querySelector("div:first-child");
            Object.defineProperty(this, "content", {
                get: function() {
                    if (!!activeContent)
                        return "" + activeContent.id;
                    else
                        return "";
                },
                set: function(value) {
                    if (!!value) {
                        contentCache[value.id] = value;
                        activeContent = value;
                        var thumbnail = ContentThumbnails.resolve(value);
                        contentDiv.innerHTML = "<img src='" + thumbnail + "'><h1>" + value.name + "</h1>";
                    } else {
                        activeContent = null;
                        contentDiv.innerHTML = "<em>No content selected.</em>";
                    }

                    var newEvent = document.createEvent("HTMLEvents");
                    newEvent.initEvent("update", true, true);
                    element.dispatchEvent(newEvent);
                }
            });
        }

        AyamelDataEditor.prototype.addEventListener = function(event, callback, capture) {
            this.element.addEventListener(event, callback, capture);
        };

        AyamelDataEditor.prototype.getValue = function() {
            return this.content;
        };

        AyamelDataEditor.prototype.setValue = function(value) {
            var _this = this;
            if (value === "" || value === "0") {
                this.content = null;
            } else {
                contentCache.lookup(value, function (content) {
                    _this.content = content;
                });
            }
        };

        return AyamelDataEditor;
    }());

    /*
     *   _____       _ _   _       _ _
     *  |_   _|     (_) | (_)     | (_)
     *    | |  _ __  _| |_ _  __ _| |_ _______ _ __
     *    | | | '_ \| | __| |/ _` | | |_  / _ \ '__|
     *   _| |_| | | | | |_| | (_| | | |/ /  __/ |
     *  |_____|_| |_|_|\__|_|\__,_|_|_/___\___|_|
     *
     */

    PlayGraph.registeredObjects.initializer = function(graph, nodes, callback) {
        // Load all the content into the content cache
        var count = 0;
        var size = Object.keys(nodes).length;
        Object.keys(nodes).forEach(function(id) {
            if (!!nodes[id].content) {
                contentCache.lookup(nodes[id].content, function(){
                    if (++count === size) {
                        callback();
                    }
                });
            } else {
                if (++count === size) {
                    callback();
                }
            }
        });
    };

    /*
     *   _   _                        _____                _
     *  | \ | |                      |  __ \              | |
     *  |  \| | __ _ _ __ ___   ___  | |__) |___ _ __   __| | ___ _ __ ___ _ __
     *  | . ` |/ _` | '_ ` _ \ / _ \ |  _  // _ \ '_ \ / _` |/ _ \ '__/ _ \ '__|
     *  | |\  | (_| | | | | | |  __/ | | \ \  __/ | | | (_| |  __/ | |  __/ |
     *  |_| \_|\__,_|_| |_| |_|\___| |_|  \_\___|_| |_|\__,_|\___|_|  \___|_|
     *
     */

    PlayGraph.registeredObjects.nameRenderer = function(node) {
        var name = !!contentCache[node.content] ? contentCache[node.content].name : "No content";
        return name + " (" + node.id + ")";
    };

    /*
     *   _______                  _ _   _               _____       _        ______    _ _ _
     *  |__   __|                (_) | (_)             |  __ \     | |      |  ____|  | (_) |
     *     | |_ __ __ _ _ __  ___ _| |_ _  ___  _ __   | |__) |   _| | ___  | |__   __| |_| |_ ___  _ __
     *     | | '__/ _` | '_ \/ __| | __| |/ _ \| '_ \  |  _  / | | | |/ _ \ |  __| / _` | | __/ _ \| '__|
     *     | | | | (_| | | | \__ \ | |_| | (_) | | | | | | \ \ |_| | |  __/ | |___| (_| | | || (_) | |
     *     |_|_|  \__,_|_| |_|___/_|\__|_|\___/|_| |_| |_|  \_\__,_|_|\___| |______\__,_|_|\__\___/|_|
     *
     */

    PlayGraph.registeredObjects.TransitionRuleEditor = (function(){
        var template =
            '<select>\
                <option value="always">Always</option>\
                <option value="click">Click</option>\
                <option value="button">Button</option>\
                <option value="timer">Timer</option>\
                <option value="media">Media End</option>\
                <option value="pass">Pass</option>\
                <option value="fail">Fail</option>\
            </select>';

        var ruleMap = {
            always: "true;",
            click: "trigger === \"click\";",
            button: "trigger === \"button\";",
            timer: "trigger === \"timer\";",
            media: "trigger === \"media\";",
            pass: "score >= passingValue;",
            fail: "score < passingValue;",

            // Put in the reverse lookup as well
            "true;": "always",
            "trigger === \"click\";": "click",
            "trigger === \"button\";": "button",
            "trigger === \"timer\";": "timer",
            "trigger === \"media\";": "media",
            "score >= passingValue;": "pass",
            "score < passingValue;": "fail"
        };

        function TransitionRuleEditor(args) {
            var element = Ayamel.utils.parseHTML(template);
            this.element = element;
            element.value = ruleMap[args.rule];
            args.holder.innerHTML = "";
            args.holder.appendChild(element);

            element.addEventListener('change', function(event){
                event.stopPropagation();
                var newEvent = document.createEvent("HTMLEvents");
                newEvent.initEvent("update", true, true);
                newEvent.rule = ruleMap[this.value];
                this.dispatchEvent(newEvent);
            }, false);
        }

        TransitionRuleEditor.prototype.addEventListener = function(event, callback, capture) {
            this.element.addEventListener(event, callback, capture);
        };

        return TransitionRuleEditor;
    }());

    /*
     *    _____      _   _   _                   ______    _ _ _
     *   / ____|    | | | | (_)                 |  ____|  | (_) |
     *  | (___   ___| |_| |_ _ _ __   __ _ ___  | |__   __| |_| |_ ___  _ __
     *   \___ \ / _ \ __| __| | '_ \ / _` / __| |  __| / _` | | __/ _ \| '__|
     *   ____) |  __/ |_| |_| | | | | (_| \__ \ | |___| (_| | | || (_) | |
     *  |_____/ \___|\__|\__|_|_| |_|\__, |___/ |______\__,_|_|\__\___/|_|
     *                                __/ |
     *                               |___/
     *
     */

    PlayGraph.registeredObjects.SettingsEditor = (function() {

        var template =
            '<div>\
                <h2>Enabled Triggers</h2>\
                <form class="form-horizontal">\
                    <div class="control-group">\
                        <div class="controls">\
                            <label class="checkbox">\
                                <input type="checkbox" id="clickCheckbox">\
                                Clicking\
                            </label>\
                        </div>\
                    </div>\
                    <div class="control-group">\
                        <div class="controls">\
                            <label class="checkbox">\
                                <input type="checkbox" id="buttonCheckbox">\
                                Button\
                            </label>\
                        </div>\
                    </div>\
                    <div class="control-group">\
                        <div class="controls">\
                            <label class="checkbox">\
                                <input type="checkbox" id="mediaCheckbox">\
                                Media End\
                            </label>\
                        </div>\
                    </div>\
                    <div class="control-group">\
                        <div class="controls">\
                            <label class="checkbox">\
                                <input type="checkbox" id="timerCheckbox">\
                                Timer\
                            </label>\
                        </div>\
                    </div>\
                    <div class="control-group">\
                        <label class="control-label" for="inputPassword">Timer value (seconds):</label>\
                        <div class="controls">\
                            <input type="text" id="timerValue" placeholder="Timer value">\
                            <span class="input-long uneditable-input" id="timerValueDisabled"></span>\
                        </div>\
                    </div>\
                    <div class="control-group">\
                        <label class="control-label" for="inputPassword">Passing value (0-1):</label>\
                        <div class="controls">\
                            <input type="text" id="passingValue" placeholder="Passing value">\
                        </div>\
                    </div>\
                </form>\
            </div>';

        var defaultSettings = {
            click: false,
            button: false,
            media: false,
            timer: false,
            time: 0,
            passingValue: 0
        };

        function parseSettings(settings) {
            try {
                return $.extend($.extend({}, defaultSettings), JSON.parse(settings));
            } catch(e) {
                return defaultSettings;
            }
        }

        function SettingsEditor(args) {
            var element = Ayamel.parseHTML(template);
            args.holder.innerHTML = "";
            args.holder.appendChild(element);
            
            this.element = element;

            var click = element.querySelector("#clickCheckbox");
            var button = element.querySelector("#buttonCheckbox");
            var media = element.querySelector("#mediaCheckbox");
            var timer = element.querySelector("#timerCheckbox");
            var time = element.querySelector("#timerValue");
            var timeDisabled = element.querySelector("#timerValueDisabled");
            var passingValue = element.querySelector("#passingValue");

            // Set up events
            function update(event) {
                event.stopPropagation();
                updateSettings();
                var newEvent = document.createEvent("HTMLEvents");
                newEvent.initEvent("update", true, true);
                this.dispatchEvent(newEvent);
            }

            click.addEventListener('change',update,false);
            button.addEventListener('change',update,false);
            media.addEventListener('change',update,false);
            timer.addEventListener('change',update,false);
            time.addEventListener('change',update,false);
            passingValue.addEventListener('change',update,false);

            // Have the UI update depending on the settings
            var settings = defaultSettings;
            function updateUI() {
                click.checked = settings.click;
                button.checked = settings.button;
                media.checked = settings.media;
                timer.checked = settings.timer;
                if (settings.timer) {
                    $(time).show().val(settings.time);
                    $(timeDisabled).hide();
                } else {
                    $(time).hide();
                    $(timeDisabled).show();
                }
                passingValue.value = settings.passingValue;
            }

            function updateSettings() {
                settings.click = click.checked;
                settings.button = button.checked;
                settings.media = media.checked;
                settings.timer = timer.checked;
                if (settings.timer) {
                    settings.time = $(time).show().val();
                    $(timeDisabled).hide();
                } else {
                    $(time).hide();
                    $(timeDisabled).show();
                }
                settings.passingValue = !!passingValue.value ? passingValue.value : 0;
            }

            Object.defineProperties(this, {
                settings: {
                    get: function() {
                        return JSON.stringify(settings);
                    }
                },
                setNode: {
                    value: function(node) {
                        settings = parseSettings(node.settings);
                        updateUI();
                    }
                }
            })
        }

        SettingsEditor.prototype.addEventListener = function(event, callback, capture) {
            this.element.addEventListener(event, callback, capture);
        };

        return SettingsEditor;
    })();

})(PlayGraph);