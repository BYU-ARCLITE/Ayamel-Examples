$(document).ready(function(e){

	var inAnimation = false;
	var faces = document.querySelector('.faces');
	var facesWindow = document.querySelector('.faces-window');

	function getOffsetFacesWindow(face){
		return face.offsetLeft - facesWindow.scrollLeft;
	}

	function getLastFace(){
		for(var i = 0; i < faces.childElementCount; i++){
			var face = faces.children[i];
			var faceX_facesWindow = getOffsetFacesWindow(face, facesWindow);
			if(faceX_facesWindow <= 0) continue;
			if(faceX_facesWindow >= facesWindow.offsetWidth) break;
			lastFace = face;
		}
		return lastFace;
	}

	function slideRight(){
		if(inAnimation) return;
		inAnimation = true;
		var lastFace = getLastFace(faces);
		if(lastFace === document.querySelector('.faces-filler')) {
			inAnimation = false;
			return;
		}
		var offsetStart = getOffsetFacesWindow(lastFace, facesWindow);
		var offsetStr = offsetStart.toString();
		var offset = '+=' + offsetStr + 'px';
		$(facesWindow).animate({scrollLeft: offset}, {
			duration: 2000,
			always: function(){inAnimation=false;},
		});
	}

	document.querySelector('.face-nav-btn-left').addEventListener('click', slideLeft);

	function slideLeftDistance(distance){
		var scrollChangeStr = distance.toString();
		var scrollChange = '-=' + scrollChangeStr + 'px';
		$(facesWindow).animate({scrollLeft: scrollChange}, {
			duration: 2000,
			always: function(){inAnimation=false;},
		});
	}

	function getFirstFace() {
		for(var i = 0; i < faces.childElementCount; i++){
			var face = faces.children[i];
			var faceX_facesWindow = getOffsetFacesWindow(face, facesWindow);
			if(faceX_facesWindow >= 0) return face;
		}
	}

	function getNewFirstFace(width) {
		var leftEndFace;
		for(var i = 0; i < faces.childElementCount; i++) {
			var face = faces.children[i];
			if(face.offsetLeft > facesWindow.scrollLeft - width) {
				leftEndFace = face;
				break;
			}
		}
		return leftEndFace;
	}

	function slideLeft(){
		if(inAnimation) return;
		inAnimation = true;
		var currentFirstFace = getFirstFace();
		var width = facesWindow.offsetWidth;
		var newFirstFace = getNewFirstFace(width);
		var offsetCurrent = currentFirstFace.offsetLeft;
		var offsetNew = newFirstFace.offsetLeft;
		var slideDistance = offsetCurrent - offsetNew;
		slideLeftDistance(slideDistance);
	}

	document.querySelector('.face-nav-btn-right').addEventListener('click', slideRight);
});