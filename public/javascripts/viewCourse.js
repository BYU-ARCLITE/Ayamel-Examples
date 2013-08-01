/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 8/1/13
 * Time: 10:06 AM
 * To change this template use File | Settings | File Templates.
 */
$(function() {
    $(".face, .contentEntry").tooltip({
        placement: "bottom"
    });

    $("#browseContent").click(function() {
        PopupBrowser.selectContent(function(content) {
            // Create a form to add content
            var form = document.createElement("form");
            form.method = "post";
            form.action = "/course/" + courseId + "/addContent";

            // Add the content id to the form
            var input = document.createElement("input");
            input.type = "hidden";
            input.name = "addContent";
            input.value = content.id;
            form.appendChild(input);

            // Submit the form
            form.submit();
        });
    });
});