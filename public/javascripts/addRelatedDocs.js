/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/16/13
 * Time: 1:59 PM
 * To change this template use File | Settings | File Templates.
 */
$(function() {

    // A resource id -> Resource object function
    function getResources(ids, callback) {
        async.map(ids, function (id, asyncCallback) {
            ResourceLibrary.load(id, function (resource) {
                asyncCallback(null, resource);
            });
        }, function (err, data) {
            callback(data);
        });
    }

    function publishDoc(resource) {
        console.log("TODO: Publish resource");
    }

    function deleteDoc(resource) {
        console.log("TODO: Delete resource");
    }

    // Load personal caption tracks
    $.ajax("/ajax/permissionChecker", {
        type: "post",
        data: {
            contentId: content.id,
            owner: owner,
            userId: userId,
            permission: "edit",
            documentType: "captionTrack"
        },
        success: function(data) {
            getResources(data, function(resources) {
                var data = {
                    resources: resources,
                    processRow: function(resource, attach) {
                        attach.publish.addEventListener("click", publishDoc.bind(null, resource));
                        attach.delete.addEventListener("click", deleteDoc.bind(null, resource));
                    }
                };
                TemplateEngine.render("/assets/templates/captionTrackRow.tmpl.html", data, function ($element, attach) {
                    $("#personalCaptionsTable").append($element);
                });
            });
        }
    });

    // Load personal annotations
    $.ajax("/ajax/permissionChecker", {
        type: "post",
        data: {
            contentId: content.id,
            owner: owner,
            userId: userId,
            permission: "edit",
            documentType: "annotations"
        },
        success: function(data) {
            getResources(data, function(resources) {
                var data = {
                    resources: resources,
                    processRow: function(resource, attach) {
                        attach.publish.addEventListener("click", publishDoc.bind(null, resource));
                        attach.delete.addEventListener("click", deleteDoc.bind(null, resource));
                        attach.edit.addEventListener("click", function() {

                        });
                    }
                };
                TemplateEngine.render("/assets/templates/annotationRow.tmpl.html", data, function ($element, attach) {
                    $("#personalAnnotationsTable").append($element);
                });
            });
        }
    });

//    function loadAnnotations(ids, $table, courseId) {
//        // Turn those IDs into resources
//        async.map(ids, function (id, asyncCallback) {
//            ResourceLibrary.load(id, function (resource) {
//                asyncCallback(null, resource);
//            });
//        }, function (err, data) {
//
//            // Now populate the table
//            var $tbody = $table.find("tbody");
//            data.forEach(function (resource) {
//                var langCode = resource.languages[0].length === 3 ? resource.languages[0] : Ayamel.utils.upgradeLangCode(resource.languages[0]);
//                var language = Ayamel.utils.getLangName(langCode);
//                var published = resource.attributes && resource.attributes.publishStatus;
//                var html = Mustache.to_html(rowTemplate, {
//                    name: resource.title,
//                    language: language,
//                    contentId: content.id,
//                    resourceId: resource.id,
//                    course: !!courseId,
//                    courseId: courseId,
//                    owner: owner,
//                    published: published
//                });
//                $tbody.append(html)
//            });
//        });
//    }

    // Load personal annotations
//    $.ajax("/ajax/permissionChecker", {
//        type: "post",
//        data: {
//            contentId: content.id,
//            owner: owner,
//            userId: userId,
//            permission: "edit",
//            documentType: "annotations"
//        },
//        success: function(data) {
//            loadAnnotations(data, $("#personalAnnotationsTable"), 0);
//        }
//    });
});