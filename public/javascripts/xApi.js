/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/23/13
 * Time: 3:59 PM
 * To change this template use File | Settings | File Templates.
 */
var xApi = (function() {

    var page, course, user, baseUri;
    page = course = user = {};
    baseUri = "https://ayamel.byu.edu/";

    // args: verb, type, extensions
    function send(args) {
        // create statement
        var resourceName = args.resource?args.resource.label:content.name;
        // Agent = User, Action = Verb, Activity = Content Object
        var stmt = new ADL.XAPIStatement(
            new ADL.XAPIStatement.Agent('mailto:'+(user.email?user.email:'placeholder@some.org'), user.name),
            new ADL.XAPIStatement.Verb('https://ayamel.byu.edu/'+args.verb, args.verb),
            new ADL.XAPIStatement.Activity(page.name, resourceName)
        );
        stmt.timestamp = (new Date).toISOString();
        if (args.type) { stmt.object.definition.extensions = args.type; }
        if (args.extensions) { stmt.object.definition.extensions = args.extensions; }
        // send statement and log response
        // callback makes the send asynchronous
        ADL.XAPIWrapper.sendStatement(stmt, function(resp, obj){  
            console.log("[" + obj.id + "]: " + resp.status + " - " + resp.statusText);
        });
    }

    return {
        predefined: {
            pageload: function() {
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
            }
        },

        /**
         * @param args:
         *      page
         *      course  (course Object)
         *      user    (user Object)
         */
        registerPage: function(args) {
            page = args.page
            course = args.course?args.course:course;
            user = args.user;
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