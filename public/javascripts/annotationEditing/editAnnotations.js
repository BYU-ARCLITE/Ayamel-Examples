$(function(){

    var editAnnotations = new Ractive({
        el: "#editTable",
        append: true,
        template: '{{#resources:i}}<tr>\
            <td>{{.title}}</td>\
            <td>{{getLanguage(this)}}</td>\
            <td>\
                <button id="editButton{{i}}" class="btn btn-yellow" on-tap="edit:{{.id}}" type="button"><i class="icon-pencil"></i> Edit</button>\
            </td>\
        </tr>{{/resources}}',
        data: {
            resources: [],
            getLanguage: getLanguage
        }
    });

    var saveAnnotations = new Ractive({
        el: "#saveOptions",
        append: true,
        template:
        '<select id="save" value="{{selectedResource}}">\
            <option value="new">New File</option>\
            {{#resources}}\
            <option value="{{.id}}">{{.title}}</option>\
            {{/resources}}\
        </select>',
        data: {
            resources: []
        }
    });

    function getLanguage(resource) {
        var langs = resource.languages.iso639_3;
        /* This returns English always. Not the language of the annotations.
            When annotations are saved, the iso639_3 array only has English added to it. */
        return (langs && langs[0])?Ayamel.utils.getLangName(langs[0]):"English";
    }

    function getResources(ids) {
        return Promise.all(ids.map(function(id){
            return ResourceLibrary.load(id);
        }));
    }

    editAnnotations.on('edit', function(_, resid) {
        document.dispatchEvent(new CustomEvent("editAnnotations", {
            bubbles: true,
            detail: {resourceId: resid}
        }));
    });

    document.addEventListener("annotationFileDelete", function(fileName) {
        /* updates the save and edit modals when an annotation file is deleted */
        for (var i = 0; i < saveAnnotations.data.resources.length; i++) {
            if (saveAnnotations.get("resources")[i].title === fileName.detail) {
                saveAnnotations.get("resources").splice(i, 1);
            }
        }
        for (var i = 0; i < editAnnotations.data.resources.length; i++) {
            if (editAnnotations.get("resources")[i].title === fileName.detail) {
                editAnnotations.get("resources").splice(i, 1);
            }
        }
    }); 

    ResourceLibrary.load(content.resourceId, function(resource){
        var annotationIds = resource.relations
            .filter(function(r){return r.type==="references";})
            .map(function(r){return r.subjectId;}).join(',');

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
                getResources(data).then(function(rs) {
                    saveAnnotations.set('resources', rs);
                    editAnnotations.set('resources', rs);
                    // Setup the save annotations menu
                    document.getElementById("save").addEventListener('change', function() {
                        if (this.value === "new") {
                            $("#filename").show();
                            if (document.getElementById("filename").value == "")
                                document.getElementById("saveAnnotations").disabled = true;
                        } else $("#filename").hide();
                        if (this.value === "") {
                            document.getElementById("saveAnnotations").disabled = true;
                        } else if (this.value !== "new") {
                            fileName = this.options[this.selectedIndex].text;
                            //data.resource.id = this.value;
                            document.getElementById("saveAnnotations").disabled = false;
                        }
                    });
                });
            });
        }
    });

});