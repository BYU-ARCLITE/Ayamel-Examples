var xApi = (function() {

    var page, course, user, resourceName, baseUri;
    page = course = user = {};
    baseUri = window.location.origin + "/";
    resourceName = "";

    // args: verb, type, extensions
    function send(args) {
        // create statement
        // Agent = User, Action = Verb, Activity = Content Object
        var stmt = new ADL.XAPIStatement(
            new ADL.XAPIStatement.Agent('mailto:'+(user.email?user.email:'placeholder@some.org'), user.name),
            new ADL.XAPIStatement.Verb(baseUri+args.verb, args.verb),
            new ADL.XAPIStatement.Activity(page.name, resourceName)
        );
        stmt.timestamp = (new Date).toISOString();
        if (args.type) { stmt.object.definition.extensions = args.type; }
        if (args.extensions) { stmt.object.definition.extensions = args.extensions; }
        // send statement and log response
        // callback makes the send asynchronous
        ADL.XAPIWrapper.sendStatement(stmt, function(resp, obj){
            // The callback makes the xApi call asynchronous
            //console.log("[" + obj.id + "]: " + resp.status + " - " + resp.statusText);
        });
    }

    /**
     * Add the xApi event listeners to the main player.
     * @param player js player object
     */
    function addListeners(player) {
        /**
         * Used to limit the amount of times that a function is called per wait period
         */
        function throttle(func, wait) {
            var timeout;
            return function() {
                var context = this, args = arguments;
                if (!timeout) {
                    timeout = setTimeout(function() {
                        timeout = null;
                        func.apply(context, args);
                    }, wait);
                }
            }
        }
        player.addEventListener("play", throttle(function(){
            xApi.predefined.playClick("" + player.currentTime);
        }, 500));
        player.addEventListener("pause", function(){
            xApi.predefined.pauseClick("" + player.currentTime);
        });
        player.addEventListener("ended", function(){
            xApi.predefined.ended("" + player.currentTime);
        });
        player.addEventListener("timejump", function(e){
            xApi.predefined.timeJump(""+e.detail.oldtime, ""+e.detail.newtime);
        });
        player.addEventListener("captionJump", function(){
            xApi.predefined.repeatCaption("" + player.currentTime);
        });
        player.addEventListener("ratechange", throttle(function(){
            xApi.predefined.rateChange(""+player.currentTime, ""+player.playbackRate);
        }, 1000));
        player.addEventListener("volumechange", throttle(function(){
            if(player.muted){ return; }
            xApi.predefined.volumeChange(""+player.currentTime, ""+player.volume);
        }, 1000));
        player.addEventListener("mute", function(){
            xApi.predefined.mute(""+player.currentTime, "0");
        });
        player.addEventListener("unmute", function(){
            xApi.predefined.unmute(""+player.currentTime, player.volume);
        });
        player.addEventListener("enterfullscreen", function(){
            xApi.predefined.enterFullscreen(""+player.currentTime);
        });
        player.addEventListener("exitfullscreen", function(){
            xApi.predefined.exitFullscreen(""+player.currentTime);
        });
        player.addEventListener("enabletrack", function(e){
            xApi.predefined.enableCaptionTrack(e.detail.track);
        });
        player.addEventListener("disabletrack", function(e){
            xApi.predefined.disableCaptionTrack(e.detail.track);
        });
        player.addEventListener("watched", function(e){
            xApi.predefined.watched(""+player.currentTime);
        });
    }

    return {
        predefined: {
            pageLoad: function() {
                send({ verb: "started" });
            },
            ended: function(time) {
                var extensions = {};
                extensions[baseUri+"playerTime"] = time;
                send({
                    verb: "ended",
                    type: baseUri+"mediaPlayer",
                    extensions : extensions
                });
            },
            playClick: function(time) {
                var extensions = {};
                extensions[baseUri+"playerTime"] = time;
                send({
                    verb: "played",
                    type: baseUri+"mediaPlayer",
                    extensions : extensions
                });
            },
            pauseClick: function(time) {
                var extensions = {};
                extensions[baseUri+"playerTime"] = time;
                send({
                    verb: "paused",
                    type: baseUri+"mediaPlayer",
                    extensions : extensions
                });
            },
            rateChange: function(time, rate) {
                var extensions = {};
                extensions[baseUri+"playerTime"] = time;
                extensions[baseUri+"playRate"] = rate;
                send({
                    verb: "changed_playrate",
                    type: baseUri+"mediaPlayer",
                    extensions : extensions
                });
            },
            volumeChange: function(time, volume) {
                var extensions = {};
                extensions[baseUri+"playerTime"] = time;
                extensions[baseUri+"volume"] = volume;
                send({
                    verb: "changed_volume",
                    type: baseUri+"mediaPlayer",
                    extensions : extensions
                });
            },
            timeJump: function(oldTime, newTime){
                var extensions = {};
                extensions[baseUri+"oldTime"] = oldTime;
                extensions[baseUri+"newTime"] = newTime;
                send({
                    verb: "jumped",
                    type: baseUri+"mediaPlayer",
                    extensions : extensions
                });
            }, 
            repeatCaption: function(time){
                var extensions = {};
                extensions[baseUri+"playerTime"] = time;
                send({
                    verb: "repeated_caption",
                    type: baseUri+"mediaPlayer",
                    extensions : extensions
                });
            },  
            transcriptCueClick: function(captionTrackId, cueNumber, time) {
                var extensions = {};
                extensions[baseUri+"playerTime"] = time;
                extensions[baseUri+"cueNumber"] = cueNumber;
                extensions[baseUri+"captionTrackId"] = captionTrackId;
                send({
                    verb: "clicked_transcript_cue",
                    type: baseUri+"transcription",
                    extensions : extensions
                });
            },
            captionTranslation: function(captionTrackId, cueNumber, text, time) {
                var extensions = {};
                extensions[baseUri+"playerTime"] = time;
                extensions[baseUri+"captionTrackId"] = captionTrackId;
                extensions[baseUri+"text"] = text;
                send({
                    verb: "translated_word",
                    type: baseUri+"caption",
                    extensions : extensions
                });
            },
            transcriptionTranslation: function(captionTrackId, cueNumber, text, time) {
                var extensions = {};
                extensions[baseUri+"captionTrackId"] = captionTrackId;
                extensions[baseUri+"cueNumber"] = cueNumber;
                extensions[baseUri+"playerTime"] = time;
                extensions[baseUri+"text"] = text;
                send({
                    verb: "translateda_word",
                    type: baseUri+"caption",
                    extensions : extensions
                });
            },
            viewTextAnnotation: function(annotationDocId, text, time) {
                var extensions = {};
                extensions[baseUri+"playerTime"] = time;
                extensions[baseUri+"text"] = text;
                extensions[baseUri+"annotationDocId"] = annotationDocId;
                send({
                    verb: "viewed_annotation",
                    type: baseUri+"annotation",
                    extensions : extensions
                });
            },
            enterFullscreen: function(time){
                var extensions = {};
                extensions[baseUri+"playerTime"] = time;
                send({
                    verb: "enter_fullscreen",
                    type: baseUri+"mediaPlayer",
                    extensions : extensions
                });
            },
            exitFullscreen: function(time){
                var extensions = {};
                extensions[baseUri+"playerTime"] = time;
                send({
                    verb: "exit_fullscreen",
                    type: baseUri+"mediaPlayer",
                    extensions : extensions
                });
            },
            enableCaptionTrack: function(captionTrack, time) {
                var extensions = {};
                extensions[baseUri+"playerTime"] = time;
                extensions[baseUri+"captionTrack"] = captionTrack.label;
                send({
                    verb: "enabled_closed_caption",
                    type: baseUri+"mediaPlayer",
                    extensions : extensions
                });
            },
            disableCaptionTrack: function(captionTrack, time) {
                var extensions = {};
                extensions[baseUri+"playerTime"] = time;
                extensions[baseUri+"captionTrack"] = captionTrack.label;
                send({
                    verb: "disabled_closed_caption",
                    type: baseUri+"mediaPlayer",
                    extensions : extensions
                });
            },
            changeSpeed: function(speedLevel, time) {
                var extensions = {};
                extensions[baseUri+"playerTime"] = time;
                extensions[baseUri+"speedLevel"] = speedLevel;
                send({
                    verb: "changed_speed",
                    type: baseUri+"mediaPlayer",
                    extensions : extensions
                });
            },
            mute: function(time) {
                var extensions = {};
                extensions[baseUri+"playerTime"] = time;
                send({
                    verb: "muted",
                    type: baseUri+"mediaPlayer",
                    extensions : extensions
                });
            },
            unmute: function(time) {
                var extensions = {};
                extensions[baseUri+"playerTime"] = time;
                send({
                    verb: "unmuted",
                    type: baseUri+"mediaPlayer",
                    extensions : extensions
                });
            },
            changedResolution: function(time) {
                var extensions = {};
                extensions[baseUri+"playerTime"] = time;
                send({
                    verb: "changed_resolution",
                    type: baseUri+"mediaPlayer",
                    extensions : extensions
                });
            },
            watched: function(time) {
                var extensions = {};
                extensions[baseUri+"playerTime"] = time;
                send({
                    verb: "watched",
                    type: baseUri+"mediaPlayer",
                    extensions : extensions
                });
            },
            watched: function(time) {
                var extensions = {};
                extensions[baseUri+"playerTime"] = time;
                send({
                    verb: "watched",
                    type: baseUri+"mediaPlayer",
                    extensions : extensions
                });
            }
        },

        /**
         * @param args:
         *      page
         *      course  (course Object)
         *      user    (user Object)
         *      player
         */
        registerPage: function(args) {
            page = args.page
            course = args.course?args.course:course;
            user = args.user;
            resourceName = args.resource?args.resource.label:
                           args.content?args.content.name:
                           resourceName;
            addListeners(args.player);
        },
        /**
         * First, you need to connect to the LRS
         * @param e Endpoint - LRS statement endpoint
         * @param u Username for the LRS
         * @param p Password for the LRS
         */
        connect: function(e,u,p) {
            var conf = {
                "endpoint" : e,
                "auth" : "Basic " + toBase64(u+":"+p),
            };
            ADL.XAPIWrapper.changeConfig(conf);
        }
    };
}());