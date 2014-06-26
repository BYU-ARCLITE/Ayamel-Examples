/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/11/13
 * Time: 2:10 PM
 * To change this template use File | Settings | File Templates.
 */
var AnnotationImageEditor = (function() {
    function AnnotationImageEditor(args) {

        var activeAnnotation = null;
		ContentRenderer.castContentObject(args.content).then(function(content){
			if(content.contentType !== 'image'){ throw "Non-Image Content"; }
			ResourceLibrary.load(content.resourceId, function(resource){
				ImageRenderer.render({
					drawable: args.drawable,
					filter: args.filter,
					open: args.open,
					resource: resource,
					annotate: false,
					courseId: args.courseId,
					contentId: args.contentId,
					permission: args.permission,
					holder: args.$holder[0],
					imgcallback: function(image, layout) {

						// Create the image annotating canvas
						var canvas = ImageAnnotator.annotate({
							drawable: true,
							open: false,
							image: image,
							layout: layout,
							manifests: [args.manifest],
							filter: function(box, data) {
								var preResizeAnnotation = null;
								box.resizable = true;
								box.selectable = true;

								// Set up the select event
								box.addEventListener("select", function() {
									args.popupEditor.show();
									args.popupEditor.annotation = box.annotation;
								});
								box.addEventListener("resizeend", function () {
									var boxPosition = box.position;
									box.annotation.location = [
										[boxPosition.x1, boxPosition.y1],
										[boxPosition.x2, boxPosition.y2]
									];
								});
							}
						});

						// Set up canvas drawing
						var startCoords, tempBox;
						canvas.addEventListener("drawstart", function (event) {
							var x = event.drawX;
							var y = event.drawY;
							startCoords = [x, y];
							tempBox = canvas.drawBox(x, y, x, y, ["annotationBox"]);
						});
						canvas.addEventListener("drawupdate", function (event) {
							tempBox.position = {
								x1: Math.max(Math.min(event.drawX, startCoords[0]), 0),
								y1: Math.max(Math.min(event.drawY, startCoords[1]), 0),
								x2: Math.min(Math.max(event.drawX, startCoords[0]), 1),
								y2: Math.min(Math.max(event.drawY, startCoords[1]), 1)
							};
						});
						canvas.addEventListener("drawend", function (event) {
							// Check that we didn't click
							var size = Math.sqrt(Math.pow(event.drawX - startCoords[0], 2) + Math.pow(event.drawY - startCoords[1], 2));
							if (size < 0.05) {
								tempBox.$element.remove();
								tempBox = null;
								return;
							}

							// Create an annotation from the box
							var boxPosition = tempBox.position;
							var location = [
								[boxPosition.x1, boxPosition.y1],
								[boxPosition.x2, boxPosition.y2]
							];
							activeAnnotation = new ImageAnnotation(location, {type: "text", value: ""});
							args.manifest.annotations.push(activeAnnotation);

							// Delete the drawing box
	//                        tempBox.$element.remove();
	//                        tempBox = null;
							renderAnnotations();
						});
					}
				});
			});
		});

        /*
         * Interaction with popup editor
         */
        args.popupEditor.on("update", function() {
            activeAnnotation = args.popupEditor.annotation;
            renderAnnotations();
        });
        args.popupEditor.on("delete", function() {
            var index = args.manifest.annotations.indexOf(activeAnnotation);
            args.manifest.annotations.splice(index, 1);
            renderAnnotations();
        });

    }

    return AnnotationImageEditor;
})();