/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 5/2/13
 * Time: 1:06 PM
 * To change this template use File | Settings | File Templates.
 */
(function (ExerciseHandler) {
    "use strict";

    function MultipleChoice(args) {
        this.choices = args.choices;
        this.prompt = args.prompt;
        this.type = args.type;
    }

    ExerciseHandler.questions.MultipleChoice = MultipleChoice;
}(ExerciseHandler));