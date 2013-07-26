(function() {
    function FakeOption(args) {
        var _this = this;
        var selected = !!args.selected;
        var listeners = {};
        var filterText = args.option.text.toLowerCase();

        args.fakeOption.addEventListener("click", function(event) {
            event.stopPropagation();
            _this.selected = !selected;
        });

        Object.defineProperties(this, {
            // Setting this object's "selected" value makes sure the check mark appears and the option is selected.
            selected: {
                set: function(value) {
                    if (!!value === selected)
                        return;

                    args.option.selected = selected = !!value;
                    if (selected)
                        args.fakeOption.classList.add("selected");
                    else
                        args.fakeOption.classList.remove("selected");
                    _this.emit("change", {
                        selected: selected,
                        value: args.option.value,
                        text: args.option.text
                    });
                }
            },

            filter: {
                set: function(value) {
                    if (!value || filterText.indexOf(value) > -1)
                        args.fakeOption.style.display = "block";
                    else
                        args.fakeOption.style.display = "none";
                }
            },

            value: {
                get: function() {
                    return args.option.value;
                }
            },

            // Event emitting
            emit: {
                value: function(event, data) {
                    if (listeners[event])
                        listeners[event].forEach(function(callback) {callback(data);});
                }
            },

            // Event listener binding
            on: {
                value: function(event, callback) {
                    if (listeners[event])
                        listeners[event].push(callback);
                    else
                        listeners[event] = [callback];
                    return this;
                }
            }
        });
    }

    $.fn.extend({
        superselect: function(callback) {
            return this.each(function() {
                var select = this;
                var $select = $(this).hide();
                var multiple = $select.prop("multiple");
                var i;

                var data = {
                    icon: this.dataset.icon,
                    text: this.dataset.text,
                    options: []
                };
                for (i=0; i<this.length; i++) {
                    data.options.push({
                        value: this[i].value,
                        text: this[i].text
                    });
                }

                TemplateEngine.render("/assets/templates/superselect.tmpl.html", data, function ($element, attach) {
                    $select.after([attach.data, attach.popup]);
//                    $("body").append(attach.popup);

                    // Opening/closing the popup
                    $(attach.popup).hide().click(function(e) {
                        e.stopPropagation();
                    });
                    $(attach.button).click(function(e) {
                        e.stopPropagation();
                        var pos = $(this).offset();
                        $(attach.popup).toggle().offset({top: pos.top + 45, left: (pos.left + $(this).width()) - 280});
                        attach.data.classList.toggle("open");
                        return false;
                    });
                    window.addEventListener("click", function() {
                        $(attach.popup).hide();
                        attach.data.classList.remove("open");
                    });
                    document.addEventListener("keyup", function(e) {
                        if (e.keyCode == 27) {
                            $(attach.popup).hide();
                            attach.data.classList.remove("open");
                        }
                    });


                    // Set up the label reflection
                    var labels = {};
                    var displaying = 0;
                    function setLabel(text, selected) {
                        if (!labels[text]) {
                            var span = document.createElement("span");
                            span.className = "badge badge-info pad-right-low";
                            span.innerText = text;
                            attach.span.appendChild(span);
                            labels[text] = span;
                        }
                        if (selected) {
                            labels[text].style.display = "inline-block";
                            displaying++;
                        } else {
                            labels[text].style.display = "none";
                            displaying--;
                        }
                        if (!displaying)
                            attach.nothing.style.display = "inline-block";
                        else
                            attach.nothing.style.display = "none";
                    }

                    /*
                     * Setup cross bindings between the real and fake options
                     */

                    // Make sure the attached options are contained in an array
                    if (!attach.options) attach.options = [];
                    if (!(attach.options instanceof Array)) attach.options = [attach.options];

                    // Create a "Fake Option" wrapper for each option
                    var fakeOptions = [];
                    for (i=0; i<select.length; i++) {
                        fakeOptions.push(
                            new FakeOption({
                                option: select[i],
                                fakeOption: attach.options[i]
                            }).on("change", function(data) {
                                setLabel(data.text, data.selected);
                            })
                        );
                    }

                    // When the value of the select changes, make sure the fake option wrappers are also updated
                    select.setValue = function(value) {
                        if (!(value instanceof Array))
                            value = [value];

                        // Update the fake options
                        fakeOptions.forEach(function(fakeOption) {
                            if (value.indexOf(fakeOption.value) > -1)
                                fakeOption.selected = true;
                            else
                                fakeOption.selected = false;
                        });
                    };

                    /*
                     * Set up filtering
                     */

                    // The filter function
                    function filter(value) {
                        fakeOptions.forEach(function (fakeOption) {
                            fakeOption.filter = value;
                        });
                    }

                    // Activate the filtering when typing in the search bar
                    attach.search.addEventListener("keyup", function() {
                        var text = this.value.toLowerCase();
                        filter(text);
                    });

                    if (callback)
                        callback.call(select);
                });
            });
        }
    });

})();