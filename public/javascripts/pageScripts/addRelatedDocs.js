/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/16/13
 * Time: 1:59 PM
 * To change this template use File | Settings | File Templates.
 */
$(function() {

    var viewCapR, addCapR,
        addAnnR, viewAnnR,
        langList,
        courseQuery = courseId ? "?course=" + courseId : "",
        addCapTemplate = '<table class="table table-bordered">\
            <thead><tr>\
                <th>File</th><th>Track name</th><th>Language</th><th>Kind</th>\
            </tr></thead>\
            <tbody>\
                <tr>\
                <td><input type="file" value="{{files}}" /></td>\
                <td><input type="text" value="{{label}}" /></td>\
                <td><superselect icon="icon-globe" text="Select Language" selection="{{lang}}" open="{{selectOpen}}" multiple="false" options="{{languages}}"></td>\
                <td><select value="{{kind}}">\
                    <option value="subtitles">Subtitles</option>\
                    <option value="captions">Captions</option>\
                    <option value="descriptions">Descriptions</option>\
                    <option value="chapters">Chapters</option>\
                    <option value="metadata">Metadata</option>\
                </select></td>\
                <td><button on-tap="upload">Upload</button></td>\
                </tr>\
            </tbody>\
        </table>',
        addAnnTemplate = '<table class="table table-bordered">\
            <thead><tr>\
                <th>File</th><th>Track name</th><th>Language</th>\
            </tr></thead>\
            <tbody>\
                <tr>\
                <td><input type="file" value="{{files}}" /></td>\
                <td><input type="text" value="{{label}}" /></td>\
                <td><superselect icon="icon-globe" text="Select Language" selection="{{lang}}" open="{{selectOpen}}" multiple="false" options="{{languages}}"></td>\
                <td><button on-tap="upload">Upload</button></td>\
                </tr>\
            </tbody>\
        </table>',
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


    langList = Object.keys(Ayamel.utils.p1map).map(function (p1) {
        var code = Ayamel.utils.p1map[p1];
        return {value: code, text: Ayamel.utils.getLangName(code)};
    }).sort(function(a,b){ return a.text.localeCompare(b.text); });
    langList.unshift({value:'zxx',text:'No Linguistic Content'});

    function getLanguage(resource) {
        var langs = resource.languages.iso639_3;
        return (langs && langs[0])?Ayamel.utils.getLangName(langs[0]):"English";
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

    viewCapR = new Ractive({
        el: "#captionsTable",
        template: captionsTemplate,
        data: { resources: [] }
    });
    viewCapR.on('delete', function(_, which){ deleteDoc(which); });
    viewCapR.on('publish', function(_, which){ sendPublishRequest(which); });

    addCapR = new Ractive({
        el: "#captionsUpload",
        template: addCapTemplate,
        components:{ superselect: EditorWidgets.SuperSelect },
        data: {
            label: '',
            kind: 'subtitles',
            lang: 'zxx',
            languages: langList
        }
    });
    addCapR.on('upload', function(){
        var data, file, mime,
            files = this.get('files'),
            label = this.get('label');

        if(!(files && label)){
            alert('File & Name are Required');
            return;
        }

        file = files[0];
        mime = file.type || TimedText.inferType(file.name);

        if(!mime){
            alert('Could not determine file type.');
            return;
        }

        //TODO: Validate the file
        data = new FormData();
        data.append("file", new Blob([file],{type:mime}), file.name);
        data.append("label", label);
        data.append("language", this.get('lang'));
        data.append("kind", this.get('kind'));
        data.append("contentId", content.id);
        return $.ajax({
            url: "/captionaider/save",
            data: data,
            cache: false,
            contentType: false,
            processData: false,
            type: "post",
            dataType: "text"
        }).then(function(data){
            //TODO: save a roundtrip by having this ajax call return the complete updated resource
            ResourceLibrary.load(data).then(function(resource){
                viewCapR.get('resources').push(resource);
            });
        },function(xhr, status, error){
            alert("Error occurred while saving\n"+status)
        });
    });

    viewAnnR = new Ractive({
        el: "#annotationsTable",
        template: annotationsTemplate,
        data: { resources: [] }
    });
    viewAnnR.on('delete', function(_, which){ deleteDoc(which); });
    viewAnnR.on('publish', function(_, which){ sendPublishRequest(which); });

    addAnnR = new Ractive({
        el: "#annotationsUpload",
        template: addAnnTemplate,
        components:{ superselect: EditorWidgets.SuperSelect },
        data: {
            label: '',
            lang: 'zxx',
            languages: langList
        }
    });
    addAnnR.on('upload', function(){
        var reader, file, data,
            files = this.get('files'),
            label = this.get('label');
        if(!(files && label)){
            alert('File & Name are Required');
            return;
        }

        data = new FormData();
        data.append("file", new Blob([files[0]],{type:'application/json'}), label);
        data.append("title", label);
        data.append("language", addAnnR.get('lang'));
        data.append("contentId", content.id);

        $.ajax("/annotations/save", {
            type: "post",
            data: data,
            cache: false,
            contentType: false,
            processData: false
        }).then(function () {
            alert("Annotations saved.");
        },function(data) {
            console.log(data);
            alert("There was a problem while saving the annotations.");
        });
    });

    ResourceLibrary.load(content.resourceId, function(resource){
        var captionTrackIds = resource.relations
                .filter(function(r){return r.type==="transcript_of";})
                .map(function(r){return r.subjectId;}).join(','),
            annotationIds = resource.relations
                .filter(function(r){return r.type==="references";})
                .map(function(r){return r.subjectId;}).join(',');

        if(captionTrackIds.length){
            $.ajax("/ajax/permissionChecker", {
                type: "post",
                data: {
                    contentId: content.id,
                    permission: "edit",
                    documentType: "captionTrack",
                    ids: captionTrackIds
                }
            }).then(function(data){
                getResources(data, function(rs){ viewCapR.set('resources', rs); })
            });
        }

        if(annotationIds.length){
            $.ajax("/ajax/permissionChecker", {
                type: "post",
                data: {
                    contentId: content.id,
                    permission: "edit",
                    documentType: "annotations",
                    ids: annotationIds
                }
            }).then(function(data) {
                getResources(data, function(rs){ viewAnnR.set('resources', rs); });
            });
        }

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
                        el: "#trackPublishRequests",
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
                        el: "#annotationPublishRequests",
                        template: publishTemplate,
                        data: { resources: resources.filter(function(res){return res.publishRequest}) }
                    });
                    r.on('publish', function(_, which){ publish(which); });
                });
            }));
        }
    });
});