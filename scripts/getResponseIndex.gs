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
 * Copy and paste this into application.conf under exercises.getResponseIndexScript
 */
function doGet(request) {
    var form = FormApp.openById(request.parameters.id);

    // Get the first (answer key) and last responses
    var responses = form.getResponses();

    // Return information
    var result = {
        responseIndex: responses.length - 1
    };

    return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
}