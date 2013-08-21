/**
 * For usage, see https://github.com/BYU-ARCLITE/Ayamel-Examples/wiki/Improving-forms
 */
(function() {
    function FakeOption(args) {
        var _this = this;
        var selected = !!args.selected;
        var filterText = args.option.text.toLowerCase();

        args.fakeOption.addEventListener("click", function(event) {
            event.stopPropagation();
            _this.selected = !selected
        });
        this.filter = function(value) {
            args.fakeOption.style.display = (!value || filterText.indexOf(value) > -1)?"block":"none";
        };
        Object.defineProperties(this, {
            value: { get: function(){ return args.option.value; } },
            selected: {
                get: function(){ return selected; },
                set: function(value){
                    value = !!value;
                    if(selected === value){ return; }
                    selected = value;
                    args.option.selected = value;
                    args.fakeOption.classList[selected?'add':'remove']("selected");
                    args.change.call(this,{
                        selected: selected,
                        value: args.option.value,
                        text: args.option.text
                    });
                }
            }
        });
    }

    $.fn.extend({
        superselect: function() {
            return this.each(function() {
                var select = this;
                var $select = $(this).hide();

                var data = {
                    icon: this.dataset.icon,
                    text: this.dataset.text,
                    options: [].map.call(this,function(opt){
                        return {
                            value: opt.value,
                            text: opt.text
                        };
                    })
                }

                TemplateEngine.render("/assets/templates/superselect.tmpl.html", data, function ($element, attach) {
                    $select.after([attach.data, attach.popup]);

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
                            attach.nothing.style.display = "none";
                        } else {
                            labels[text].style.display = "none";
                            displaying--;
                            if(displaying === 0){
                                attach.nothing.style.display = "inline-block";
                            }
                        }
                    }

                    /*
                     * Setup cross bindings between the real and fake options
                     */

                    // Make sure the attached options are contained in an array
                    if (!attach.options){ attach.options = []; }
                    else if (!(attach.options instanceof Array)){ attach.options = [attach.options]; }

                    // Create a "Fake Option" wrapper for each option
                    var fakeOptions = [].map.call(select,function(opt, i){
                        var that = new FakeOption({
                            option: opt,
                            fakeOption: attach.options[i],
                            change: function(data) {
                                setLabel(data.text, data.selected);
                                if(data.selected && !select.multiple){
                                    fakeOptions.forEach(function(fopt){
                                        if(fopt === that){ return; }
                                        fopt.selected = false;
                                    });
                                }
                            }
                        });
                        return that;
                    });

                    // TODO: When the value of the select changes, make sure the fake option wrappers are also updated

                    /*
                     * Set up filtering
                     */

                    // Activate the filtering when typing in the search bar
                    attach.search.addEventListener("keyup", function() {
                        var text = this.value.toLowerCase();
                        fakeOptions.forEach(function(fakeOption){ fakeOption.filter(text); });
                    });
                });
            });
        }
    });
})();