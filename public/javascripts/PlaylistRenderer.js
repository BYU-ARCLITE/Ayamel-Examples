var PlaylistRenderer = (function() {

    var playGraphUrl = "";
    var playGraphKey = ["", ""];

    var currentSessionId = 0;
    var currentAdvanceMethod = "";

    var $playlistContainer;
    var $playlistControl;

    function startGraph(graphId, callback) {
        var url = playGraphUrl + "api/v1/player/start";
        var auth = OAuthSigner.sign(playGraphKey, "POST", url, [["graph", graphId + ""]]);
        $.ajax(url, {
            type: "post",
            data: { graph: graphId },
            headers: {
                "Authorization": auth,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            success: function(data) {
                currentSessionId = data.sessionId;
                callback();
            }
        });
    }

    function renderNodeContent(content) {
        $.ajax("/ajax/util/deserialize", {
            type: "post",
            data: { data: content },
            success: function(data) {

                // Set up the advance method
                currentAdvanceMethod = data.advanceMethod;
                if (currentAdvanceMethod === "button") {
                    var $nextButton = $('<button class="btn btn-blue"><i class="icon-arrow-right"></i> Next</button>');
                    $playlistControl.append($nextButton);
                    $nextButton.click(function() {
                        advance();
                    });
                }
                if (currentAdvanceMethod === "time") {
                    var time = + data.advanceTime;
                    setTimeout(function () {
                        advance();
                    }, time * 1000);
                }

                // Pull out the content ID and render it
                var contentId = + data.contentId;
                ContentRenderer.render(contentId, $playlistContainer);
            }
        })
    }


    function renderPage() {
        var url = playGraphUrl + "api/v1/player/content/" + currentSessionId;
        var auth = OAuthSigner.sign(playGraphKey, "GET", url, []);
        $.ajax(url, {
            headers: {
                "Authorization": auth,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            success: function(data) {
                renderNodeContent(data);
            }
        });
    }

    function advance() {
        // Clear what's there
        $playlistContainer.html('<i class="icon-spinner icon-spin icon-3x blue"></i> Loading');
        $playlistControl.html("");

        var url = playGraphUrl + "api/v1/player/update";
        var auth = OAuthSigner.sign(playGraphKey, "POST", url, [["sessionId", currentSessionId + ""]]);
        $.ajax(url, {
            type: "post",
            data: {
                "sessionId": currentSessionId
            },
            headers: {
                "Authorization": auth,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            success: function(data) {
                if (data.status === "continue") {
                    renderPage();
                }
                if (data.status === "done") {
                    $playlistContainer.html("<em>The playlist is finished.</em>");
                }
            }
        });
    }

    return {

        render: function(graphId, holder, callback) {
            startGraph(graphId, function () {

                // Init the playlist display structure. One container where content will be displayed. One for controls.
                $playlistContainer = $('<div class="playlistContainer"></div>');
                $playlistControl = $('<div class="playlistControl"></div>');
                $(holder).append($playlistContainer).append($playlistControl);

                // Render the current content
                renderPage();

                // Set up a click listener to the page
                $(holder).click(function() {
                    if (currentAdvanceMethod === "click") {
                        advance();
                    }
                });

                if (callback) {
                    callback();
                }
            });
        },

        setInfo: function (url, key) {
            playGraphUrl = url;
            playGraphKey = key;
        }
    };
}());