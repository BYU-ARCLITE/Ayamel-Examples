/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 5/2/13
 * Time: 1:06 PM
 * To change this template use File | Settings | File Templates.
 */
(function (ExerciseHandler) {
    "use strict";

    var template =
        '<div>' +
            '<div class="prompt">{{prompt}}</div>' +
            '<div class="choices">{{>input}}</div>' +
        '</div>';

    var inputTemplates = {
        text: '<input type="text" name="{{name}}" id="{{name}}">',
        textarea: '<textarea name="{{name}}" id="{{name}}"></textarea>'
    };

    function FreeResponse(args) {
        var _this = this;

        // Create a (what should be) unique id and register this question with the exercise handler
        this.id = hex_sha1(args.prompt + args.type);
        ExerciseHandler.registerQuestion(this);

        // Create the element
        var name = "question_fr_" + this.id;
        var html = Mustache.to_html(template, {
            prompt: args.prompt,
            name: name
        }, {input: inputTemplates[args.type]});
        this.$element = $(html);

        // Set up clicking on actions
        this.$element.find("input, textarea").change(function() {
            ExerciseHandler.saveResponse(_this.id, $(this).val());
        });

        // If the answers were passed in then do something with them
        this.answers = args.answers;
    }

    FreeResponse.prototype.grade = function(response, answers) {
        // For now we will assume there is only one answer, and that's the first
        if (response === answers[0])
            return 1;
        return 0;
    };

    ExerciseHandler.questionsClasses.FreeResponse = FreeResponse;
}(ExerciseHandler));