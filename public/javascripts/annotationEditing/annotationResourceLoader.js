/*
 *    Used to get Annotation File contents from the resource library.
 *
 */

function getResource(resourceId) {
    ResourceLibrary.load(contentId).then(function(resource) {
        return resource;
    });
}

function getAnnotationIds(resource) {
    annotationIds = resource.relations
    .filter(function(r){return r.type==="references";})
    .map(function(r){return r.subjectId;}).join(',');
    // returns a string of the annotation ids for the content
    return annotationIds;
}

function getResources(ids) {
    return Promise.all(ids.map(function(id){
        return ResourceLibrary.load(id);
    }));
}

// Adds the annotation files to the edit and save annotations modals
// @param resource = content resource object
// @param res = annotation file resource object
function addEditAnnotationsTableRows(resource, res, last, entries) {

    var option = "<option value='" + resource.id + "'>" + resource.title + "</option>";
    
    // Add all of the files to the edit and save modal dropdowns
    var table = document.getElementById("editTable");
    // The arguments for editAnn in the onclick function need to be surrounded in quotes for some reason
    // putting the arguments right in the button might not be the best solution
    table.innerHTML += 
    "<tr>\
        <td>"+resource.title+"</td>\
        <td>"+Ayamel.utils.getLangName(res.languages.iso639_3[0])+"</td>\
        <td>\
            <button class='btn btn-yellow' onclick='editAnn(\"" + resource.id + "\", \"" + content.id + "\")' type='button'><i class='icon-pencil'></i> Edit</button>\
        </td>\
    </tr>";
    document.getElementById("save").innerHTML += option;
    index++;
}

function annotationEditLoad() {
	content.id;
}