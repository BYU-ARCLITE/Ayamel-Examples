/**
 * For usage, see https://github.com/BYU-ARCLITE/Ayamel-Examples/wiki/Improving-forms
 */
$(function() {
    [].forEach.call(document.querySelectorAll("input[type='labels']"),function(node){
        var values = [],
            element = Ayamel.utils.parseHTML(
                '<div>\
                    <select multiple="multiple" name="' + node.name + '" id="' + node.id + '" style="display:none"></select>\
                    <div data-name="display"></div>\
                    <div class="pad-top-med">\
                        <input type="text" class="pad-right-med">\
                    </div>\
                </div>'
            );

        var sel = element.querySelector('select');
        var labelInputText = element.querySelector('input');
        var labelDisplay = element.querySelector('[data-name="display"]');

        node.value.split(",")
            .map(function(s){ return s.trim(); })
            .forEach(addLabel);

        //Can't deduplicate the stopPropagation/preventDefault code
        //Some browsers ignore them if they are not called in the top scope
        labelInputText.addEventListener('blur', function(event){
            event.stopPropagation();
            event.preventDefault();
            evtHandler();
        }, false);

        labelInputText.addEventListener('keypress', function(event){
            if(event.which === 13 || event.which === 44){
                event.stopPropagation();
                event.preventDefault();
                evtHandler();
                return false;
            }
            return true;
        }, false);

        node.parentNode.replaceChild(element, node);

        function evtHandler(){
            var value = labelInputText.value;
            labelInputText.value = "";
            addLabel(value);
        }

        function addLabel(value) {
            if (!value || values.indexOf(value) >= 0) {
                return;
            }

            // Add the label to the select
            values.push(value);
            sel.add(new Option(value, value, true, true));

            // Add the badge
            var badge = Ayamel.utils.parseHTML('<span class="badge badge-blue pad-right-low">' + value + ' <a style="color: white" href="#">×</a></span>');
            badge.querySelector("a").addEventListener('click', function(){
                var index = values.indexOf(value);
                values.splice(index, 1);
                sel.remove(index);
                badge.parentNode.removeChild(badge);
            }, false);
            labelDisplay.appendChild(badge);
        }
    });
});