/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/19/13
 * Time: 12:24 PM
 * To change this template use File | Settings | File Templates.
 */

var ContentRenderer = (function(){
    "use strict";

    function showTranscript(content){
        return content.settings.showTranscripts === "true";
    }

    function showCaptions(content){
        return content.settings.showCaptions === "true";
    }

    function showAnnotations(content){
        return content.settings.showAnnotations === "true";
    }

    function allowDefinitions(content){
        return content.settings.allowDefinitions === "true";
    }

    function showWordList(content){
        return content.settings.showWordList === "true";
    }

    function getDefaultLanguage(languages) {
        for(var i = 0; i < languages.length; i++) {
            var langObj = languages[i];
            if(langObj.value === "eng") {
                return langObj;
            }
        }
        return languages[0];
    }

    function setupTranslatorPane(tab, player, content, resourceMap){
        var pane, targetLanguages,
            codes = (content.settings.targetLanguages || "")
                .split(",").filter(function(s){ return !!s; }),
            selectHolder = document.createElement('div'),
            translationsHolder = document.createElement('div');

        if(!codes.length){ // Fallback procedure when no languages have been selected
            codes = Object.keys(Ayamel.utils.p1map)
                    .map(function(p1){ return Ayamel.utils.p1map[p1]; });
        }

        targetLanguages = codes.map(function(code){
            return {value: code, text: Ayamel.utils.getLangName(code)};
        }).sort(function(a,b){ return a.text.localeCompare(b.text); });

        translationsHolder.className = "definitionsContent";
        (new EditorWidgets.SuperSelect({
            el: selectHolder,
            data:{
                id: 'transLang',
                selection: [
                    codes.indexOf("eng") !== -1 ?
                        "eng" : codes[0]
                ],
                icon: 'icon-globe',
                button: 'left',
                text: 'Select Language',
                multiple: false,
                options: targetLanguages
            }
        })).observe('selection', function(newValue){
            player.targetLang = newValue[0];
        });

        // Player Event Listeners

        // Translation started
        player.addEventListener("translate", function(event){
            var detail = event.detail,
                data = detail.data,
                activityType;
            switch(data.sourceType){
            case "caption": activityType = "captionTranslation";
                break;
            case "transcript": activityType = "transcriptionTranslation";
                break;
            default: return;
            }
            xApi.predefined[activityType](resourceMap.get(data.cue.track).id, data.cue.id, detail.text);
            player.pause();
        });

        // Translation succeeded
        player.addEventListener("translation", function(event){

           // console.log(event.toString() )
        var translationSize, detail = event.detail,
                 translations = detail.translations,
                 wordList = !document.body.classList.contains("share")? // Only allow saving words if the user is logged in (not sharing)
                     '<div class="addToWordList"><button class="btn btn-small"><i class="icon-paste"></i> Add to Word List</button></div>':"",
                html = document.createElement('div');
                html.innerHTML = YLex.renderResult(event.detail) + wordList;
                translationsHolder.appendChild(html);
                tab.select();
 /*                html = Ayamel.utils.parseHTML('<div class="translationResult">\
                     <div class="sourceText">' + detail.text + '</div>\
                     <div class="translations">' + translations.join(",<br/>") + '</div>\
                     <div class="engine">' + engineToHTML(detail) + '</div>' + wordList +
                 '</div>');
 */
//console.log( wordList.toString() );

             if (wordList != "" ) {
                 html.querySelector("button").addEventListener('click', function(){
                     var addWord = this.parentNode;
                     var Data = new FormData();
                    Data.append("srcLang", detail.src);
                    Data.append("destLang", detail.dest);
                    Data.append("word", detail.text);
                     $.ajax("/words", {
                         type: "post",
                         cache: false,
                         contentType: false,
                         processData: false,

/*
var formData = new FormData();
                formData.append("title", fileName);
                formData.append("filename", fileName);
                formData.append("language", language);
*/

                         data: Data,
                         success: function(){
                             addWord.innerHTML = "<span class='color-blue'>Added to word list.</span>";
                         },
                         error: function(){
                             alert("Error adding to word list");
                             addWord.parentNode.removeChild(addWord);
                         }
                     });
                 });
             }
           
            //TODO: Add Word List functionality back in. Somehow.
//            var translationSize,
          

            //keep the top of the new translation visible.
            if (html.offsetHeight > translationsHolder.offsetHeight) {
                translationSize = html.offsetHeight + html.querySelector('.sourceText').offsetHeight + 15;
                translationsHolder.scrollTop = translationsHolder.scrollHeight - translationSize;
            }else{
                translationsHolder.scrollTop = translationsHolder.scrollHeight;
            }
        });

        // Handle errors
        player.addEventListener("translationError", function(event){
            alert("We couldn't translate \"" + event.detail.text + "\" for you.");
        });

        pane = document.createElement('div');
        pane.className = "definitionsContainer";
        pane.appendChild(selectHolder);
        pane.appendChild(document.createElement('hr'));
        pane.appendChild(translationsHolder);
        return pane;
    }

    function setupTranscriptPane(tab, player, content, trackResources, trackMimes){
        var DOM = document.createDocumentFragment(),
            transcriptPlayer = new TranscriptPlayer({
                //requires the actual TextTrack objects; should be fixed up to take resource IDs, I think
                captionTracks: [],
                holder: DOM,
                sync: true,
                annotator: null
            });

        // Cue clicking
        transcriptPlayer.addEventListener("cueclick", function(event){
            var trackID = trackResources.get(event.detail.track).id;

            player.currentTime = event.detail.cue.startTime;
            xApi.predefined.transcriptCueClick(trackID, event.detail.cue.id);
        });

        player.addEventListener("timeupdate", function(){
            transcriptPlayer.currentTime = player.currentTime;
        });

        player.addEventListener('addtexttrack', function(event){
            var track = event.detail.track;
            transcriptPlayer.addTrack(track);
            trackResources.set(track, event.detail.resource);
            trackMimes.set(track, event.detail.mime);
        }, false);

        return DOM;
    }

    function setupAnnotatorPane(tab, player){
        var display = document.createElement('div'),
            data = null,
            newplayer = null;

        display.style.overflow = "scroll";
        display.style.height = "100%";
        player.addEventListener("annotation", function(event){
            player.pause();

            if(data !== event.detail.data){
                data = event.detail.data;
                if(newplayer){
                    newplayer.destroy();
                    newplayer = null;
                }

                switch(event.detail.data.type){
                case "text":
                    display.innerHTML = event.detail.data.value;
                    [].forEach.call(display.querySelectorAll('a'),function(link){
                        link.target = "_blank";
                    });
                    break;
                case "image":
                    display.innerHTML = '<img src="' + event.detail.data.value + '">';
                    break;
                case "content":
                    ContentCache.load(event.detail.data.value, function(content){
                        display.innerHTML = "";
                        // Don't allow annotations, transcriptions, or certain controls
                        content.settings.showTranscripts = "false";
                        content.settings.showAnnotations = "false";
                        content.settings.allowDefinitions = "false";

                        ContentLoader.render({
                            content: content,
                            holder: display,
                            annotate: false,
                            screenAdaption: {
                                fit: false
                            },
                            aspectRatio: Ayamel.aspectRatios.hdVideo,
                            components: {
                                left: ["play"],
                                right: ["captions", "timeCode"]
                            },
                            callback: function(args){
                                newplayer = args.mainPlayer;
                            }
                        });
                    });
                    break;
                }
            }
            // Find the annotation doc
            var annotationDocId = "Unknown";
            xApi.predefined.viewTextAnnotation(annotationDocId, event.detail.text);

            tab.select();
        });

        return display;
    }

    function setupWordListPane(tab, player){
        var display = document.createElement('div'),
        request = new XMLHttpRequest();
        request.responseType = "json";
        request.open("GET", "/wordList", true);
        request.send();
        request.addEventListener("load", function(e){
            if(this.status !== 200){
                console.log("Error loading word list");
            } else {
                request.response.wordList.forEach(function(myWord){
                    var element = document.createElement('p');
                    // element.textContent = JSON.stringify(myWord.word);
                    element.textContent = myWord.word;
                    display.appendChild(element);
                })
            }
        })

        return display;
    }

    /* args: components, transcripts, content, screenAdaption, holder, resource,
        startTime, endTime, renderCue, annotator, translate */
    function setupMainPlayer(args){
        var player,
            content = args.content,
            trackResources = new Map(),
            trackMimes = new Map(),
            transcriptPlayer = null,
            components = args.components || {
                left: ["play", "lastCaption", "volume", "captions", "annotations"],
                right: ["rate", "fullScreen", "timeCode"]
            };

        if(!showCaptions(args.content)){
            ["left", "right"].forEach(function(side){
                ["lastCaption", "captions", "annotations"].forEach(function(control){
                    var index = components[side].indexOf(control);
                    if(~index){ components[side].splice(index, 1); }
                });
            });
        }else if(!showAnnotations(args.content)){
            ["left", "right"].forEach(function(side){
                var index = components[side].indexOf("annotations");
                if(~index){ components[side].splice(index, 1); }
            });
        }

        // Set the priority of players
        Ayamel.prioritizedPlugins.video = ["html5", "flash", "brightcove", "youtube", "vimeo", "ooyala"];
        Ayamel.prioritizedPlugins.audio = ["html5"];

        // padding to account for the control bar
        //TODO: Dynamically check the actual control bar height
        args.holder.style.paddingBottom = "61px";

        // Spacebar to play/pause video
        window.addEventListener("keydown", function(e){
            if(e.keyCode == 32 && document.querySelectorAll('input:focus, textarea:focus').length === 0){
                player[player.paused?'play':'pause']();
                e.preventDefault();
            }
        });

        window.addEventListener(Ayamel.utils.FullScreen.fullScreenEvent, function(event){
            if (Ayamel.utils.FullScreen.isFullScreen){
                // Need to remove the player's css so that the fullscreen can resize properly
                player.element.style.removeProperty("width");
                player.element.style.removeProperty("height");
            } else {
                // call a resize event so that css can be put back
                window.dispatchEvent(new Event('resize',{bubbles:true,cancelable:true}));
            }
        }, false);

        window.addEventListener('resize', function(event){
            if(!args.screenAdaption || !args.screenAdaption.fit){ return; }
            player.maxHeight = document.documentElement.clientHeight;
        }, false);

        var tabs = [];
        if(allowDefinitions(content)){
            tabs.push({
                title: "Definitions",
                content: function(tab, player){
                    return setupTranslatorPane(tab, player, content, trackResources);
                }
            });
        }

        if(args.transcripts.length && showTranscript(content)){
            tabs.push({
                title: "Transcripts",
                content: function(tab, player){
                    return setupTranscriptPane(tab, player, content, trackResources, trackMimes);
                }
            });
        }

        if(args.annotations.length){
            tabs.push({
                title: "Annotations",
                content: setupAnnotatorPane
            });
        }

        if(showWordList(content)){
            tabs.push({
                title: "Word List",
                content: setupWordListPane
            });
        }

        player = new Ayamel.classes.AyamelPlayer({
            components: components,
            holder: args.holder,
            resource: args.resource,
            captions: {
                renderCue: args.renderCue,
                whitelist: args.transcripts
            },
            annotations: {
                classList: ['annotation'],
                whitelist: args.annotations
            },
            translator: args.translate?{
                endpoint: Ayamel.classes.Translator.endpoint,
                key: Ayamel.classes.Translator.key,
                targetLang: "eng"
            }:null,
            startTime: args.startTime,
            endTime: args.endTime,
            translate: args.translate,
            aspectRatio: parseFloat(args.content.settings.aspectRatio) || Ayamel.aspectRatios.hdVideo,
            tabs: tabs
        });

        player.addEventListener("play", function(){
            player.restoreTabs();
        },false);

        if(typeof args.callback === 'function'){
            setTimeout(function(){
                args.callback({
                    mainPlayer: player,
                    transcriptPlayer: transcriptPlayer,
                    trackResources: trackResources,
                    trackMimes: trackMimes
                });
            }, 1);
        }

        return player;
    }

    return {
        /* args: resource, content, courseId, contentId, holder, components,
            screenAdaption, startTime, endTime, renderCue, permission, callback */
        render: function(args){
            // Temporary hack to show current source
            var srcFile, srcUrlEl = document.getElementById('sourceUrl');
            if(srcUrlEl){
                srcFile = args.resource.content.files[0];
                srcUrlEl.value = srcFile.downloadUri || srcFile.streamUri;
            }
            Promise.all([
                // Load the caption tracks
                (showCaptions(args.content) || showTranscript(args.content)) ?
                ContentLoader.getTranscriptWhitelist({
                    resource: args.resource,
                    courseId: args.courseId,
                    contentId: args.contentId,
                    permission: args.permission
                }) : [],
                // Load annotations
                showAnnotations(args.content) ?
                ContentLoader.getAnnotationWhitelist({
                    resource: args.resource,
                    courseId: args.courseId,
                    contentId: args.contentId,
                    permission: args.permission
                }) : []
            ]).then(function(arr){
                var player,
                    container = document.createElement('div');
                container.id = "player";
                args.holder.appendChild(container);

                // Set up the video player
                player = setupMainPlayer({
                    content: args.content,
                    components: args.components,
                    screenAdaption: args.screenAdaption,
                    resource: args.resource,
                    startTime: args.startTime,
                    endTime: args.endTime,
                    renderCue: args.renderCue,
                    holder: container,
                    translate: allowDefinitions(content),
                    transcripts: arr[0],
                    annotations: arr[1],
                    callback: args.callback
                });

                player.then(function(){
                    // Resize the panes' content to be correct size onload
                    window.dispatchEvent(new Event('resize',{bubbles:true}));
                });

                // Handle thumbnail making
                document.addEventListener('makeThumbnail',function (e) {
                    e.stopPropagation();
                    document.getElementById("makeThumbnail")
                        .dispatchEvent(new CustomEvent('timeUpdate', {
                            bubbles:true,
                            detail: { currentTime : player.currentTime }
                        }));
                },false);
            });
        }
    };
}());
