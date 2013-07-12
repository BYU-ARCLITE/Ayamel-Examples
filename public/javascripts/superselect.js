jQuery.fn.extend({
    superselect: function() {
        return this.each(function() {
            var $select = $(this).hide();
            var multiple = $select.prop("multiple");

            var data = {
                icon: this.dataset.icon,
                text: this.dataset.text,
                options: []
            };
            var optionMap = {};
            for (var i=0; i<this.length; i++) {
                data.options.push({
                    value: this[i].value,
                    text: this[i].text
                });
                optionMap[this[i].value] = this[i];
            }

            TemplateEngine.render("/assets/templates/superselect.tmpl.html", data, function ($element, attach) {
                $select.after(attach.data);
                $("body").append(attach.popup);

                // Opening/closing the popup
                $(attach.popup).hide();
                $(attach.button).click(function(e) {
                    e.stopPropagation();
                    var pos = $(this).offset();
                    $(attach.popup).toggle().offset({top: pos.top + 45, left: pos.left - $(this).width()/2});
                    return false;
                });

                if (!attach.options) attach.options = [];
                if (!(attach.options instanceof Array)) attach.options = [attach.options];

                var data = {};
                var selected = null;
                var selectedOptions = [];

                function label(value) {
                    return "<span class='label label-info'>"+value+"</span> ";
                }

                function setValue(value) {
                    if (value[0] instanceof Array) {
                        attach.span.innerHTML = value.map(function(v){return label(v[1]);}).join("");
                    } else {
                        if (value.length)
                            attach.span.innerHTML = label(value[1]);
                        else
                            attach.span.innerHTML = "Nothing selected";
                    }

//                $select.val(value.map(function(v){return v[0];}));

                    // Unselect what shouldn't be
                    selectedOptions.forEach(function(option) {
                        option.selected = false;
                    });

                    // Select what should be
                    value.forEach(function(v) {
                        var option = optionMap[v[0]];
                        option.selected = true;
                        selectedOptions.push(option);
                    })
                }

                $select.change(function() {
                    console.log("Change select");
                });

                // Make sure all the text data is lower case and set up clicking
                var initalValue = $select.val();
                if (!initalValue) initalValue = [];
                if (!(initalValue instanceof Array)) initalValue = [initalValue];
                attach.options.forEach(function(option) {
                    option.dataset.text = option.dataset.text.toLowerCase();

                    // Set up initially
                    if (initalValue.indexOf(option.dataset.value) > -1) {
                        data[option.dataset.value] = true;
                        option.classList.add("selected");
                        selected = option;
                    }

                    // Set up clicking
                    option.addEventListener("click", function() {
                        if (multiple) {
                            data[option.dataset.value] = option.classList.toggle("selected");
                            setValue(
                                attach.options
                                    .filter(function(o) {return data[o.dataset.value]})
                                    .map(function (o) {return [o.dataset.value, o.textContent]})
                            );
                        } else {
                            // Disable the selected one
                            if (selected)
                                selected.classList.remove("selected");

                            // Select this one
                            option.classList.add("selected");
                            selected = option;
                            setValue([option.dataset.value, option.textContent]);
                        }
                    }, false);
                });
                setValue(
                    attach.options
                        .filter(function(o) {return data[o.dataset.value]})
                        .map(function (o) {return [o.dataset.value, o.textContent]})
                );

                // The filter function
                function filter(value) {
                    attach.options.forEach(function (option) {
                        // Somehow figure out how to defer reflow until the very end
                        if (!value)
                            option.style.display = "block";
                        else {
                            if (option.dataset.text.indexOf(value) > -1)
                                option.style.display = "block";
                            else
                                option.style.display = "none";
                        }
                    });
                }

                $(attach.search).keyup(function() {
                    filter($(this).val().toLowerCase());
                });
            });
        });
    }
});