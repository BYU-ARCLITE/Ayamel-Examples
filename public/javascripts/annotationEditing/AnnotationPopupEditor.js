/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/10/13
 * Time: 2:41 PM
 * To change this template use File | Settings | File Templates.
 */
var AnnotationPopupEditor = (function(){
    "use strict";
    function AnnotationPopupEditor(callback) {
        var annotation = null,
            content = null,
            listeners = {},
            currAnn, // variable to keep track of what word we are working on, Otherwise we wouldn't know which word to annotate
            ractive, editor;

        function emit(event, data) {
            if (listeners[event]) {
                data = data || {};
                listeners[event].forEach(function(callback) {
                    callback(data);
                });
            }
        }

        ractive = new Ractive({
            el: document.body,
            append: true,
            template: '<div id="popupBackground" style="width:100%;height:100%;display:{{hide?"none":"block"}}">\
                <div id="popupEditor">\
                    <div id="popupContent">\
                        {{#showWord}}\
                        <div class="form-inline">\
                            <label for="word">Word(s): </label>\
                            <input type="text" id="word" placeholder="Word" name="word" value="{{word}}">\
                        </div>\
                        {{/showWord}}\
                        <div class="form-inline">\
                            <label for="annotationType">Type: </label>\
                            <select id="annotationType" value="{{type}}">\
                                <option value="text">Text</option>\
                                <option value="image">Image</option>\
                                <option value="content">Content</option>\
                            </select>\
                        </div>\
                        <div id="textContent" style="display:{{(type==="text")?"block":"none"}}">\
                            <label for="textEditor">Text:</label>\
                            <textarea id="textEditor" data-id="editor"></textarea>\
                        </div>\
                        <div id="imageContent" style="display:{{(type==="image")?"block":"none"}}" >\
                            <div class="form-inline">\
                                <label for="url">URL: </label>\
                                <input type="text" id="url" placeholder="http://..." value={{imageImg}}>\
                            </div>\
                            <div class="popupImage" style="background-image:url(\'{{imageImg}}\');"></div>\
                        </div>\
                        <div id="contentContent" style="display:{{(type==="content")?"block":"none"}}">\
                            <div class="pad-bottom-med">Content:</div>\
                            <h4>{{title}}</h4>\
                            <div class="popupImage" style="background-image:url(\'{{contentImg}}\');"></div>\
                            <button class="btn btn-yellow pad-left-med" on-tap="browse"><i class="icon-folder-open"></i> Select Content</button>\
                        </div>\
                    </div>\
                    <div>\
                        <div class="pull-left">\
                            <button class="btn btn-magenta" on-tap="delete" tmpl-attach="delete"><i class="icon-trash"></i></button>\
                        </div>\
                        <div class="pull-right">\
                            <button class="btn" on-tap="cancel"><i class="icon-ban-circle"></i></button>\
                            <button class="btn btn-blue" on-tap="save"><i class="icon-save"></i></button>\
                        </div>\
                    </div>\
                </div>\
            </div>',
            data: {
                type: "text",
                hide: true,
                showWord: true
            }
        });
        $(document).keydown(function(e) {
            // ESCAPE key pressed
            if (e.keyCode == 27) {
                ractive.set('hide', true);
            }
        });
        editor = ractive.find('[data-id="editor"]');
        ractive.on('cancel',function() {
            ractive.set('hide', true);
        });
        ractive.on('save',function() {
            ractive.set('hide', true);
            emit("update");
        });
        ractive.on('delete',function() {
            ractive.set('hide', true);
            emit("delete");
        });
        ractive.on('browse',function(){
            PopupBrowser.selectContent(function(newContent){
                ContentCache.cache[newContent.id] = newContent;
                content = newContent;
                ractive.set({
                    contentImg: ContentThumbnails.resolve(content),
                    title: content.name
                });
            });
        });

        // Setup the WYSIWYG editor
        $(editor).wysihtml5({
            "stylesheets": ["/assets/wysihtml5/lib/css/wysiwyg-color.css"], // CSS stylesheets to load
            "color": true, // enable text color selection
            "size": 'small', // buttons size
            "html": true // enable button to edit HTML
        });

        /*
         * Update functions
         */

        function updateAnnotation() {
            currAnn = ractive.get('word');
            annotation[currAnn] = {
                "global" : {
                    "data" : {
                        "type" : "text",
                        "value" : null
                    }
                }
            };
            annotation[currAnn]["global"]["data"]["type"] = ractive.get('type');


            // Check the data type
            switch(annotation[currAnn]["global"]["data"]["type"]){
            case "text": // Update from the text editor
                annotation[currAnn].global.data.value = $('#textEditor').data("wysihtml5").editor.getValue();
                break;
            case "image": // Update from the URL text input
                annotation[currAnn].global.data.value = ractive.get('imageImg');
                break;
            case "content": // Update from the selected content
                annotation[currAnn].global.data.value = !!content ? content[0].id : 0;
                break;
            }
        }

        function updateForm() {
            
            // Load the annotation data into the form
            ractive.set({
                showWord: true,
                word: currAnn
            });
            
            content = null;

            // Check the data type
            switch(annotation[currAnn].global.data.type){
            case "text": // Update the text editor
                ractive.set({
                    type: "text",
                    imageImg: "",
                    contentImg: ""
                });
                $('#textEditor').data("wysihtml5").editor.setValue(annotation[currAnn].global.data.value);
                $('#textEditor').data("wysihtml5").editor.focus();
                break;
            case "image": // Update the URL text input
                //editor.setValue("");
                ractive.set({
                    type: "image",
                    imageImg: annotation[currAnn].global.data.value,
                    contentImg: ""
                });
                break;
            case "content": // Load the content
                //editor.setValue("");
                ractive.set({
                    type: "content",
                    imageImg: annotation[currAnn].global.data.value,
                    contentImg: ""
                });
                ContentCache.load(annotation[currAnn].global.data.value, function(newContent) {
                    content = newContent;
                    ractive.set({
                        contentImg: ContentThumbnails.resolve(content),
                        title: content.name
                    });
                });
                break;
            default:
                throw new Error("Unrecognized annotation data.");
            }
        }

        Object.defineProperties(this, {
            show: {
                value: function(){ ractive.set('hide', false); }
            },
            annotation: {
                get: function() {
                    updateAnnotation();
                    return {"manifest" : annotation, "currAnn" : currAnn};
                },
                set: function(value) {
                    annotation = value["manifest"];
                    currAnn = value["word"];
                    updateForm();
                }
            },
            on: {
                value: function(event, callback) {
                    if (listeners[event] instanceof Array) {
                        listeners[event].push(callback);
                    } else {
                        listeners[event] = [callback];
                    }
                }
            }
        });

        if(typeof callback === 'function'){ callback(this); }
    }

    return AnnotationPopupEditor;
})();