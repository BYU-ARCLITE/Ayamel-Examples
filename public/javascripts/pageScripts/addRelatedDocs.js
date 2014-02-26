/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/16/13
 * Time: 1:59 PM
 * To change this template use File | Settings | File Templates.
 */
$(function() {

    var courseQuery = courseId ? "?course=" + courseId : "",
        captionsTemplate = '<table class="table table-bordered">\
            <thead><tr>\
                <th>Track name</th><th>Language</th><th>Download</th><th>Options</th><th>Publish</th>\
            </tr></thead>\
            <tbody>\
                {{#resources:i}}<tr>\
                    <td>{{.title}}</td>\
                    <td>{{.language}}</td>\
                    <td>{{#.content.files}}<a href="{{.downloadUri}}" download="{{title}}">{{.mime}}&nbsp;</a>{{/.content.files}}</td>\
                    <td>\
                        <button class="btn btn-magenta" proxy-tap="delete:{{.id}}"><i class="icon-trash"></i> Delete</button>\
                    </td>\
                    <td>\
                        {{#.published}}<em>Published</em>{{/.published}}\
                        {{^.published}}\
                            {{#.publishRequest}}<em>A publish request has been sent</em>{{/.publishRequest}}\
                            {{^.publishRequest}}<button class="btn" proxy-tap="publish:{{.id}}"><i class="icon-cloud-upload"></i> Publish</button>{{/.publishRequest}}\
                        {{/.published}}\
                    </td>\
                </tr>{{/resources}}\
            </tbody>\
        </table>',
        annotationsTemplate = '<table class="table table-bordered pad-top-high">\
            <thead><tr>\
                <th>Track name</th><th>Language</th><th>Download</th><th>Options</th><th>Publish</th>\
            </tr></thead>\
            <tbody>\
                {{#resources}}<tr>\
                    <td>{{.title}}</td>\
                    <td>{{.language}}</td>\
                    <td>{{#.content.files}}<a href="{{.downloadUri}}" download="{{title}}">{{.mime}}&nbsp;</a>{{/.content.files}}</td>\
                    <td>\
                        <button class="btn btn-blue" proxy-tap="edit:{{.id}}"><i class="icon-edit-sign"></i> Edit</button>\
                        <button class="btn btn-magenta" proxy-tap="delete:{{.id}}"><i class="icon-trash"></i> Delete</button>\
                    </td>\
                    <td>\
                        {{#.published}}<em>Published</em>{{/.published}}\
                        {{^.published}}\
                            {{#.publishRequest}}<em>A publish request has been sent</em>{{/.publishRequest}}\
                            {{^.publishRequest}}<button class="btn" proxy-tap="publish:{{.id}}"><i class="icon-cloud-upload"></i> Publish</button>{{/.publishRequest}}\
                        {{/.published}}\
                    </td>\
                </tr>{{/resources}}\
            </tbody>\
        </table>',
        publishTemplate = '<table class="table table-bordered">\
            <thead><tr>\
                <th>Track name</th><th>Language</th><th>Options</th><th>Publish</th>\
            </tr></thead>\
            <tbody>\
                {{#resources}}<tr>\
                    <td>{{.title}}</td>\
                    <td>{{.language}}</td>\
                    <td>\
                        <button class="btn" proxy-tap="publish:{{.id}}"><i class="icon-cloud-upload"></i> Accept Publish Request</button>\
                    </td>\
                </tr>{{/resources}}\
            </tbody>\
        </table>';

    function getLanguage(resource) {
        if (resource.languages.iso639_3 && resource.languages.iso639_3[0]) {
            return Ayamel.utils.getLangName(resource.languages.iso639_3[0].length === 3 ? resource.languages.iso639_3[0] : Ayamel.utils.upgradeLangCode(resource.languages.iso639_3[0]));
        }
        return "English";
    }

    // A resource id -> Resource object function
    function getResources(ids, callback) {
        async.map(ids, function (id, asyncCallback) {
            ResourceLibrary.load(id, function (resource) {
                resource.language = getLanguage(resource);
                resource.publishRequest = resource.clientUser && resource.clientUser.id && resource.clientUser.id.indexOf("request") > -1;
                resource.published = !(resource.clientUser && resource.clientUser.id);
                asyncCallback(null, resource);
            });
        }, function (err, data) {
            callback(data);
        });
    }

    function sendPublishRequest(rid) {
        window.location = "/content/" + content.id + "/publish/" + rid + courseQuery;
    }

    function publish(rid) {
        window.location = "/content/" + content.id + "/accept/" + rid + courseQuery;
    }

    function deleteDoc(rid) {
        if(!confirm("Are you sure you want to delete?")){ return; }
        window.location = "/content/" + content.id + "/delete/" + rid + courseQuery;
    }

    ResourceLibrary.load(content.resourceId, function(resource){
        var captionTrackIds = resource.relations
                .filter(function(r){return r.type==="transcript_of";})
                .map(function(r){return r.subjectId;}).join(','),
            annotationIds = resource.relations
                .filter(function(r){return r.type==="references";})
                .map(function(r){return r.subjectId;}).join(',');

        (function(cb){
            if(captionTrackIds.length){
                $.ajax("/ajax/permissionChecker", {
                    type: "post",
                    data: {
                        contentId: content.id,
                        permission: "edit",
                        documentType: "captionTrack",
                        ids: captionTrackIds
                    }
                }).then(cb);
            }else{ cb([]); }
        }(function(data) {
            getResources(data, function(resources) {
                var p, c;
                // Load personal caption tracks
                p = new Ractive({
                    el: "personalCaptionsTable",
                    template: captionsTemplate,
                    data: { resources: resources }
                });
                p.on('delete', function(_, which){ deleteDoc(which); });
                p.on('publish', function(_, which){ sendPublishRequest(which); });

                // Load course caption tracks
                if(document.getElementById('courseCaptionsTable')){
                    c = new Ractive({
                        el: "courseCaptionsTable",
                        template: captionsTemplate,
                        data: { resources: resources }
                    });
                    c.on('delete', function(_, which){ deleteDoc(which); });
                    c.on('publish', function(_, which){ sendPublishRequest(which); });
                }
            });
        }));

        (function(cb){
            if(annotationIds.length){
                $.ajax("/ajax/permissionChecker", {
                    type: "post",
                    data: {
                        contentId: content.id,
                        permission: "edit",
                        documentType: "annotations",
                        ids: annotationIds
                    }
                }).then(cb);
            }else{ cb([]); }
        }(function(data) {
            getResources(data, function(resources) {
                var p, c;

                // Load personal annotations
                p = new Ractive({
                    el: "personalAnnotationsTable",
                    template: annotationsTemplate,
                    data: { resources: resources }
                });
                p.on('delete', function(_, which){ deleteDoc(which); });
                p.on('publish', function(_, which){ sendPublishRequest(which); });
                p.on('edit', function(_, which){
                    window.location = "/content/" + content.id + "/annotations?doc=" + which;
                });

                // Load course annotations
                if(document.getElementById('courseCaptionsTable')){
                    c = new Ractive({
                        el: "courseAnnotationsTable",
                        template: annotationsTemplate,
                        data: { resources: resources }
                    });
                    c.on('delete', function(_, which){ deleteDoc(which); });
                    c.on('publish', function(_, which){ sendPublishRequest(which); });
                    c.on('edit', function(_, which){
                        window.location = "/content/" + content.id + "/annotations?doc=" + which;
                    });
                }
            });
        }));

        if (owner) {
            // Load publishable caption tracks
            (function(cb){
                if(captionTrackIds.length){
                    $.ajax("/ajax/permissionChecker", {
                        type: "post",
                        data: {
                            contentId: content.id,
                            permission: "publish",
                            documentType: "captionTrack",
                            ids: captionTrackIds
                        }
                    }).then(cb);
                } else { cb([]); }
            }(function(data){
                getResources(data, function(resources) {
                    var r = new Ractive({
                        el: "trackPublishRequests",
                        template: publishTemplate,
                        data: { resources: resources.filter(function(res){return res.publishRequest}) }
                    });
                    r.on('publish', function(_, which){ publish(which); });
                });
            }));

            // Load publishable annotations
            (function(cb){
                if(annotationIds.length){
                    $.ajax("/ajax/permissionChecker", {
                        type: "post",
                        data: {
                            contentId: content.id,
                            permission: "publish",
                            documentType: "annotations",
                            ids: annotationIds
                        }
                    }).then(cb);
                } else { cb([]); }
            }(function(data){
                getResources(data, function(resources) {
                    var r = new Ractive({
                        el: "annotationPublishRequests",
                        template: publishTemplate,
                        data: { resources: resources.filter(function(res){return res.publishRequest}) }
                    });
                    r.on('publish', function(_, which){ publish(which); });
                });
            }));
        }
    });
});