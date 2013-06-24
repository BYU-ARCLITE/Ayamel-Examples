/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 6/21/13
 * Time: 7:58 AM
 * To change this template use File | Settings | File Templates.
 */
var SettingsForm = (function() {

    var formTemplate =
        '<form class="form-horizontal" action="{{action}}" method="{{method}}" enctype="{{enctype}}"></form>';

    var controlTemplate =
        '<div class="control-group">' +
            '<label class="control-label" for="{{name}}">{{label}}</label>' +
            '<div class="controls">{{>control}}</div>' +
        '</div>';

    function SettingsForm(args) {
        // Create the form
        var _this = this;
        var data = {
            action: args.action || "get",
            method: args.method || "",
            enctype: args.enctype || "application/x-www-form-urlencoded"
        };
        var html = Mustache.to_html(formTemplate, data);
        this.$element = $(html);

        // Add the controls
        args.controls.forEach(function (control) {
            var $control = control.render();
            _this.$element.append($control);
        });

        args.$holder.html(this.$element);
    }

    function Control() {}
    Control.prototype.create = function(template, data, attach) {
        var html = Mustache.to_html(controlTemplate, data, {control: template});
        var $element = $(html);
        if (attach) {
            attach($element);
        }
        return $element;
    };

    var RadioButtons = (function() {
        var template =
            '<div>' +
                '{{#items}}' +
                '<label class="radio">' +
                    '<input type="radio" name="{{name}}" id="{{name}}{{count}}" value="{{value}}">' +
                    '{{text}}' +
                '</label>' +
                '{{/items}}' +
            '</div>';

        var countVal = 1;
        function count() {
            return countVal++;
        }

        function RadioButtons(args) {
            this.data = {
                label: args.label || "Radio buttons",
                name: args.name,
                items: args.items || [],
                count: count
            };
            this.attach = args.attach;
        }
        RadioButtons.prototype = Object.create(Control.prototype);
        RadioButtons.prototype.constructor = RadioButtons;
        RadioButtons.prototype.render = function() {
            return this.create(template, this.data, this.attach);
        };

        return RadioButtons;
    })();

    var CheckBox = (function() {
        var template = '<input type="checkbox" id="{{name}}" name="{{name}}" value="{{value}}">';

        function CheckBox(args) {
            this.data = {
                label: args.label || "Check box",
                name: args.name,
                value: args.value || "true"
            };
            this.attach = args.attach;
        }
        CheckBox.prototype = Object.create(Control.prototype);
        CheckBox.prototype.constructor = CheckBox;
        CheckBox.prototype.render = function() {
            return this.create(template, this.data, this.attach);
        };

        return CheckBox;
    })();

    var Select = (function() {
        var template =
            '<select id="{{name}}" name="{{name}}" {{#multiple}}multiple="multiple"{{/multiple}}>' +
                '{{#options}}<option value="{{value}}">{{text}}</option>{{/options}}' +
            '</select>';

        function Select(args) {
            this.data = {
                label: args.label || "Select",
                name: args.name,
                multiple: args.multiple || false,
                options: args.options || []
            };
            this.attach = args.attach;
        }
        Select.prototype = Object.create(Control.prototype);
        Select.prototype.constructor = Select;
        Select.prototype.render = function() {
            return this.create(template, this.data, this.attach);
        };

        return Select;
    })();

    var TextInput = (function() {

        var template = '<input type="text" id="{{name}}" name="{{name}}" placeholder="{{placeholder}}">';

        function TextInput(args) {
            this.data = {
                label: args.label || "Text input",
                name: args.name,
                placeholder: args.placeholder || ""
            };
            this.attach = args.attach;
        }
        TextInput.prototype = Object.create(Control.prototype);
        TextInput.prototype.constructor = TextInput;
        TextInput.prototype.render = function() {
            return this.create(template, this.data, this.attach);
        };

        return TextInput
    })();

    var HiddenInput = (function() {

        var template = '<input type="hidden" id="{{name}}" name="{{name}}">';

        function HiddenInput(args) {
            this.data = {
                name: args.name
            };
            this.attach = args.attach;
        }
        HiddenInput.prototype.render = function() {
            var html = Mustache.to_html(template, this.data);
            var $element = $(html);
            this.attach($element);
            return $element;
        };

        return HiddenInput
    })();

    var Submit = (function() {

        var template = '<input type="submit" class="btn{{#classes}} {{.}}{{/classes}}" value="{{text}}">';

        function Submit(args) {
            this.data = {
                label: args.label || "",
                classes: args.classes || [],
                text: args.text || "Go"
            };
            this.attach = args.attach;
        }
        Submit.prototype = Object.create(Control.prototype);
        Submit.prototype.constructor = Submit;
        Submit.prototype.render = function() {
            return this.create(template, this.data, this.attach);
        };

        return Submit;
    })();

    return {
        SettingsForm: SettingsForm,
        formParts: {
            CheckBox: CheckBox,
            HiddenInput: HiddenInput,
            RadioButtons: RadioButtons,
            Select: Select,
            Submit: Submit,
            TextInput: TextInput
        }
    };
})();