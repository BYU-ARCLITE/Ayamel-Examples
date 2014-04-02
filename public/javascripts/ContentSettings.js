/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 6/21/13
 * Time: 10:12 AM
 * To change this template use File | Settings | File Templates.
 */
var ContentSettings = (function() {

    var settingsTemplate = '<form class="form-horizontal">\
        {{#controls}}\
        <div class="control-group">\
            {{#(type == \'radio\')}}\
            {{#label}}<span class="control-label">{{label}}</span>{{/label}}\
            <div class="controls">\
                {{#items}}\
                <label>\
                    <input type="radio" name="{{setting}}" value="{{.value}}">{{.text}}\
                </label>\
                {{/items}}\
            </div>\
            {{/type}}\
            {{#(type == \'checkbox\')}}\
            {{#label}}<span class="control-label">{{label}}</span>{{/label}}\
            <div class="controls">\
                <input type="checkbox" checked="{{setting}}">\
            </div>\
            {{/type}}\
            {{#(type == \'multicheck\')}}\
            {{#label}}<span class="control-label">{{label}}</span>{{/label}}\
            <div class="controls">\
                {{#items}}\
                <label>\
                    <input type="checkbox" name="{{setting}}" value="{{.value}}">{{.text}}\
                </label>\
                {{/items}}\
            </div>\
            {{/type}}\
            {{#(type == \'button\')}}\
            <div class="controls">\
                <button class="btn {{classes}}" on-click="click:{{name}}">{{label}}</button>\
            </div>\
            {{/type}}\
        </div>\
        {{/controls}}\
    </form>';

    function getPermissionLevel(context) {
        if(context.owner){ return "global"; }
        if(context.courseId){ return "course"; }
        return "personal";
    }

    var predefined = {
        saveButton: {
            type: "button",
            label: "Save",
            name: "save",
            classes: "btn-blue",
            include: function(context, content) { return true; },
            setting: function(context, content) {},
            items: function(){}
        },
        playbackLevel: {
            type: "radio",
            label: "Playback level",
            name: "level",
            include: function(context, content) { return true; },
            setting: function(context, content) {
                return content.settings.level || 1;
            },
            items: function(context, content) {
                var all = [
                    {value: 1, text: "1 - Video playback"},
                    {value: 2, text: "2 - Video playback with subtitles"},
                    {value: 3, text: "3 - Video, subtitles, and interaction"},
                    {value: 4, text: "4 - Video, subtitles, interactions, and annotations"},
                    {value: 5, text: "5 - Video, subtitles, interactions, annotations, and auto-generated activities"}
                ];
                if (context.courseId) {
                    // Get the course level
                    return all.splice(0, (+content.settings.level) || 1);
                }
                return all;
            }
        },
        showTranscriptions: {
            type: "checkbox",
            label: "Show transcripts?",
            name: "includeTranscriptions",
            include: function(context, content){
                return !!content.enableableCaptionTracks.length;
            },
            setting: function(context, content) {
                return content.settings.includeTranscriptions === "true";
            },
            items: function(){}
        },
        enabledCaptionTracks: {
            type: "multicheck",
            label: "Enabled Caption Tracks",
            name: "captionTracks",
            include: function(context, content){
                return !!content.enableableCaptionTracks.length;
            },
            setting: function(context, content) {
                return (content.settings.enabledCaptionTracks || "")
                    .split(",").filter(function(s){return !!s;});
            },
            items: function(context, content) {
                // Get the document name and language from the ID
                return content.enableableCaptionTracks.map(function (resource) {
                    var langCode = resource.languages.iso639_3[0],
                        language = Ayamel.utils.getLangName(langCode);
                    return {
                        text: resource.title + " (" + language + ")",
                        value: resource.id
                    };
                });
            }
        },
        enabledAnnotations: {
            type: "multicheck",
            label: "Enabled Annotations",
            name: "annotationDocs",
            include: function(context, content){
                return !!content.enableableAnnotationDocuments.length;
            },
            setting: function(context, content) {
                return (content.settings.enabledAnnotationDocuments || "")
                    .split(",").filter(function(s){return !!s;});
            },
            items: function(context, content) {
                // Get the document name and language from the ID
                return content.enableableAnnotationDocuments.map(function (resource) {
                    var langCode = resource.languages.iso639_3[0],
                        language = Ayamel.utils.getLangName(langCode);
                    return {
                        text: resource.title + " (" + language + ")",
                        value: resource.id
                    };
                });
            }
        }
    };

    var settings = {
        personal: {
            video: [
                predefined.enabledCaptionTracks,
                predefined.enabledAnnotations,
                predefined.saveButton
            ],
            audio: [
                predefined.enabledCaptionTracks,
                predefined.enabledAnnotations
            ],
            image: [
                predefined.enabledAnnotations,
                predefined.saveButton
            ],
            text: [
                predefined.enabledAnnotations,
                predefined.saveButton
            ]
        },
        course: {
            video: [
                predefined.playbackLevel,
                predefined.showTranscriptions,
                predefined.enabledCaptionTracks,
                predefined.enabledAnnotations,
                predefined.saveButton
            ],
            audio: [
                predefined.playbackLevel,
                predefined.showTranscriptions,
                predefined.enabledCaptionTracks,
                predefined.enabledAnnotations,
                predefined.saveButton
            ],
            image: [
                predefined.enabledAnnotations,
                predefined.saveButton
            ],
            text: [
                predefined.enabledAnnotations,
                predefined.saveButton
            ]
        },
        global: {
            video: [
                predefined.playbackLevel,
                predefined.showTranscriptions,
                predefined.enabledCaptionTracks,
                predefined.enabledAnnotations,
                predefined.saveButton
            ],
            audio: [
                predefined.playbackLevel,
                predefined.showTranscriptions,
                predefined.enabledCaptionTracks,
                predefined.enabledAnnotations,
                predefined.saveButton
            ],
            image: [
                predefined.enabledAnnotations,
                predefined.saveButton
            ],
            text: [
                predefined.enabledAnnotations,
                predefined.saveButton
            ]
        }
    };

    function getPermittedResources(data,cb){
        if(data.ids.length){
            return $.ajax("/ajax/permissionChecker", {
                type: "post",
                data: data
            }).then(function(data) {
                // Now turn those IDs into resources
                var rps = data.map(function(id){
                    return ResourceLibrary.load(id);
                });
                return Promise.all(rps);
            });
        }
        return Promise.resolve([]);
    }

    function getCaptionTracks(args, context) {
        var captionTrackIds = args.resource.relations
            .filter(function(r){return r.type==="transcript_of";})
            .map(function(r){return r.subjectId;}).join(',');
        // Get the list of enableable caption tracks
        return getPermittedResources({
            contentId: args.content.id,
            courseId: context.courseId,
            permission: "enable",
            documentType: "captionTrack",
            ids: captionTrackIds
        });
    }
    function getAnnotationDocs(args, context) {
        var annotationIds = args.resource.relations
            .filter(function(r){return r.type==="references";})
            .map(function(r){return r.subjectId;}).join(',');
        // Get the list of enableable annotation sets
        return getPermittedResources({
            contentId: args.content.id,
            courseId: context.courseId,
            permission: "enable",
            documentType: "annotations",
            ids: annotationIds
        });
    }

    function createControls(config, context, content) {
        var control = {
            type: config.type,
            name: config.name,
            label: config.label,
            classes: config.classes,
            setting: config.setting(context, content),
            items: config.items(context, content)
        };
        return control;
    }

    function ContentSettings(args) {

        // Determine what content type and at what permission level we are dealing with
        var context = {
            courseId: args.courseId || 0,
            owner: args.owner || false,
            userId: args.userId || 0
        };
        var permissionLevel = getPermissionLevel(context);
        var captionTracks = getCaptionTracks(args, context);
        var annotationDocs = getAnnotationDocs(args, context);
        Promise.all([captionTracks,annotationDocs])
        .then(function(data){
            var ractive, controls;

            args.content.enableableCaptionTracks = data[0];
            args.content.enableableAnnotationDocuments = data[1];

            // Create the form
            controls = settings[permissionLevel][args.content.contentType];
            controls = controls.filter(function(config){ return config.include(context, args.content); });
            controls = controls.map(function(config) {
                return createControls(config, context, args.content);
            });

            ractive = new Ractive({
                el: args.$holder[0],
                template: settingsTemplate,
                data: {controls: controls},
            });
            ractive.on('click',function(evt, which){
                evt.original.preventDefault();
                if(which !== 'save'){ return; }
                //submit form data via ajax
                var xhr = new XMLHttpRequest(),
                    fd = new FormData();

                fd.append('contentType', content.contentType);
                ractive.get('controls').forEach(function(control, index){
                    if(control.type === 'button'){ return; }
                    var setting = ractive.get('controls['+index+'].setting'),
                        name = control.name;
                    (setting instanceof Array?setting:[setting]).forEach(function(value){
                        fd.append(name, value);
                    });
                });

                xhr.addEventListener('load', function(event){
                    //close the dialog box
                });

                xhr.addEventListener('error', function(event){
                    alert('Something broke.');
                });

                xhr.open('POST', args.action);
                xhr.send(fd);
            });
        });
    }
    return ContentSettings;
})();