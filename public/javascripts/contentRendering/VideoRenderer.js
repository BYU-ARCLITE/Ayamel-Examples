/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/19/13
 * Time: 12:24 PM
 * To change this template use File | Settings | File Templates.
 */

var VideoRenderer = (function(){

    var videoPlayer,
        translationHighlight,
        captionTrackId,
        cueNumber;

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
                            language: detail.srcLang,
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
            layout.Definitions.appendChild(html);
            layout.Definitions.scrollTop = layout.Definitions.scrollHeight;

            if(layout.DefinitionsTab){
                $(layout.DefinitionsTab).tab("show");
                layout.Definitions.scrollTop = layout.Definitions.scrollHeight;
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
                ContentCache.load(event.annotation.data.value, function(content){

                    // Don't allow annotations, transcriptions, or certain controls
                    content.settings.showTranscripts = "false";
                    content.settings.showAnnotations = "false";

                    ContentRenderer.render({
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
    function setupVideoPlayer(args){
        var player,
            components = args.components || {
            left: ["play", "lastCaption", "volume", "captions"],
            right: ["rate", "fullScreen", "timeCode"]
        };
        var captions = args.transcripts;

        if(!showCaptions(args.content)){
            ["left", "right"].forEach(function(side){
                ["lastCaption", "captions"].forEach(function(control){
                    var index = components[side].indexOf(control);
                    if(~index){ components[side].splice(index, 1); }
                });
            });
            captions = null;
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

        // Need to remove the players css so that the fullscreen css can happen
        window.addEventListener('enterfullscreen', function(event){
            if (Ayamel.utils.FullScreen.isFullScreen){
                player.element.style.removeProperty("width");
                player.element.style.removeProperty("height");
                return;
            }
        }, false);

        // Call a resize event so that it resizes after
        window.addEventListener(Ayamel.utils.FullScreen.fullScreenEvent, function(event){
            window.dispatchEvent(new Event('resize',{bubbles:true,cancealble:true}));
        }, false);
        
         window.addEventListener('resize', function(event){
            if(!args.screenAdaption || !args.screenAdaption.fit || Ayamel.utils.FullScreen.isFullScreen){ return; }

            player.resetSize();

            var sidebarHeight = videoPlayer.height - $("#videoTabs").height();
            $(".transcriptContent").css("max-height", sidebarHeight - 57);
            $("#Definitions, #Annotations").css("height", sidebarHeight - 27);
        }, false);

        player = new Ayamel.classes.AyamelPlayer({
            components: components,
            holder: args.layout.player,
            resource: args.resource,
            captionTracks: captions,
            annotations: {
				classList: ['annotation'],
				data: args.annotations
			},
//            components: components,
            startTime: args.startTime,
            endTime: args.endTime,
            translate: args.translate,
            renderCue: args.renderCue,
            aspectRatio: Ayamel.aspectRatios.hdVideo
        });

        var registerPlay = true;
        player.addEventListener("play", function(){
            // Sometimes two events appear, so only save one within a half second
            if(!registerPlay){ return; }
            ActivityStreams.predefined.playClick("" + player.currentTime);
            registerPlay = false;
            setTimeout(function(){ registerPlay = true;}, 500);
        });
        player.addEventListener("pause", function(){
            ActivityStreams.predefined.pauseClick("" + player.currentTime);
        });

        return player;
    }

    function setupTranscripts(content, layout, captionTracks){
        if(showTranscript(content)){
            var transcriptPlayer = new TranscriptPlayer({
                //requires the actual TextTrack objects; should be fixed up to take resource IDs, I think
                captionTracks: captionTracks,
                holder: layout.Transcript,
                sync: true
                //noUpdate: args.noUpdate
                //TODO: Add links to translator & annotator
            });

            // Cue clicking
            transcriptPlayer.addEventListener("cueclick", function(event){
                var trackID = videoPlayer.textTrackResources.get(event.detail.track).id;

                videoPlayer.currentTime = event.detail.cue.startTime;
                ActivityStreams.predefined.transcriptCueClick(trackID, event.detail.cue.id);
            });

            return transcriptPlayer;
        }
        return null;
    }

    function setupDefinitionsPane(pane, player){
        var selectHolder = document.createElement('div');
        (new EditorWidgets.SuperSelect({
            el: selectHolder,
            data:{
                id: 'transLang',
                selection: 'eng',
                icon: 'icon-globe',
                button: 'left',
                text: 'Select Language',
                multiple: false,
                options: Object.keys(Ayamel.utils.p1map).map(function(p1){
                    var code = Ayamel.utils.p1map[p1];
                    return {value: code, text: Ayamel.utils.getLangName(code)};
                }).sort(function(a,b){ return a.text.localeCompare(b.text); })
            }
        })).observe('selection', function(newValue){ player.targetLang = newValue; });
        pane.appendChild(selectHolder);
    }

    return {
        /* args: resource, content, courseId, contentId, holder, components,
            screenAdaption, startTime, endTime, renderCue, permission, vidcallback */
        render: function(args){
            // Load the caption tracks
            Promise.all([
                (showCaptions(args.content) || showTranscript(args.content)) ?
                ContentRenderer.getTranscripts({
                    resource: args.resource,
                    courseId: args.courseId,
                    contentId: args.contentId,
                    permission: args.permission
                }) : null,
                showAnnotations(args.content) ?
                ContentRenderer.getAnnotations({
                    resource: args.resource,
                    courseId: args.courseId,
                    contentId: args.contentId,
                    permission: args.permission
                }) : null
            ]).then(function(arr){
                var transcripts = arr[0],
                    manifest = arr[1],
                    content = args.content,
                    layout = createLayout(content, args.holder),
                    transcriptPlayer = null;

                // Set up the video player
                videoPlayer = setupVideoPlayer({
                    content: content,
                    components: args.components,
                    screenAdaption: args.screenAdaption,
                    resource: args.resource,
                    startTime: args.startTime,
                    endTime: args.endTime,
                    renderCue: args.renderCue,
                    layout: layout,
                    translate: allowDefinitions(content),
                    annotations: manifest,
                    transcripts: transcripts
                });

                videoPlayer.addEventListener('loadtexttracks', function(event){
                    if(allowDefinitions(content)){ setupTranslator(videoPlayer, layout, videoPlayer.textTrackResources); }
                    if(layout.Definitions){ setupDefinitionsPane(layout.Definitions, videoPlayer); }
                    if(transcripts && transcripts.length && showTranscript(content)){
                        transcriptPlayer = setupTranscripts(content, layout, event.detail.tracks);
                        videoPlayer.addEventListener("timeupdate", function(){
                            transcriptPlayer.currentTime = videoPlayer.currentTime;
                        });
                    }
                    if(manifest){
                        setupAnnotator(videoPlayer, layout);
                    }
                    if(typeof args.vidcallback === 'function'){
                        args.vidcallback(videoPlayer, transcriptPlayer);
                    }
                }, false);

                // Handle thumbnail making
                document.addEventListener('makeThumbnail',function (e) {
                    e.stopPropagation();
                    document.getElementById("makeThumbnail").dispatchEvent(new CustomEvent('timeUpdate',{bubbles:true, detail : { currentTime : videoPlayer.currentTime }}));
                },false);

                // Resize the panes' content to be correct size onload
                $("#Definitions, #Annotations").css("height", videoPlayer.height-($("#videoTabs").height() + 27));
            });
        }
    };
}());
