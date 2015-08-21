/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 8/1/13
 * Time: 10:06 AM
 * To change this template use File | Settings | File Templates.
 */
$(function() {
    $(".face, .contentEntry").tooltip({
        placement: "bottom",
        viewport: document
    });

    document.getElementById("browseContent").addEventListener('click',function(){
        PopupBrowser.selectContent(function(contentList) {
            var formData = new FormData(),
                xhr = new XMLHttpRequest();

            contentList.forEach(function(c){
                formData.append("addContent",c.id);
            });

            xhr.addEventListener('load',function(){
                document.open();
                document.write(xhr.responseText);
                document.close();
            },false);
            xhr.addEventListener('error',function(){ alert("Error adding content"); },false);

            xhr.open("POST", "/course/" + courseId + "/addContent");
            xhr.send(formData);
        });
    },false);
});