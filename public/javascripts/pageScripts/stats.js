$(function() {
	var elList = [].filter.call(document.querySelectorAll('.resourceName'),function(el){
		var id = el.textContent;
		return id && id !== "unknown";
	});
	function getResourceNames(){
		if(elList.length === 0){ return; }
		var el = elList.pop();
		ResourceLibrary.load(el.textContent, function (resource) {
			el.textContent = resource.title;
			getResourceNames();
		});
	}
	getResourceNames();
});