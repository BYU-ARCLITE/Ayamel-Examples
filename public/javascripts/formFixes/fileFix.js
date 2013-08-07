/*
 * Fixes the lack of styling on file input fields
 * See https://github.com/BYU-ARCLITE/Ayamel-Examples/wiki/Improving-forms
 */
$(function() {
    var template = '<button class="btn">Choose File</button> <span>No file chosen</span>';
    $("input[type='file']").each(function () {
        var $field = $(this);
        $field.after(template);
        $field.next().click(function (event) {
            event.stopPropagation();
            $field.click();
            return false;
        });
        $field.change(function () {
            var filename = $field.val().replace(/^.*(\/|\\)/, "");
            $field.next().next().text(filename);
        });
        $field.width(1).css("opacity", "0");
    });
});