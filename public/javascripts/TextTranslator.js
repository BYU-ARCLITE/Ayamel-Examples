var TextTranslator = (function () {
	"use strict";

	/**
	 * The text translator object
	 * @constructor
	 */
	function TextTranslator(srcLang, destLang){
		this.e = document.createElement("div");
		this.srcLang = srcLang;
		this.destLang = destLang;
	}

	/**
	 * This takes a DOM element and sets it up so selecting text will invoke the translator.
	 * @param DOMNode
	 * @param srcLang
	 * @param destLang
	 * @param eventData
	 */
	//TODO: Integrate with the generic text manipulation widget so we don't have to attach ad-hoc like this
	TextTranslator.prototype.attach = function attach(DOMNode, eventData) {
		var _this = this;

		function translate(text) {
			var event, node = DOMNode,
				srcLang = '';

			// Don't translate it if it's empty
			if(text === ''){ return; }

			while(node !== null && srcLang === ''){
				srcLang = node.lang;
				node = node.parentNode;
			}

			_this.translate(text, srcLang);

			// Dispatches a translate event
			_this.e.dispatchEvent(new CustomEvent("translate", {
				bubbles: true,
				cancelable: true,
				detail: {
					text: text,
					sourceElement: DOMNode,
					data: eventData
				}
			}));
		}

		if (Ayamel.utils.mobile.isMobile) {
			var doubleTapTime = 500, // A half second max between taps;
				taps = 0;

			DOMNode.addEventListener("touchstart", function() {
				taps++;

				if (taps === 1) {
					window.setTimeout(function(){taps = 0;}, doubleTapTime);
				}
			},false);
			DOMNode.addEventListener("touchend", function() {
				if (taps === 2) {
					// For now translate the whole line
					translate(window.getSelection().toString().trim());
				}
			},false);
		} else {
			DOMNode.addEventListener("mouseup", function(){
				// Get the text selection
				translate(window.getSelection().toString().trim());
			},false);
		}
	};

	TextTranslator.prototype.translate = function translate(text, srcLang, destLang) {
		var _this = this;

		if(!srcLang){ srcLang = this.srcLang; }
		if(!destLang){ destLang = this.destLang; }

		// Because translation engines look for two-letter codes, make sure that's what we are dealing with
		if(srcLang.length === 3){ srcLang = Ayamel.utils.downgradeLangCode(srcLang); }
		if(destLang.length === 3){ destLang = Ayamel.utils.downgradeLangCode(destLang); }

		//TODO: Update API, make endpoint configurable
		$.ajax("http://sartre3.byu.edu:9010/api/v1/lookup?srcLang=" + srcLang + "&destLang=" + destLang + "&word=" + encodeURIComponent(text), {
			dataType: "json",
			success: function success(data) {
				var event = new CustomEvent("translateSuccess", {
					bubbles: true,
					cancelable: true,
					detail: {
						text: text,
						translations: data.entries,
						engine: data.source,
						srcLang: Ayamel.utils.upgradeLangCode(srcLang),
						destLang: Ayamel.utils.upgradeLangCode(destLang)
					}
				});
				_this.e.dispatchEvent(event);
			},
			error: function(xhr, status) {
				var event = new CustomEvent("translateError", {
					bubbles: true,
					cancelable: true,
					detail: {
						text: text,
						message: JSON.parse(xhr.responseText).message || status
					}
				});
				_this.e.dispatchEvent(event);
			}
		});
	};

	TextTranslator.prototype.addEventListener = function(event, callback, capture) {
		this.e.addEventListener(event, callback, capture);
	};

	return TextTranslator;
}());