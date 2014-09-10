/**
 * For usage, see https://github.com/BYU-ARCLITE/Ayamel-Examples/wiki/Improving-forms
 */
$(function() {
    [].forEach.call(document.querySelectorAll("input[type='labels']"),function(node){
        // Put a container adjacent
        var element = document.createElement('div');
        node.parentNode.insertBefore(element, node.nextSibling);

        // Replace the element with a multiple select
        var name = node.name;
        var id = node.id;
        var $select = $('<select multiple="multiple" name="' + name + '" id="' + id + '"></select>').hide();
        element.appendChild($select[0]);
        var values = [];

        // Add a place to display the labels
        var labelDisplay = document.createElement('div');
        function addLabel(value) {
            if (!value || values.indexOf(value) >= 0) {
                return;
            }

            // Add the label to the select
            values.push(value);
            $select.append('<option value="' + value + '">' + value + '</option>');
            $select.val(values);

            // Add the badge
            var badge = Ayamel.utils.parseHTML('<span class="badge badge-blue pad-right-low">' + value + ' <a style="color: white" href="#">×</a></span>');
            badge.querySelector("a").addEventListener('click', function(){
                values.splice(values.indexOf(value), 1);
                $select.children("option[value=" + value + "]").remove();
                $select.val(values);
                badge.parentNode.removeChild(badge);
            }, false);
            labelDisplay.appendChild(badge);
        }

        node.value.split(",").forEach(addLabel);
        
        element.appendChild(labelDisplay);

        // Add an input box for creating more labels
        var labelInputHolder = Ayamel.utils.parseHTML(
            '<div class="pad-top-med">\
                <input type="text" class="pad-right-med">\
                <button class="btn">Add</button>\
            </div>'
        );
        var labelInputText = labelInputHolder.querySelector('input');
        var labelInputButton = labelInputHolder.querySelector('button');

        element.appendChild(labelInputHolder);

        // Setup the add functionality
        labelInputButton.addEventListener('click', clickHandler, false);
        labelInputText.addEventListener('keypress', function(event){
            if(event.which !== 13){ return true; }
            event.stopPropagation();
            clickHandler();
            return false;
        }, false);

        function clickHandler(){
            var value = labelInputText.value;
            labelInputText.value = "";
            addLabel(value);
            return false;
        }
        
        // Remove the input
        node.parentNode.removeChild(node);
    });
});