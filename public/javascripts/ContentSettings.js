/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 6/21/13
 * Time: 10:12 AM
 * To change this template use File | Settings | File Templates.
 */
var ContentSettings = (function(){

    var settingsTemplate = '<form class="form-horizontal">\
        {{#controls:c}}\
        <div class="control-group">\
            {{#(controlsSettings[c].include(context, content))}}\
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
                {{#(type == \'superselect\')}}\
                    <div class="control-group">\
                        {{#label}}<span class="control-label">{{label}}</span>{{/label}}\
                        <SuperSelect icon="icon-globe" text="Select Language" value="{{setting}}" btnpos="left" multiple="true" options="{{items}}" modal="configurationModal">\
                    </div>\
                {{/type}}\
            {{/include}}\
            {{^(controlsSettings[c].include(context, content))}}\
                {{#(type == \'radio\')}}\
                {{#label}}<span class="control-label">{{label}}</span>{{/label}}\
                {{#none}}<div class="controls">\{{none}}</div>{{/none}}\
                {{/type}}\
                {{#(type != \'radio\')}}\
                {{#label}}<span class="control-label">{{label}}</span>{{/label}}\
                {{#none}}<div class="controls">\<i>{{none}}</i></div>{{/none}}\
                {{/type}}\
            {{/include}}\
        </div>\
        {{/controls}}\
    </form>';

    var predefined = {
        saveButton: {
            type: "button",
            label: "Save",
            name: "save",
            //none: "Save option not available",
            classes: "btn-blue",
            include: function(context, content){ return true; },
            setting: function(context, content){},
            items: function(){}
        },
        aspectRatio: {
            type: "radio",
            label: "Player Aspect Ratio:",
            name: "aspectRatio",
            include: function(context, content){ return true; },
            setting: function(context, content){
                return content.settings.aspectRatio;
            },
            items: function(){
                return Object.keys(Ayamel.aspectRatios).map(function(name){
                    return {text: name, value: Ayamel.aspectRatios[name]};
                });
            }
        },
        showCaptions: {
            type: "checkbox",
            label: "Show Captions:",
            name: "showCaptions",
            none: "No captions to show",
            include: function(context, content){
                return !!content.enableableCaptionTracks.length;
            },
            setting: function(context, content){
                return content.settings.showCaptions === "true";
            },
            items: function(){}
        },
        showAnnotations: {
            type: "checkbox",
            label: "Show text annotations:",
            name: "showAnnotations",
            none: "No annotations to show",
            include: function(context, content){
                return !!content.enableableAnnotationDocuments.length;
            },
            setting: function(context, content){
                return content.settings.showAnnotations === "true";
            },
            items: function(){}
        },
        allowDefinitions: {
            type: "checkbox",
            label: "Allow automatic definitions:",
            name: "allowDefinitions",
            none: "No tracks available",
            include: function(context, content){
                return !!content.enableableCaptionTracks.length;
            },
            setting: function(context, content){
                return content.settings.allowDefinitions === "true";
            },
            items: function(){}
        },
        targetLanguages: {
            type: "superselect",
            label: "Definition Languages:",
            name: "targetLanguages",
            include: function(context, content){
                return !!content.enableableCaptionTracks.length;
            },
            setting: function(context, content){
				return (content.settings.targetLanguages || "")
                            .split(",").filter(function(s){ return !!s; });
			},
            items: function(){
                langList = Object.keys(Ayamel.utils.p1map).map(function (p1) {
                    var code = Ayamel.utils.p1map[p1],
                    engname = Ayamel.utils.getLangName(code,"eng"),
                    localname = Ayamel.utils.getLangName(code,code);
                    return {value: code, text: engname, desc: localname!==engname?localname:void 0};
                });

                langList.push({ value: "apc", text: "North Levantine Arabic"});
                langList.push({ value: "arz", text: "Egyptian Arabic"});
                return langList.sort(function(a,b){ return a.text.localeCompare(b.text); });
			}
        },
        showTranscripts: {
            type: "checkbox",
            label: "Show Transcripts:",
            name: "showTranscripts",
            none: "No transcripts to show",
            include: function(context, content){
                return !!content.enableableCaptionTracks.length;
            },
            setting: function(context, content){
                return content.settings.showTranscripts === "true";
            },
            items: function(){}
        },
        showWordList: {
            type: "checkbox",
            label: "Show Word List:",
            name: "showWordList",
            none: "No wordlists to show",
            include: function(context, content){
                // logical because you wont be able to add to a wordlist unless you have captions
                // however, may need to change if we have different criteria
                return !!content.enableableCaptionTracks.length;
            },
            setting: function(context, content){
                return content.settings.showWordList === "true";
            },
            items: function(){}
        },
        enabledCaptionTracks: {
            type: "multicheck",
            label: "Enabled Caption Tracks:",
            name: "captionTracks",
            none: "No captions to enable",
            include: function(context, content){
                return !!content.enableableCaptionTracks.length;
            },
            setting: function(context, content){
                return (content.settings.captionTrack || "")
                    .split(",").filter(function(s){return !!s;});
            },
            items: function(context, content){
                // Get the document name and language from the ID
                return content.enableableCaptionTracks.map(function(resource){
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
            label: "Enabled Annotations:",
            name: "annotationDocs",
            none: "No annotations to enable",
            include: function(context, content){
                return !!content.enableableAnnotationDocuments.length;
            },
            setting: function(context, content){
                return (content.settings.annotationDocument || "")
                    .split(",").filter(function(s){return !!s;});
            },
            items: function(context, content){
                // Get the document name and language from the ID
                return content.enableableAnnotationDocuments.map(function(resource){
                    var langCode = resource.languages.iso639_3[0],
                        language = Ayamel.utils.getLangName(langCode);
                    return {
                        text: resource.title + " (" + language + ")",
                        value: resource.id
                    };
                });
            }
        },
        shareability: {
            type: "radio",
            label: "Shareability:",
            name: "shareability",
            include: function(context, content){ return true; },
            setting: function(context, content){
                return content.shareability || 1;
            },
            items: function(context, content){
                return [{
                    text: "Not Shareable",
                    value: 1
                },{
                    text: "Shareable by owner only",
                    value: 2
                },{
                    text: "Shareable by anybody",
                    value: 3
                }];
            }
        },
        visibility: {
            type: "radio",
            label: "Visibility:",
            name: "visibility",
            include: function(context, content){ return true; },
            setting: function(context, content){
                return content.visibility || 1;
            },
            items: function(context, content){
                return [{
                    text: "Private",
                    value: 1
                },{
                    text: "Tightly Restricted (Me and courses I add this to can see this)",
                    value: 2
                },{
                    text: "Loosely Restricted (Me, teachers, and courses we add this to can see this)",
                    value: 3
                },{
                    text: "Public (Everybody can see this)",
                    value: 4
                }];
            }
        }
    };

    var settings = {
        video: [
            predefined.aspectRatio,
            predefined.allowDefinitions,
            predefined.targetLanguages,
            predefined.showTranscripts,
            predefined.showWordList,
            predefined.showCaptions,
            predefined.enabledCaptionTracks,
            predefined.showAnnotations,
            predefined.enabledAnnotations,
            predefined.visibility,
            predefined.shareability,
            predefined.saveButton
        ],
        audio: [
            predefined.aspectRatio,
            predefined.showCaptions,
            predefined.allowDefinitions,
            predefined.targetLanguages,
            predefined.showAnnotations,
            predefined.showTranscripts,
            predefined.enabledCaptionTracks,
            predefined.enabledAnnotations,
            predefined.visibility,
            predefined.shareability,
            predefined.saveButton
        ],
        image: [
            predefined.aspectRatio,
            predefined.showCaptions,
            predefined.allowDefinitions,
            predefined.targetLanguages,
            predefined.showAnnotations,
            predefined.showTranscripts,
            predefined.enabledCaptionTracks,
            predefined.enabledAnnotations,
            predefined.visibility,
            predefined.shareability,
            predefined.saveButton
        ],
        text: [
            predefined.aspectRatio,
            predefined.allowDefinitions,
            predefined.targetLanguages,
            predefined.showAnnotations,
            predefined.enabledAnnotations,
            predefined.visibility,
            predefined.shareability,
            predefined.saveButton
        ]
    };

    function getResources(ids){
        return Promise.all(ids.map(function(id){
            return ResourceLibrary.load(id);
        }));
    }

    function getCaptionTracks(resource){
        var captionTrackIds = resource.relations
            .filter(function(r){return r.type==="transcript_of";})
            .map(function(r){return r.subjectId;});
        return getResources(captionTrackIds);
    }
    function getAnnotationDocs(resource){
        var annotationIds = resource.relations
            .filter(function(r){return r.type==="references";})
            .map(function(r){return r.subjectId;});
        return getResources(annotationIds);
    }

    function createControls(config, context, content){
        var control = {
            type: config.type,
            name: config.name,
            label: config.label,
            none: config.none,
            classes: config.classes,
            setting: config.setting(context, content),
            items: config.items(context, content)
        };
        return control;
    }

    /* args: courseId, owner, userId, content, resource, holder, action */
    function ContentSettings(args){

        // Determine what content type we are dealing with
        var context = {
            courseId: args.courseId || 0,
            owner: args.owner || false,
            userId: args.userId || 0
        };

        Promise.all([
            getCaptionTracks(args.resource),
            getAnnotationDocs(args.resource)
        ]).then(function(data){
            var targetLanguages, ractive, controls, controlsSettings;

            args.content.enableableCaptionTracks = data[0];
            args.content.enableableAnnotationDocuments = data[1];

            // Create the form
            controlsSettings = settings[args.content.contentType];
            controls = controlsSettings.map(function(config){
                return createControls(config, context, args.content);
            });

            ractive = new Ractive({
                el: args.holder,
                template: settingsTemplate,
                data: {controls: controls, content: args.content, context: context, controlsSettings: controlsSettings}
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
                        fd.append(name, ""+value);
                    });
                });

                xhr.addEventListener('load', function(event){
                    document.location.reload(true);
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