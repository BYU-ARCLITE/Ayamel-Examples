/**
 * For usage, see https://github.com/BYU-ARCLITE/Ayamel-Examples/wiki/Improving-forms
 */
(function() {
	//Note: This Is a major work in progress.
    $.fn.extend({
        superselect: function() {
            return this.each(function() {
                var select = this;
                var $select = $(this);
                var ractive = new Ractive({
				    el: select.parentNode,
					append: true,
					template: '<div class="{{(hidden?superselect:superselect open)}}">\
						<span tmpl-attach="span">\
						{{#selectedList}}<span class="badge badge-info pad-right-low">{{.text}}</span>{{/selectedList}}\
						{{^selectedList.length}}<span>Nothing selected</span>{{/selectedList.length}}\
						</span>\
						<div><button class="btn" proxy-tap="open"><i class="{{icon}}"></i> {{label}}</button></div>\
					</div>\
					<div class="superselectPopup" proxy-tap="clickdiv" style="display:{{(hidden?none:block)}}">\
						<div class="point"></div>\
						<div class="point"></div>\
						<div><input type="text" class="search-query" value="{{filter}}"/></div>\
						<div class="optionListing">\
						{{#options:i}}\
							{{#filtered(i)}}\
							<div class="option" proxy-tap="optclick:{{i}}">\
								{{#.selected}}<div class="check"></div>{{/.selected}}\
								{{.text}}\
							</div>\
							{{/filtered(i)}}\
						{{/options}}\
						</div>\
					</div>',
					data: {
						icon: select.dataset.icon,
						label: select.dataset.text,
						hidden: true,
						selectedList: [],
						filter: "",
						filtered: function(i){
							return ractive.data.options[i].text.toLowerCase().indexOf(ractive.data.filter) !== -1;
						},
						options: [].map.call(select, function(opt){
							return {
								opt: opt,
								value: opt.value,
								text: opt.text,
								selected: opt.selected
							};
						})
					}
				});
				ractive.on('clickdiv', function(e){ e.stopPropagation(); });
                ractive.on('open', function(e) {
					var pos = $(this).offset();
					e.stopPropagation();
					ractive.set({
						hidden: false,
						top: pos.top + 45,
						left: (pos.left + $(this).width()) - 280
					});
					return false;
				});
                window.addEventListener("click", function(){ ractive.hidden = true; });
                document.addEventListener("keyup", function(e) {
					if (e.keyCode == 27) { ractive.hidden = true; }
				});

				ractive.on('optclick', function(e, which){
					var fakeOption = ractive.data.options;
					ractive.set('options['+which+'].selected', !fakeOption.selected);
					fakeOption.opt.selected = !fakeOption.selected;
				});
            });
        }
    });
})();