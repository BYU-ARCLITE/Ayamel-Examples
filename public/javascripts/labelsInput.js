/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/24/13
 * Time: 5:37 PM
 * To change this template use File | Settings | File Templates.
 */
$(function() {
    $("input[type='labels']").each(function () {
        // Put a container adjacent
        var $element = $("<div></div>");
        $(this).after($element);

        // Replace the element with a multiple select
        var name = $(this).attr("name");
        var id = $(this).attr("id");
        var $select = $('<select multiple="multiple" name="' + name + '" id="' + id + '"></select>').hide();
        $element.append($select);
        var values = [];

        // Add a place to display the labels
        var $labelDisplay = $("<div></div>");
        function addLabel(value) {
            if (!value || values.indexOf(value) >= 0) {
                return;
            }

            // Add the label to the select
            values.push(value);
            $select.append('<option value="' + value + '">' + value + '</option>');
            $select.val(values);

            // Add the badge
            var $badge = $('<span class="badge badge-blue pad-right-low">' + value + ' <a style="color: white" href="#">×</a></span>');
            $badge.children("a").click(function () {
                values.splice(values.indexOf(value), 1);
                $select.children("option[value=" + value + "]").remove();
                $select.val(values);
                $(this).parent().remove();
            });
            $labelDisplay.append($badge);
        }
        $(this).attr("value").split(",").forEach(addLabel);
        $element.append($labelDisplay);

        // Add an input box for creating more labels
        var $labelInputHolder = $('<div class="pad-top-med"></div>');
        var $labelInputText = $('<input type="text" class="pad-right-med">');
        var $labelInputButton = $('<button class="btn">Add</button>');
        $labelInputHolder.append($labelInputText).append($labelInputButton);
        $element.append($labelInputHolder);

        // Setup the add functionality
        $labelInputButton.click(function () {
            var value = $labelInputText.val();
            $labelInputText.val("");
            addLabel(value);
            return false;
        });
        $labelInputText.keypress(function (event) {
            var keycode;
            if(window.event)
                keycode = window.event.keyCode;
            else
                keycode = e.which;
            if (keycode === 13) {
                event.stopPropagation();
                $labelInputButton.click();
                return false;
            }
            return true;
        });

        // Remove the input
        $(this).remove();
    });
});