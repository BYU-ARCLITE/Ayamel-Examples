/*
 * Fixes the lack of styling on file input fields
 * See https://github.com/BYU-ARCLITE/Ayamel-Examples/wiki/Improving-forms
 */
$(function() {
    var template = '<button class="btn">Choose File</button><span>No file chosen</span>';
    [].forEach.call(document.querySelectorAll("input[type='file']"), function(node){
		node.parentNode.insertBefore(Ayamel.utils.parseHTML(template), node.nextSibling);
        node.nextSibling.addEventListener('click', function(event){
            event.stopPropagation();
            node.click();
            return false;
        });
        node.addEventListener('change', function(){
            var filename = node.value.replace(/^.*(\/|\\)/, "");
            node.nextSibling.nextSibling.textContent = filename;
        }, false);
        node.style.width = "1px";
		node.style.opacity = "0";
    });
});