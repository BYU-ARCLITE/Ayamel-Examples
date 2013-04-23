/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/23/13
 * Time: 3:59 PM
 * To change this template use File | Settings | File Templates.
 */
var ActivityStreams = (function() {

    var pageCategory = "unknown";
    var pageAction = "unknown";
    var pageId = 0;


    function save(args) {
        $.ajax("/ajax/activity", {
            type: "post",
            data: {
                pageCategory: pageCategory,
                pageAction: pageAction,
                pageId: pageId,
                generatorType: args.generatorType || "",
                generatorId: args.generatorId || "",
                generatorItemRef: args.generatorItemRef || "",
                objectType: args.objectType || "",
                objectId: args.objectId || "",
                objectItemRef: args.objectItemRef || "",
                verb: args.verb
            }
        });
    }

    return {

        predefined: {
            pageload: function() {
                save({verb: "pageload"});
            },

            playClick: function(time) {
                save({
                    verb: "play",
                    generatorType: "media player",
                    generatorItemRef: time
                });
            },

            pauseClick: function(time) {
                save({
                    verb: "pause",
                    generatorType: "media player",
                    generatorItemRef: time
                });
            },

            transcriptCueClick: function(captionTrackId, cueNumber) {
                save({
                    verb: "cueClick",
                    generatorType: "transcription",
                    generatorId: captionTrackId,
                    generatorItemRef: cueNumber
                });
            },

            captionTranslation: function(captionTrackId, cueNumber, text) {
                save({
                    verb: "translate",
                    generatorType: "caption",
                    generatorId: captionTrackId,
                    generatorItemRef: cueNumber,
                    objectItemRef: text
                });
            },

            transcriptionTranslation: function(captionTrackId, cueNumber, text) {
                save({
                    verb: "translate",
                    generatorType: "transcription",
                    generatorId: captionTrackId,
                    generatorItemRef: cueNumber,
                    objectItemRef: text
                });
            },

            viewTextAnnotation: function(annotationDocId, text) {
                save({
                    verb: "view annotation",
                    objectType: "annotation",
                    objectId: annotationDocId,
                    objectItemRef: text
                });
            }
        },

        registerPage: function(category, action, id) {
            pageCategory = category;
            pageAction = action;
            pageId = id;
        },

        save: save
    };
}());