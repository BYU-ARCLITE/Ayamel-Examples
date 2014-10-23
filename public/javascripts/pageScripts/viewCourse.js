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

    document.getElementById("browseContent").addEventListener('click',function(){
        PopupBrowser.selectContent(function(content) {
            // Create a form to add content
            var form = document.createElement("form");
            form.method = "post";
            form.action = "/course/" + courseId + "/addContent";

            // Add the content id to the form
            [].forEach.call(content,function(c){
                var input = document.createElement("input");
                input.type = "hidden";
                input.name = "addContent";
                input.value = c.id;
                form.appendChild(input);
            });

            // Submit the form
            form.submit();
        });
    },false);

    document.getElementById("addByLabel").addEventListener('click',function(){
        PopupLabelBrowser.selectContent(function(contents) {
            // Create a form to add content
            var form = document.createElement("form");
            form.method = "post";
            form.action = "/course/" + courseId + "/addContent";

            // Add the content ids to the form
            var select = document.createElement("select");
            select.multiple = true;
            select.name = "addContent";
            contents.forEach(function(content) {
                var option = document.createElement("option");
                option.value = content.id;
                option.selected = true;
                select.appendChild(option);
            });
            form.appendChild(select);

            // Submit the form
            form.submit();
        });
    },false);
});