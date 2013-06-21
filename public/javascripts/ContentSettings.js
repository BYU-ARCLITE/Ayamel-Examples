/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 6/21/13
 * Time: 10:12 AM
 * To change this template use File | Settings | File Templates.
 */
var ContentSettings = (function() {

    function coursePrefix(courseId) {
        return "course_" + courseId + ":";
    }

    function userPrefix(userId) {
        return "user_" + userId + ":";
    }

    function getPrefix(context) {
        if (context.owner)
            return "";
        else if (context.courseId)
            return coursePrefix(context.courseId);
        else
            return userPrefix(context.userId);
    }

    function getPermissionLevel(context) {
        if (context.owner)
            return "global";
        else if (context.courseId)
            return "course";
        else
            return "personal";
    }

    var predefined = {
        playbackLevel: {
            type: "radio",
            label: "Playback level",
            name: "level",
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
                    var level = Number(content.settings.level || 1);
                    return all.splice(0, level);
                } else
                    return all;
            },
            attach: function($control, context, content) {
                var level = content.settings[getPrefix(context) + "level"] || 1;
                $control.find("input[value="+level+"]").prop("checked", true);
            }
        },
        showTranscriptions: {
            type: "checkbox",
            label: "Show transcripts?",
            name: "includeTranscriptions",
            attach: function($control, context, content) {
                var global = content.settings.includeTranscriptions && content.settings.includeTranscriptions === "true";
                if (!global && getPrefix(context)) {
                    // Remove the control if we're not global and it's not enabled globally
                    $control.html("");
                } else {
                    var local = content.settings[getPrefix(context)+"includeTranscriptions"] &&
                        content.settings[getPrefix(context)+"includeTranscriptions"] === "true";
                    if (local)
                        $control.find("input").prop("checked", true);
                }
            }
        },
        enabledCaptionTracks: {
            type: "select",
            label: "Enabled Caption Tracks",
            name: "captionTracks",
            multiple: true,
            options: function(context, content) {
                // TODO: Get the document name and language from the ID
                return content.enableableCaptionTracks.map(function (id) {
                    return {
                        text: id,
                        value: id
                    };
                });
            },
            attach: function($control, context, content) {
                var prefix = getPrefix(context);
                var items = (content.settings[prefix + "enabledCaptionTracks"] || "").split(",").filter(function(s){return !!s;});
                $control.find("select").val(items);
            }
        },
        enabledAnnotations: {
            type: "select",
            label: "Enabled Annotations",
            name: "annotationDocs",
            multiple: true,
            options: function(context, content) {
                // TODO: Get the document name and language from the ID
                return content.enableableAnnotationDocuments.map(function (id) {
                    return {
                        text: id,
                        value: id
                    };
                });
            },
            attach: function($control, context, content) {
                var prefix = getPrefix(context);
                var items = (content.settings[prefix + "enabledAnnotationDocuments"] || "").split(",").filter(function(s){return !!s;});
                $control.find("select").val(items);
            }
        }
    };

    var settings = {
        personal: {
            video: [
                predefined.enabledCaptionTracks,
                predefined.enabledAnnotations
            ],
            audio: [
                predefined.enabledCaptionTracks,
                predefined.enabledAnnotations
            ],
            image: [
                predefined.enabledAnnotations
            ],
            text: [
                predefined.enabledAnnotations
            ]
        },
        course: {
            video: [
                predefined.playbackLevel,
                predefined.showTranscriptions,
                predefined.enabledCaptionTracks,
                predefined.enabledAnnotations
            ],
            audio: [
                predefined.playbackLevel,
                predefined.showTranscriptions,
                predefined.enabledCaptionTracks,
                predefined.enabledAnnotations
            ],
            image: [
                predefined.enabledAnnotations
            ],
            text: [
                predefined.enabledAnnotations
            ]
        },
        global: {
            video: [
                predefined.playbackLevel,
                predefined.showTranscriptions,
                predefined.enabledCaptionTracks,
                predefined.enabledAnnotations
            ],
            audio: [
                predefined.playbackLevel,
                predefined.showTranscriptions,
                predefined.enabledCaptionTracks,
                predefined.enabledAnnotations
            ],
            image: [
                predefined.enabledAnnotations
            ],
            text: [
                predefined.enabledAnnotations
            ]
        }
    };

    function createControls(config, context, content) {
        if (config.type === "radio") {
            return new SettingsForm.formParts.RadioButtons({
                name: config.name,
                label: config.label,
                items: config.items(context, content),
                attach: function ($control) {
                    config.attach($control, context, content);
                }
            });
        } else if (config.type === "checkbox") {
            return new SettingsForm.formParts.CheckBox({
                name: config.name,
                label: config.label,
                attach: function ($control) {
                    config.attach($control, context, content);
                }
            });
        } else if (config.type === "select") {
            return new SettingsForm.formParts.Select({
                name: config.name,
                label: config.label,
                multiple: config.multiple,
                options: config.options(context, content),
                attach: function ($control) {
                    config.attach($control, context, content);
                }
            });
        }
        return null;
    }

    function ContentSettings(args) {

        // Determine what content type and at what permission level we are dealing with
        var context = {
            courseId: args.courseId || 0,
            owner: args.owner || false,
            userId: args.userId || 0
        };
        var permissionLevel = getPermissionLevel(context);

        // Before we create the form, we want to collect data first
        // Get a list of caption tracks we are allowed to enable
        $.ajax("/ajax/permissionChecker", {
            type: "post",
            data: {
                contentId: args.content.id,
                courseId: context.courseId,
                permission: "enable",
                documentType: "captionTrack"
            },
            success: function(data){
                args.content.enableableCaptionTracks = data;

                // Now get a list of annotation documents we are allowed to enable
                $.ajax("/ajax/permissionChecker", {
                    type: "post",
                    data: {
                        contentId: args.content.id,
                        courseId: context.courseId,
                        permission: "enable",
                        documentType: "annotations"
                    },
                    success: function(data){
                        args.content.enableableAnnotationDocuments = data;

                        // Create the form
                        var controls = settings[permissionLevel][args.content.contentType].map(function(config) {
                            return createControls(config, context, args.content);
                        });
                        var form = new SettingsForm.SettingsForm({
                            $holder: args.$holder,
                            controls: controls
                        });
                    }
                });
            }
        });
    }
    return ContentSettings;
})();