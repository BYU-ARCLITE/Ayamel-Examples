/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/19/13
 * Time: 12:24 PM
 * To change this template use File | Settings | File Templates.
 */

var ContentRenderer = (function(){

    var mainPlayer;

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

    function createLayout(content, holder){
        var panes, obj, slideOuts = [];

        if(showTranscript(content)){ slideOuts.push("Transcript"); }
        if(allowDefinitions(content)){ slideOuts.push("Definitions"); }
        if(showAnnotations(content)){ slideOuts.push("Annotations"); }

        switch(slideOuts.length){
        case 0:
            return ContentLayoutManager.onePanel(holder);
        case 1:
            panes = ContentLayoutManager.twoPanel(holder, slideOuts);
            obj = { player: panes.player };
            obj[slideOuts[0]] = panes[slideOuts[0]].content
            return obj;
        default:
            panes = ContentLayoutManager.twoPanel(holder, slideOuts);
            obj = { player: panes.player };
            slideOuts.forEach(function(tab){
                obj[tab] = panes[tab].content;
                obj[tab+"Tab"] = panes[tab].tab;
            });
            return obj;
        }
    }

    function setupTranslator(player, layout, resourceMap){
        // Add translation listeners
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
            ActivityStreams.predefined[activityType](resourceMap.get(data.cue.track).id, data.cue.id, detail.text);
            player.pause();
        });

        // Translation succeeded
        player.addEventListener("translation", function(event){
            var detail = event.detail,
                translations = detail.translations,
                translationsHolder = layout.Definitions.querySelector('.definitionsContent'),
                wordList = !document.body.classList.contains("share")? // Only allow saving words if the user is logged in (not sharing)
                    '<div class="addToWordList"><button class="btn btn-small"><i class="icon-paste"></i> Add to Word List</button></div>':"",
                html = Ayamel.utils.parseHTML('<div class="translationResult">\
                    <div class="sourceText">' + detail.text + '</div>\
                    <div class="translations">' + translations.join(",<br/>") + '</div>\
                    <div class="engine">' + engineToHTML(detail) + '</div>' + wordList +
                '</div>');

            if (wordList != "" ) {
                html.querySelector("button").addEventListener('click', function(){
                    var addWord = this.parentNode;
                    $.ajax("/words", {
                        type: "post",
                        data: {
                            srcLang: detail.srcLang,
                            destLang: detail.destLang,
                            word: detail.text
                        },
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
            translationsHolder.appendChild(html);
            
            if(layout.DefinitionsTab){
                $(layout.DefinitionsTab).tab("show");
                //keep the top of the new translation visible.
                if (html.offsetHeight > translationsHolder.offsetHeight) {
                    var translationSize = html.offsetHeight + html.querySelector('.sourceText').offsetHeight + 15;
                    translationsHolder.scrollTop = translationsHolder.scrollHeight - translationSize;
                } else {
                    translationsHolder.scrollTop = translationsHolder.scrollHeight;
                }
            }
        });

        // Handle errors
        player.addEventListener("translationError", function(event){
            alert("We couldn't translate \"" + event.detail.text + "\" for you.");
        });

        function engineToHTML(detail){
            var logoURL,
                engine = detail.engine,
                src = Ayamel.utils.downgradeLangCode(detail.srcLang),
                dest = Ayamel.utils.downgradeLangCode(detail.destLang);
            if(engine === "WordReference"){
                return '<a href="http://www.wordreference.com/' +
                    src +
                    dest +
                    '/' + detail.text + '" target="wordreference">' +
                    detail.text + ' at WordReference.com</a> © WordReference.com';
            }
            if(engine === "Merriam-Webster Inc."){
                logoURL="http://www.dictionaryapi.com/images/info/branding-guidelines/mw-logo-light-background-50x50.png";
                if((src==="es") || (dest==="es")){
                    return '<a href="http://www.spanishcentral.com/translate/' + detail.text + '" target="Merriam-Webster">'
                        + detail.text +' at SpanishCentral.com </a>'
                        + '<br/>Merriam-Webster\'s Spanish-English Dictionary '
                        + '<div class="merriamLogo"><a href="http://www.spanishcentral.com/translate/'
                        + detail.text + '" target="Merriam-Webster"> <img src="' + logoURL + '"></img></a></div>';
                }
                if((src==="en") && (dest==="en")){
                    return '<a href="http://www.merriam-webster.com/dictionary/' + detail.text + '" target="Merriam-Webster">'
                        + detail.text +' at Merriam-Webster.com </a>'
                        + '<br/> Merriam-Webster\'s Collegiate® Dictionary <br/>'
                        + '<div class="merriamLogo"><a href="http://www.merriam-webster.com/dictionary/'
                        + detail.text + '" target="Merriam-Webster"><img src="' + logoURL + '"></img></a></div>';
                }
            }
            return engine;
        }
    }

    function setupAnnotator(player, layout){
        player.addEventListener("annotation", function(event){
            player.pause();

            if(event.detail.data.type === "text"){
                layout.Annotations.innerHTML = event.detail.data.value;
                [].forEach.call(layout.Annotations.querySelectorAll('a'),function(link){
                    link.target = "_blank";
                });
            }

            if(event.detail.data.type === "image"){
                layout.Annotations.innerHTML = '<img src="' + event.detail.data.value + '">';
            }

            if(event.detail.data.type === "content"){
                ContentCache.load(event.detail.data.value, function(content){
                    layout.Annotations.innerHTML = "";
                    // Don't allow annotations, transcriptions, or certain controls
                    content.settings.showTranscripts = "false";
                    content.settings.showAnnotations = "false";
                    content.settings.allowDefinitions = "false";

                    ContentLoader.render({
                        content: content,
                        holder: layout.Annotations,
                        annotate: false,
                        screenAdaption: {
                            fit: false
                        },
                        aspectRatio: Ayamel.aspectRatios.hdVideo,
                        components: {
                            left: ["play"],
                            right: ["captions", "timeCode"]
                        }
                    });
                });
            }

            // Find the annotation doc
            var annotationDocId = "Unknown";
            ActivityStreams.predefined.viewTextAnnotation(annotationDocId, event.detail.text);

            $(layout.AnnotationsTab).tab("show");
        });
    }

    /* args: components, transcripts, content, screenAdaption, layout, resource,
        startTime, endTime, renderCue, annotator, translate */
    function setupMainPlayer(args){
        var player,
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
        Ayamel.prioritizedPlugins.video = ["html5", "flash", "brightcove", "youtube"];
        Ayamel.prioritizedPlugins.audio = ["html5"];

        // padding to account for the control bar
        //TODO: Dynamically check the actual control bar height
        args.layout.player.style.paddingBottom = "61px";

        // Spacebar to play/pause video
        window.addEventListener("keydown", function(e){
            if(e.keyCode == 32 && document.querySelectorAll('input:focus').length === 0){
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
            if(!args.screenAdaption || !args.screenAdaption.fit || Ayamel.utils.FullScreen.isFullScreen){ return; }

            var el, sidebarHeight, slideOuts = [], avaliableHeight, usedSpace,
                tabsSizer = function(tabItem){
                    if (tabItem === 'Transcript'){
                        usedSpace = document.querySelector('#Transcript .form-inline').clientHeight;
                        el = document.querySelector('#Transcript .transcriptContentHolder');
                        return availableHeight - usedSpace;
                    } else if (tabItem === 'Definitions'){
                        var defsPane = document.getElementById(tabItem).firstChild;
                        if (defsPane !== null) {
                            usedSpace = defsPane.clientHeight;
                            el = document.querySelector('#Definitions .definitionsContent');
                        } else { usedSpace = 0; }
                        return availableHeight - usedSpace;
                    } else if (tabItem === 'Annotations'){
                        el = document.getElementById(tabItem);
                        return availableHeight;
                    }
                };

            player.resetSize();

            availableHeight = document.getElementById("player").clientHeight;
            if(showTranscript(args.content)){ slideOuts.push("Transcript"); }
            if(allowDefinitions(args.content)){ slideOuts.push("Definitions"); }
            if(showAnnotations(args.content)){ slideOuts.push("Annotations"); }

            switch(slideOuts.length){
            case 0:
                break;
            case 1:
                sidebarHeight = tabsSizer(slideOuts[0]) - (document.getElementById(slideOuts[0]).parentNode.firstChild.clientHeight + 20);
                el.style.maxHeight = sidebarHeight + "px";
                break;
            default:
                sidebarHeight = document.getElementById("player").clientHeight - (document.getElementById("videoTabs").clientHeight + 20);
                [].forEach.call(slideOuts, function(tab){
                    sidebarHeight = tabsSizer(tab) - (document.getElementById("videoTabs").clientHeight + 20);
                    el.style.maxHeight = sidebarHeight + "px";
                });
                break;
            }
        }, false);

        player = new Ayamel.classes.AyamelPlayer({
            components: components,
            holder: args.layout.player,
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
            aspectRatio: Ayamel.aspectRatios.hdVideo
        });

        var registerPlay = true;
        player.addEventListener("play", function(){
            // Sometimes two events appear, so only save one within a half second
            if(!registerPlay){ return; }
            ActivityStreams.predefined.playClick("" + player.currentTime);
            if(args.layout["TranscriptTab"]){
                $(args.layout["TranscriptTab"]).tab("show");
            }
            registerPlay = false;
            setTimeout(function(){ registerPlay = true;}, 500);
        });
        player.addEventListener("pause", function(){
            ActivityStreams.predefined.pauseClick("" + player.currentTime);
        });
        player.addEventListener("ended", function(){
            ActivityStreams.predefined.ended("" + player.currentTime);
        });
        player.addEventListener("timejump", function(e){
            ActivityStreams.predefined.timeJump(""+e.detail.oldtime, ""+e.detail.newtime);
        });
        player.addEventListener("captionJump", function(){
            ActivityStreams.predefined.repeatCaption("" + player.currentTime);
        });
        player.addEventListener("ratechange", function(){
            ActivityStreams.predefined.rateChange(""+player.currentTime, ""+player.playbackRate);
        });
        player.addEventListener("volumechange", function(){
            if(player.muted){ return; }
            ActivityStreams.predefined.volumeChange(""+player.currentTime, ""+player.volume);
        });
        player.addEventListener("mute", function(){
            ActivityStreams.predefined.volumeChange(""+player.currentTime, "0");
        });
        player.addEventListener("unmute", function(){
            ActivityStreams.predefined.volumeChange(""+player.currentTime, player.volume);
        });
        player.addEventListener("enterfullscreen", function(){
            ActivityStreams.predefined.enterFullscreen(""+player.currentTime);
        });
        player.addEventListener("exitfullscreen", function(){
            ActivityStreams.predefined.exitFullscreen(""+player.currentTime);
        });

        return player;
    }

    function setupTranscripts(content, layout, resourceMap){
        var transcriptPlayer = new TranscriptPlayer({
            //requires the actual TextTrack objects; should be fixed up to take resource IDs, I think
            captionTracks: [],
            holder: layout.Transcript,
            sync: true
            //noUpdate: args.noUpdate
            //TODO: Add links to translator & annotator
        });

        // Cue clicking
        transcriptPlayer.addEventListener("cueclick", function(event){
            var trackID = resourceMap.get(event.detail.track).id;

            mainPlayer.currentTime = event.detail.cue.startTime;
            ActivityStreams.predefined.transcriptCueClick(trackID, event.detail.cue.id);
        });

        return transcriptPlayer;
    }

    function getTargetLanguages(contentId){
        return Promise.resolve($.ajax("/ajax/getTargetLanguages", {
            type: "post",
            data: { contentId: contentId }
        })).then(function(data) {
            return Promise.all(data);
        });
    }

    function setupDefinitionsPane(pane, player, contentId){
        var selectHolder = document.createElement('div'),
            translationsHolder = document.createElement('div');

        getTargetLanguages(contentId).then(function(codes) {
            var targetLanguages;
            var defaultLanguage;
            if (!!codes.length) {
                // Fallback procedure when no languages have been selected
                targetLanguages = codes.map(function(code) {
                    return {value: code, text: Ayamel.utils.getLangName(code)};
                }).sort(function(a,b){ return a.text.localeCompare(b.text); });
            } else {
                targetLanguages = Object.keys(Ayamel.utils.p1map).map(function(p1){
                    var code = Ayamel.utils.p1map[p1];
                    return {value: code, text: Ayamel.utils.getLangName(code)};
                }).sort(function(a,b){ return a.text.localeCompare(b.text); });
            }
            //defaultLanguage = targetLanguages.indexOf("eng") !== -1 ? "eng" : targetLanguages[0];
            defaultLanguage = targetLanguages.filter(function(lang) {
                return lang.value === "eng";
            });
            if (defaultLanguage.length === 0) {
                defaultLanguage = [targetLanguages[0]];
            }
            translationsHolder.className = "definitionsContent";
            (new EditorWidgets.SuperSelect({
                el: selectHolder,
                data:{
                    id: 'transLang',
                    selection: [],
                    icon: 'icon-globe',
                    button: 'left',
                    text: 'Select Language',
                    multiple: false,
                    options: targetLanguages,
                    defaultValue : {value: defaultLanguage[0].value}
                }
            })).observe('selection', function(newValue){ player.targetLang = newValue[0]; });
            pane.appendChild(selectHolder);
            pane.appendChild(translationsHolder);
        })
    }

    return {
        /* args: resource, content, courseId, contentId, holder, components,
            screenAdaption, startTime, endTime, renderCue, permission, callback */
        render: function(args){
            // Load the caption tracks
            Promise.all([
                (showCaptions(args.content) || showTranscript(args.content)) ?
                ContentLoader.getTranscriptWhitelist({
                    resource: args.resource,
                    courseId: args.courseId,
                    contentId: args.contentId,
                    permission: args.permission
                }) : [],
                showAnnotations(args.content) ?
                ContentLoader.getAnnotationWhitelist({
                    resource: args.resource,
                    courseId: args.courseId,
                    contentId: args.contentId,
                    permission: args.permission
                }) : []
            ]).then(function(arr){
                var transcriptWhitelist = arr[0],
                    annotationWhitelist = arr[1],
                    content = args.content,
                    layout = createLayout(content, args.holder),
                    trackResources = new Map(),
                    trackMimes = new Map(),
                    transcriptPlayer = null;

                // Set up the video player
                mainPlayer = setupMainPlayer({
                    content: content,
                    components: args.components,
                    screenAdaption: args.screenAdaption,
                    resource: args.resource,
                    startTime: args.startTime,
                    endTime: args.endTime,
                    renderCue: args.renderCue,
                    layout: layout,
                    translate: allowDefinitions(content),
                    annotations: annotationWhitelist,
                    transcripts: transcriptWhitelist
                });

                if(allowDefinitions(content)){ setupTranslator(mainPlayer, layout, trackResources); }
                if(layout.Definitions){ setupDefinitionsPane(layout.Definitions, mainPlayer, content.id); }
                if(annotationWhitelist.length){ setupAnnotator(mainPlayer, layout); }

                if(transcriptWhitelist.length && showTranscript(content)){
                    transcriptPlayer = setupTranscripts(content, layout, trackResources);
                    mainPlayer.addEventListener("timeupdate", function(){
                        transcriptPlayer.currentTime = mainPlayer.currentTime;
                    });

                    mainPlayer.addEventListener('addtexttrack', function(event){
                        var track = event.detail.track;
                        transcriptPlayer.addTrack(track);
                        trackResources.set(track, event.detail.resource);
                        trackMimes.set(track, event.detail.mime);
                    }, false);
                }

                // Resize the panes' content to be correct size onload
                window.dispatchEvent(new Event('resize',{bubbles:true}));

                // Handle thumbnail making
                document.addEventListener('makeThumbnail',function (e) {
                    e.stopPropagation();
                    document.getElementById("makeThumbnail").dispatchEvent(new CustomEvent('timeUpdate',{bubbles:true, detail : { currentTime : mainPlayer.currentTime }}));
                },false);


                if(typeof args.callback === 'function'){
                    args.callback({
                        mainPlayer: mainPlayer,
                        transcriptPlayer: transcriptPlayer,
                        trackResources: trackResources,
                        trackMimes: trackMimes
                    });
                }
            });
        }
    };
}());
