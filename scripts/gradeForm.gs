/*
 * Create this script at https://script.google.com/
 *
 * Click Run once then click Authorize.
 *
 * Then publish it. Click "Publish" > "Deploy as web app..."
 * Enter anything in the version box and click "Save New Version"
 * Under "Execute the app as:" make sure "me" is selected.
 * Under "Who has access to the app:" select "Anyone, even anonymous"
 * Click "Deploy"
 *
 * Once it is deployed you will get a URL where it is deployed at.
 * Copy and paste this into application.conf under exercises.gradeFormScript
 */
function doGet(request) {

    var form = FormApp.openById(request.parameters.id);

    // Get the first (answer key) and last responses
    var responses = form.getResponses();
    var answerKey = responses[0];
    var response = responses[request.parameters.index];

    var results = [];
    var score = 0;

    // Make sure that the response exists
    if (response) {
        // Get the item responses
        var answerItemResponses = answerKey.getItemResponses();
        var actualItemResponses = response.getItemResponses();

        // Compare the first to the last
        for (var i = 0; i < answerItemResponses.length; i++) {

            // Look at each item in the answer key, then find that item in the response
            var expected = answerItemResponses[i];
            var actual = findItemResponse(actualItemResponses, expected.getItem().getId());

            // Compare and grade the two. If no answer was given then it gets a 0.
            if (!actual) {
                results.push(0);
            } else {
                results.push(grade(expected.getResponse(), actual.getResponse()));
            }
        }
        score = results.reduce(function (prev, current) {
            return prev + current;
        }, 0);
    }

    // Return the scores
    var result = {
        results: results,
        score: score
    };
    return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
}

function grade(obj1, obj2) {
    // Check to see if we are grading two strings
    if (typeof obj1 === "string") {
        return obj1 === obj2 ? 1 : 0;
    }

    // Check to see if we are grading two arrays of strings
    if (obj1 instanceof Array) {
        var score = 0;
        obj2.forEach(function (a) {
            score += obj1.indexOf(a) >= 0 ? 1 : 0;
        });
        return score / obj1.length;
    }

    // Return 0 otherwise
    return 0;
}

function findItemResponse(responses, id) {
    for (var i = 0; i < responses.length; i++) {
        if (responses[i].getItem().getId() === id)
            return responses[i];
    }
    return null;
}