/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/10/13
 * Time: 5:39 PM
 * To change this template use File | Settings | File Templates.
 */

$(function() {

    function loadManifest(type, callback) {
        // will create the new manifest every time the annoatation editor is loaded
        var manifest = new AnnotationManifest(type, {});
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

    var annotationPopupEditor;

    $("#spinner").hide();

    document.getElementById("quit").addEventListener('click', function(e){
        e.preventDefault();
        window.history.back();
    }, false);

    var langList = Object.keys(Ayamel.utils.p1map).map(function (p1) {
        var code = Ayamel.utils.p1map[p1],
            engname = Ayamel.utils.getLangName(code,"eng"),
            localname = Ayamel.utils.getLangName(code,code);
        return {value: code, text: engname, desc: localname!==engname?localname:void 0};
    });

    langList.push({ value: "apc", text: "North Levantine Arabic"});
    langList.push({ value: "arz", text: "Egyptian Arabic"});
    langList = langList.sort(function(a,b){ return a.text.localeCompare(b.text); });

    var language = !!content.language ? content.languages.iso639_3[0] : "eng";

    var ractive = new EditorWidgets.SuperSelect({
        el: "langLocation",
        id: 'languages',
        value: [],
        icon: 'icon-globe',
        text: 'Select Language',
        button: 'left',
        modal: "metadataModal",
        multiple: false,
        options: langList,
        defaultValue: {value:"zxx",text:"No Linguistic Content"}
    });

    // First load the annotations
    loadManifest(typeMap[content.contentType], function(data) {

        // Then create the popup editor
        annotationPopupEditor = new AnnotationPopupEditor(function (popupEditor) {
            // Create the text editor
            this.textEditor = new AnnotationTextEditor({
                holder: document.getElementById("annotationEditor"),
                content: content,
                popupEditor: popupEditor,
                language: language,
                ractive: ractive
            });

            var saveButton = document.getElementById("saveAnnotations");
            var fileName = "";
            var fileNameEl = document.getElementById("filename");
            var saveOptions = document.getElementById("save");
            var metadataTitle = document.getElementById("title");

            document.getElementById("title").value = !!content.name ? content.name + " - Annotations" : "";

            fileNameEl.addEventListener('keyup', function() {
                if (this.value.toString().trim() === "") {
                    saveButton.disabled = true;
                }
                else {
                    fileName = this.value;
                    saveButton.disabled = false;
                }
            }, false);

            /*
             * Setup the navbar buttons
             */
            document.addEventListener("editAnnotations", function(e) {
                textEditor.editAnn(e.detail.resourceId, content.id);
                saveOptions.value = e.detail.resourceId;
                metadataTitle.value = fileName = saveOptions.selectedOptions[0].innerHTML;
                if (saveOptions.value === "new") {
                    $("#filename").show();
                    if (document.getElementById("filename").value === "")
                        saveButton.disabled = true;
                } else {
                    $("#filename").hide();
                    saveButton.disabled = false;
                }
            });

            document.getElementById("emptyManifest").addEventListener('click', function() {
                textEditor.emptyManifest();
            }, false);

            document.getElementById("saveMetadataButton").addEventListener('click', function(){
                var title = metadataTitle.value;
                fileNameEl.value = title;
                fileName = title;
                textEditor.language = language = ractive.value[0];
                if (fileNameEl.value.toString().trim() != "")
                    saveButton.disabled = false;
                $("#metadataModal").modal("hide");
                //textEditor.refreshTranscript();
            }, false);

            saveButton.addEventListener('click', function(){
                var $this = $(this).hide();
                $("#spinner").show();
                data.resource.id = saveOptions.value;
                if (fileName.trim() === "") {
                    alert("You haven't entered a filename.");
                    $("#spinner").hide();
                    $this.show();
                    return;
                }
                /*
                 *  Create and send post request.
                 *  The Following lines remove the following characters from the string fileName: * \ / < >
                 */
                var re = /[\*\\\/\<\>][\ \t\n]*/g;
                fileName = fileName.replace(re, '');
                var formData = new FormData();
                formData.append("title", fileName);
                formData.append("filename", fileName);
                formData.append("language", language);
                formData.append("contentId", content.id);
                formData.append("resourceId", (data.resource.id !== "new") ? data.resource.id : "");
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
                        // Update the manifest copy on save
                        textEditor.manifestCopy = JSON.stringify(textEditor.getAnnotations());

                    },
                    error: function(data) {
                        console.log(data);
                        alert("There was a problem while saving the annotations.");
                        $("#spinner").hide();
                        $this.show();
                    }
                });

            }, false);
        });
    });
});