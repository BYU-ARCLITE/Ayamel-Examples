$(function() {
	function getCueData(list){
		list.forEach(function(rel){
			var tel = rel.querySelector('.resourceName'),
				tid = tel.textContent;
			if(!tid || tid === "unknown"){ return; }
			ResourceLibrary.load(tid, function (resource) {
				var cel = rel.querySelector('.cueNumber'),
					cid = cel.textContent;
				tel.textContent = resource.title;
				//get the track and extract the cue
				//cel.textContent = cue.text
			});
		});
	}
	function getAnnData(list){
		list.forEach(function(el){
			var id = el.textContent;
			if(!id || id === "unknown"){ return; }
			ResourceLibrary.load(id, function (resource) {
				el.textContent = resource.title;
			});
		});
	}
	getCueData([].slice.call(document.querySelectorAll('.translationRecord')));
	getAnnData([].slice.call(document.querySelectorAll('.annotationRecord .resourceName')));
	getCueData([].slice.call(document.querySelectorAll('.clickRecord')));
});