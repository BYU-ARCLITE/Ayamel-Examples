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
 * Copy and paste this into application.conf under exercises.createFormScript
 */
function doGet(request) {

    // Create a form
    var title = request.parameters.title;
    var form = FormApp.create(title);

    // Set up the right user
    var email = request.parameters.email;
    form.addEditor(email);

    // Disable multiple responses
    form.setShowLinkToRespondAgain(false);

    // Return information
    var result = {
        id: form.getId()
    };

    return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
}