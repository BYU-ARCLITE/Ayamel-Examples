/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/10/13
 * Time: 5:39 PM
 * To change this template use File | Settings | File Templates.
 */
$(function() {
    function getParameterByName(name){
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regexS = "[\\?&]" + name + "=([^&#]*)";
        var regex = new RegExp(regexS);
        var results = regex.exec(window.location.search);
        if(results == null)
            return "";
        else
            return decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    function loadManifest(type, callback) {
        var docId = getParameterByName("doc");
        if (docId.length > 0) {

            // Load the annotation document
            ResourceLibrary.load(docId, function (resource) {
                var docUrl = resource.content.files[0].downloadUri;
                AnnotationLoader.load(docUrl, function(manifest) {
                    callback({
                        manifest: manifest,
                        resource: resource,
                        filename: docUrl.substr(docUrl.lastIndexOf("/") + 1)
                    });
                });
            });
        } else {

            // No annotation document. Create a new manifest
            var manifest = new AnnotationManifest(type, []);
            manifest.language = "eng";
            callback({
                manifest: manifest,
                resource: null,
                filename: ""
            });
        }
    }

    function generateDoc(type, manifest) {
        var annotations = manifest.annotations;
        if (type === "text") {
            annotations = manifest.annotations.map(function (annotation) {
                return {
                    regex: annotation.regex.source,
                    data: annotation.data
                };
            });
        }
        return {
            meta: {
                scheme: {
                    name: "simple",
                    version: 1.2
                },
                target: type
            },
            annotations: annotations
        };
    }

    var typeMap = {
        text: "text",
        video: "text",
        audio: "text",
        image: "image"
    };

    $("#spinner").hide();

    $("#quit").click(function() {
        history.back();
        return false;
    });

    // First load the annotations
    loadManifest(typeMap[content.contentType], function(data) {

        // Load metadata from the resource
        var title = !!data.resource ? data.resource.title : "Untitled";
        var language = !!data.resource ? data.resource.languages[0] : "eng";
        $("#title").val(title);
        $("#language").val(language);

        // Then create the popup editor
        new AnnotationPopupEditor(function (popupEditor) {

            // Now check the content type
            if (typeMap[content.contentType] === "text") {

                // Create the text editor
                var textEditor = new AnnotationTextEditor({
                    $holder: $("#annotationEditor"),
                    content: content,
                    manifest: data.manifest,
                    popupEditor: popupEditor
                });
            }
            if (typeMap[content.contentType] === "image") {

                var imageEditor = new AnnotationImageEditor({
                    $holder: $("#annotationEditor"),
                    content: content,
                    manifest: data.manifest,
                    popupEditor: popupEditor
                });
            }

            // Setup the navbar buttons
            $("#saveMetadataButton").click(function() {
                title = $("#title").val();
                language = $("#language").val();
                $("#metadataModal").modal("hide");
            });
            $("#saveButton").click(function() {
                var $this = $(this).hide();
                $("#spinner").show();

                var formData = new FormData();
                var doc = JSON.stringify(generateDoc(typeMap[content.contentType], data.manifest));
                formData.append("title", title);
                formData.append("language", language);
                formData.append("annotations", doc);
                formData.append("resourceId", !!data.resource ? data.resource.id : "");
                if (data.filename)
                    formData.append("filename", data.filename);

                var courseId = getParameterByName("course");
                if (!courseId)
                    courseId = 0;

                $.ajax("/content/" + content.id + "/annotations?course=" + courseId, {
                    type: "post",
                    data: formData,
                    cache: false,
                    contentType: false,
                    processData: false,
                    success: function () {
                        $this.show();
                        $("#spinner").hide();
                        alert("Annotations saved.");
                    },
                    error: function(data) {
                        console.log(data);
                        alert("There was a problem while saving the annotations.");
                    }
                })
            });
        });
    });

});