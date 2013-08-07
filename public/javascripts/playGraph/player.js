/**
 * For usage please see https://github.com/BYU-ARCLITE/Ayamel-Examples/wiki/Playgraph
 */
var PlayGraphPlayer = (function() {

    var status;
    var buttonTemplate = "<button class='btn btn-blue' id='nextButton'><i class='icon-arrow-right'></i> Next</button>";
    var triggerCounter = 0;
    var defaultSettings = {
        click: false,
        button: false,
        media: false,
        timer: false,
        time: 0
    };

    function parseSettings(settings) {
        try {
            return JSON.parse(settings);
        } catch(e) {
            return defaultSettings;
        }
    }

    function progress(args, trigger) {
        PlayGraph.player.data.trigger = trigger;

        args.$holder.html("");
        PlayGraph.player.update(PlayGraph.player.data, function(_status) {
            status = _status;
            if (status === "continue") {
                loadPage(args);
            } else {
                args.$holder.html("This playlist is finished. You will automatically be taken back.");
                window.setTimeout(function() {
                    window.location = new RegExp("(.*)/play").exec(window.location)[1];
                }, 3000);
            }
        });
    }

    function setupTriggers(args, callbackData, settings) {
        triggerCounter++;
        var triggerId = triggerCounter;
        if (settings.click) {
            $("body").click(function () {
                if (triggerId === triggerCounter) {
                    progress(args, "click");
                }
            });
        }
        if (settings.button) {
            var $button = $(buttonTemplate);
            $button.click(progress.bind(null, args, "button"));
            args.$holder.append($button);
        }
        if (settings.media && callbackData.videoPlayer) {
            callbackData.videoPlayer.addEventListener("ended", progress.bind(null, args, "media"));
        }
        if (settings.timer) {
            window.setTimeout(function() {
                if (triggerId === triggerCounter) {
                    progress(args, "timer");
                }
            }, settings.time * 1000);
        }
        if (callbackData.content.contentType === "questions") {
            callbackData.questionSetPlayer.addEventListener("done", function(event) {
                var index = event.index;
                $.ajax("/ajax/questions/" + callbackData.content.id + "/grade/" + index, {
                    success: function(data) {
                        PlayGraph.player.data.score = data.score / data.possible;
                        PlayGraph.player.data.passingValue = settings.passingValue;
                        progress(args, "questions");
                    }
                })
            });
        }
    }

    function displayPage(args, content, settings) {
        // TODO: Deal with courses
        ContentRenderer.render({
            content: +content,
            courseId: 0,
            holder: args.$holder[0],
            annotate: true,
            inPlaylist: true,
            screenAdaption: {
                fit: true,
                scroll: true,
                padding: 61
            },
            aspectRatio: Ayamel.aspectRatios.hdVideo,
            callback: function(callbackData) {
                setupTriggers(args, callbackData, settings);
            }
        });
    }


    function loadPage(args) {
        // Load the page content and settings
        PlayGraph.player.content(function (content) {
            PlayGraph.player.settings(function (settings) {
                settings = parseSettings(settings);

                displayPage(args, content, settings);
            });
        });
    }

    return {
        play: function(args) {
            var key = args.playGraph.key;
            var secret = args.playGraph.secret;
            var host = args.playGraph.host;
            PlayGraph.setAPICredentials(host, key, secret);

            var graphId = args.content.resourceId;
            PlayGraph.player.start(graphId, function () {
                status = "continue";
                loadPage(args);
            });
        }
    };
})();