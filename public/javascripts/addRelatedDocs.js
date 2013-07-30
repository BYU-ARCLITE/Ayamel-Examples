/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/16/13
 * Time: 1:59 PM
 * To change this template use File | Settings | File Templates.
 */
$(function() {

    var courseQuery = courseId ? "?course=" + courseId : "";

    function getLanguage(resource) {
        if (resource.languages.iso639_3 && resource.languages.iso639_3[0]) {
            var langCode = resource.languages.iso639_3[0].length === 3 ? resource.languages.iso639_3[0] : Ayamel.utils.upgradeLangCode(resource.languages.iso639_3[0]);
            return Ayamel.utils.getLangName(langCode)
        } else
            return "English";
    }

    // A resource id -> Resource object function
    function getResources(ids, callback) {
        async.map(ids, function (id, asyncCallback) {
            ResourceLibrary.load(id, function (resource) {
                resource.language = getLanguage(resource);
                resource.publishRequest = resource.attributes && resource.attributes.publishStatus === "requested";
                resource.published = !resource.publishRequest && owner;
                asyncCallback(null, resource);
            });
        }, function (err, data) {
            callback(data);
        });
    }

    function sendPublishRequest(resource) {
        window.location = "/content/" + content.id + "/publish/" + resource.id + courseQuery;
    }

    function publish(resource) {
        window.location = "/content/" + content.id + "/accept/" + resource.id + courseQuery;
    }

    function deleteDoc(resource) {
        window.location = "/content/" + content.id + "/delete/" + resource.id + courseQuery;
    }

    // Load personal caption tracks
    $.ajax("/ajax/permissionChecker", {
        type: "post",
        data: {
            contentId: content.id,
            permission: "edit",
            documentType: "captionTrack"
        },
        success: function(data) {
            getResources(data, function(resources) {
                TemplateEngine.render("/assets/templates/captionTrackRow.tmpl.html", {
                    resources: resources,
                    processRow: function(resource, attach) {
                        attach.publish && attach.publish.addEventListener("click", sendPublishRequest.bind(null, resource));
                        attach.delete.addEventListener("click", deleteDoc.bind(null, resource));
                    }
                }, function ($element, attach) {
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
            permission: "edit",
            documentType: "annotations"
        },
        success: function(data) {
            getResources(data, function(resources) {
                TemplateEngine.render("/assets/templates/annotationRow.tmpl.html", {
                    resources: resources,
                    processRow: function(resource, attach) {
                        attach.publish && attach.publish.addEventListener("click", sendPublishRequest.bind(null, resource));
                        attach.delete.addEventListener("click", deleteDoc.bind(null, resource));
                        attach.edit.addEventListener("click", function() {
                            window.location = "/content/" + content.id + "/annotations?doc=" + resource.id;
                        });
                    }
                }, function ($element, attach) {
                    $("#personalAnnotationsTable").append($element);
                });
            });
        }
    });

    // Load publishable caption tracks
    if (owner) {
        $.ajax("/ajax/permissionChecker", {
            type: "post",
            data: {
                contentId: content.id,
                permission: "publish",
                documentType: "captionTrack"
            },
            success: function(data) {
                getResources(data, function(resources) {
                    TemplateEngine.render("/assets/templates/publishRow.tmpl.html", {
                        resources: resources.filter(function(r){return r.publishRequest}),
                        processRow: function(resource, attach) {
                            attach.publish.addEventListener("click", publish.bind(null, resource));
                        }
                    }, function ($element, attach) {
                        $("#trackPublishRequests").append($element);
                    });
                });
            }
        });
    }

    // Load publishable annotations
    if (owner) {
        $.ajax("/ajax/permissionChecker", {
            type: "post",
            data: {
                contentId: content.id,
                permission: "publish",
                documentType: "annotations"
            },
            success: function(data) {
                getResources(data, function(resources) {
                    TemplateEngine.render("/assets/templates/publishRow.tmpl.html", {
                        resources: resources.filter(function(r){return r.publishRequest}),
                        processRow: function(resource, attach) {
                            attach.publish.addEventListener("click", publish.bind(null, resource));
                        }
                    }, function ($element, attach) {
                        $("#annotationPublishRequests").append($element);
                    });
                });
            }
        });
    }

    // Load course caption tracks
    $.ajax("/ajax/permissionChecker", {
        type: "post",
        data: {
            contentId: content.id,
            courseId: courseId,
            permission: "edit",
            documentType: "captionTrack"
        },
        success: function(data) {
            getResources(data, function(resources) {
                // Load rows into the table
                TemplateEngine.render("/assets/templates/captionTrackRow.tmpl.html", {
                    resources: resources,
                    processRow: function(resource, attach) {
                        attach.publish && attach.publish.addEventListener("click", sendPublishRequest.bind(null, resource));
                        attach.delete.addEventListener("click", deleteDoc.bind(null, resource));
                    }
                }, function ($element, attach) {
                    $("#courseCaptionsTable").append($element);
                });
            });
        }
    });

    // Load course annotations
    $.ajax("/ajax/permissionChecker", {
        type: "post",
        data: {
            contentId: content.id,
            courseId: courseId,
            permission: "edit",
            documentType: "annotations"
        },
        success: function(data) {
            getResources(data, function(resources) {
                TemplateEngine.render("/assets/templates/annotationRow.tmpl.html", {
                    resources: resources,
                    processRow: function(resource, attach) {
                        attach.publish && attach.publish.addEventListener("click", sendPublishRequest.bind(null, resource));
                        attach.delete.addEventListener("click", deleteDoc.bind(null, resource));
                        attach.edit.addEventListener("click", function() {
                            window.location = "/content/" + content.id + "/annotations?doc=" + resource.id + "&course=" + courseId;
                        });
                    }
                }, function ($element, attach) {
                    $("#courseAnnotationsTable").append($element);
                });
            });
        }
    });
});