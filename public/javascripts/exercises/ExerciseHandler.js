/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 5/2/13
 * Time: 1:05 PM
 * To change this template use File | Settings | File Templates.
 */
var ExerciseHandler = (function() {
    "use strict";

    function ExerciseManifest(args) {
        var _this = this;

        this.$element = $("<div></div>");
        args.$holder.append(this.$element);

        if (args.questions) {
            args.questions.forEach(function (question) {
                question.render(_this.$element);
            });
        }
    }

    return {
        ExerciseManifest: ExerciseManifest,

        createQuestion: function(args) {

            var multipleChoiceTypes = [
                "checkbox", "radio"
            ];
            var freeResponseTypes = [
                "text", "textarea"
            ];

            if (multipleChoiceTypes.indexOf(args.type) >= 0) {
                // Create a multiple choice question
                var question = new this.questions.MultipleChoice({
                    choices: args.choices,
                    type: args.type,
                    prompt: args.prompt
                });
                return question;
            }

            return null;
        },

        questions: {}
    };
}());