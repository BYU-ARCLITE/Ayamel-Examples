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
            '<div class="choices">{{>choices}}</div>' +
        '</div>';

    var count = 1;
    var counter = function() {
        return count++;
    };

    var choiceTemplates = {
        checkbox: '<label class="checkbox"><input type="checkbox" data-text="{{text}}"> {{text}}</label>',
        radio: '<label class="radio"><input type="radio" name="{{name}}" id="{{name}}_{{counter}}" value="{{text}}">{{text}}</label>'
    };

    function MultipleChoice(args) {
        var _this = this;

        // Create a (what should be) unique id and register this question with the exercise handler
        this.id = hex_sha1(args.prompt + args.type + args.choices.join(""));
        ExerciseHandler.registerQuestion(this);

        // Create the element
        var name = "question_mc_" + this.id;
        var choices = args.choices.map(function (text) {
            return Mustache.to_html(choiceTemplates[args.type], {
                text: text,
                name: name,
                counter: counter
            });
        }).join("");
        var html = Mustache.to_html(template, {prompt: args.prompt}, {choices: choices});
        this.$element = $(html);

        // Set up clicking on actions
        this.$element.find("input, select").change(function() {

            // Save the new value
            if (args.type === "radio") {
                ExerciseHandler.saveResponse(_this.id, $(this).val());
            }
            if (args.type === "checkbox") {
                var response = {};
                _this.$element.find("input").each(function () {
                    response[$(this).attr("data-text")] = $(this).is(":checked");
                });
                ExerciseHandler.saveResponse(_this.id, response);
            }
        });

        // If the answers were passed in then do something with them
        this.answers = args.answers;

        Object.defineProperty(this, "grade", {
            value: (function () {
                var gradingFunctions = {
                    radio: function(response, answers) {
                        if (answers.indexOf(response) >= 0)
                            return 1;
                        return 0;
                    },

                    checkbox: function(response, answers) {
                        var total = 0;
                        Object.keys(response).forEach(function(key) {
                            if (response[key]) {
                                if (answers.indexOf(key) >= 0)
                                    total += 1;
                                else
                                    total -= 1;
                            }
                        });
                        return Math.max(total / answers.length, 0);
                    }
                };
                return gradingFunctions[args.type];
            }()),
            enumerable: true
        });
    }

    ExerciseHandler.questionsClasses.MultipleChoice = MultipleChoice;
}(ExerciseHandler));