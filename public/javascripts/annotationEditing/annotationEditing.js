/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/10/13
 * Time: 5:39 PM
 * To change this template use File | Settings | File Templates.
 */

$(function() {

    function loadManifest(type, callback) {
        // will create the new manifest every time the annoatations editor is loaded
        var manifest = new AnnotationManifest(type, {});
        manifest.language = "eng";
        callback({
            manifest: manifest,
            resource: {},
            filename: ""
        });
    }

    var typeMap = {
        text: "text",
        video: "text",
        audio: "text",
        image: "image"
    };

    $("#spinner").hide();

    document.getElementById("quit").addEventListener('click', function(e){
        e.preventDefault();
        window.history.back();
    }, false);

    var langList = Object.keys(Ayamel.utils.p1map).map(function (p1) {
        var code = Ayamel.utils.p1map[p1];
        return {value: code, text: Ayamel.utils.getLangName(code)};
    }).sort(function(a,b){ return a.text.localeCompare(b.text); });

    var ractive = new EditorWidgets.SuperSelect({
        el: "langLocation",
        data:{
            id: 'languages',
            selection: [],
            icon: 'icon-globe',
            text: 'Select Language',
            button: 'left',
            modalId: 'metadataModal',
            multiple: false,
            options: langList,
            defaultValue: {value:'zxx',text:'No Linguistic Content'}
        }
    });

    // First load the annotations
    loadManifest(typeMap[content.contentType], function(data) {
        // Load metadata from the resource
        var title = !!content.name ? content.name : "Untitled";
        var language = !!content.language ? content.languages.iso639_3[0] : "eng";

        // Then create the popup editor
        new AnnotationPopupEditor(function (popupEditor) {
            // Now check the content type
            if (typeMap[content.contentType] === "text" || typeMap[content.contentType] === "video") {

                // Create the text editor
                var textEditor = new AnnotationTextEditor({
                    holder: document.getElementById("annotationEditor"),
                    content: content,
                    manifest: data.manifest,
                    popupEditor: popupEditor,
                    language: language
                });
            }
            if (typeMap[content.contentType] === "image") {

                var imageEditor = new AnnotationImageEditor({
                    holder: document.getElementById("annotationEditor"),
                    content: content,
                    manifest: data.manifest,
                    popupEditor: popupEditor
                });
            }

            function setupEditButtons(id, resid, contentid) {
                document.getElementById(id).addEventListener('click', function() {
                    textEditor.editAnn(resid, contentid);
                }, false);
            }

            ResourceLibrary.load(content.resourceId).then(function(contentResource) {
                annotationIds = getAnnotationIds(contentResource);
                if(annotationIds.length){
                    $.ajax("/ajax/permissionChecker", {
                        type: "post",
                        data: {
                            contentId: content.id,
                            permission: "edit",
                            documentType: "annotationDocument",
                            ids: annotationIds
                        }
                    }).then(function(data) {
                        getResources(data).then(function(resources){
                            [].forEach.call(resources, function(resource) {
                                ResourceLibrary.load(resource.id).then(function(res){
                                    addEditAnnotationsTableRows(resource, res, function(id, resId, contentId) {
                                        setupEditButtons(id, resId, contentId);
                                    });
                                });
                            });
                        });
                    });
                }
            });

            var saveButton = document.getElementById("saveAnnotations");
            var fileName = "";
            document.getElementById("filename").addEventListener('keyup', function() {
                if (this.value.toString().trim() == "") {
                    saveButton.disabled = true;
                }
                else {
                    fileName = this.value;
                    saveButton.disabled = false;
                }
            }, false);

            // Setup the save annotations menu
            document.getElementById("save").addEventListener('change', function() {
                if (this.value === "new") {
                    $("#filename").show();
                    if (document.getElementById("filename").value == "")
                        saveButton.disabled = true;
                } else $("#filename").hide();
                if (this.value === "") {
                    saveButton.disabled = true;
                } else if (this.value !== "new") {
                    fileName = this.options[this.selectedIndex].text;
                    data.resource.id = this.value;
                    saveButton.disabled = false;
                }
            });

            document.getElementById("emptyManifest").addEventListener('click', function() {
                textEditor.emptyManifest();
            }, false);

            document.getElementById("refreshTranscript") .addEventListener('click', function() {
                textEditor.refreshTranscript();
            }, false);

            // Setup the navbar buttons
            document.getElementById("saveMetadataButton").addEventListener('click', function(){
                title = document.getElementById("title").value;
                var filename = document.getElementById("filename");
                filename.value = title;
                fileName = title;
                textEditor.language = ractive.data.selection[0];
                if (filename.value.toString().trim() != "")
                    saveButton.disabled = false;
                $("#metadataModal").modal("hide");
            }, false);

            saveButton.addEventListener('click', function(){
                var $this = $(this).hide();
                $("#spinner").show();

                var formData = new FormData();
                formData.append("title", fileName);
                formData.append("filename", fileName);
                formData.append("language", language);
                formData.append("contentId", content.id);
                formData.append("resourceId", !!data.resource.id ? data.resource.id : "");
                formData.append("manifest", JSON.stringify(textEditor.getAnnotations()));

                $.ajax("/annotations/saveEditedAnnotations", {
                    type: "post",
                    data: formData,
                    cache: false,
                    contentType: false,
                    processData: false,
                    success: function () {
                        $this.show();
                        $("#spinner").hide();
                        alert("Annotations saved.");
                        $('#saveAnnotationsModal').modal('hide')
                    },
                    error: function(data) {
                        console.log(data);
                        alert("There was a problem while saving the annotations.");
                        $("#spinner").hide();
                    }
                });

            }, false);
        });
    });

});