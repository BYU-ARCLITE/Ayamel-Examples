/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/5/13
 * Time: 1:13 PM
 * To change this template use File | Settings | File Templates.
 */
var QuestionSetRenderer = (function() {

    var template =
        '<div>' +
            '<iframe src="https://docs.google.com/forms/d/{{formId}}/viewform?embedded=true" width="100%" height="500" frameborder="0" marginheight="0" marginwidth="0">Loading...</iframe>' +
            '<div id="questionSetLoading">' +
                '<i class="icon-large color-magenta icon-spinner icon-spin"></i> Loading the grader...' +
            '</div>' +
            '<div id="questionSetDone">' +
                '<p>When you are done taking the question set, click the button to grade your response.</p>' +
                '<p><a class="btn btn-blue"><i class="icon-check"></i> Finish and Grade</a></p>' +
            '</div>' +
        '</div>';


    function render(args) {
        var $element = $(template.replace("{{formId}}", args.content.resourceId));
        var $loader = $element.children("#questionSetLoading").hide();
        var $done = $element.children("#questionSetDone").hide();
        var $doneButton = $done.find("a");
        var loadCount = 0;
        var index = -1;

        $(args.holder).html($element);

        function checkIndex(callback) {
            if (index === -1) {
                $loader.show();
                $.ajax("/questions/" + args.content.id + "/getIndex?" + Date.now().toString(36), {
                    success: function(data) {
                        index = +data;
                        $loader.hide();
                        callback();
                    }
                });
            } else {
                callback();
            }
        }

        $doneButton.click(function(e) {
            e.stopPropagation();

            // Do different things if
            if (args.inPlaylist) {
                var event = document.createEvent("HTMLEvents");
                event.initEvent("done", true, true);
                event.index = index;
                $element[0].dispatchEvent(event);
            } else {
                window.location = "/questions/" + args.content.id + "/grade/" + index + "?" + Date.now().toString(36);
            }
        });

        $element.find("iframe")[0].addEventListener("load", function() {
            if (loadCount++) {
                checkIndex(function() {
                    $done.show();
                });
            }
        });

        args.questionSetPlayer = $element[0];
        args.callback && args.callback(args);
    }

    return {
        render: render
    };
})();