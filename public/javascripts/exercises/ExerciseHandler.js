/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 5/2/13
 * Time: 1:05 PM
 * To change this template use File | Settings | File Templates.
 */
var ExerciseHandler = (function() {
    "use strict";

    var registeredQuestions = {};
    function QuestionRegistry(question) {
        this.question = question;
        this.responses = {};
    }

    return {
        createQuestion: function(args) {

            var multipleChoiceTypes = [
                "checkbox", "radio"
            ];
            var freeResponseTypes = [
                "text", "textarea"
            ];

            if (multipleChoiceTypes.indexOf(args.type) >= 0) {
                // Create a multiple choice question
                return new this.questionsClasses.MultipleChoice({
                    choices: args.choices,
                    type: args.type,
                    prompt: args.prompt,
                    answers: args.answers
                });
            }

            if (freeResponseTypes.indexOf(args.type) >= 0) {
                // Create a multiple choice question
                return new this.questionsClasses.FreeResponse({
                    type: args.type,
                    prompt: args.prompt,
                    answers: args.answers
                });
            }

            return null;
        },

        getSummary: function() {
            var summary = {};
            Object.keys(registeredQuestions).forEach(function (questionId) {
                summary[questionId] = registeredQuestions[questionId].responses;
            });
            return summary;
        },

        grade: function(answerKey) {
            var score = 1;
            answerKey = answerKey || {};
            Object.keys(registeredQuestions).forEach(function (questionId) {
                var response = registeredQuestions[questionId].responses;
                var answers = answerKey[questionId] || registeredQuestions[questionId].question.answers || [];
                score *= registeredQuestions[questionId].question.grade(response, answers);
            });
            return score;
        },

        registerQuestion: function(question) {
            registeredQuestions[question.id] = new QuestionRegistry(question);
        },

        saveResponse: function(questionId, response) {
            registeredQuestions[questionId].responses = response;
        },

        questionsClasses: {}
    };
}());