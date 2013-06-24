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
        contentType: {
            type: "hidden",
            name: "contentType",
            attach: function($control, context, content) {
                $control.val(content.contentType);
            }
        },
        saveButton: {
            type: "submit",
            classes: ["btn-blue"],
            text: "Save",
            attach: function($control, context, content) {
            }
        },
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
                // Get the document name and language from the ID
                return content.enableableCaptionTracks.map(function (resource) {
                    var langCode = resource.languages[0].length === 3 ? resource.languages[0] : Ayamel.utils.upgradeLangCode(resource.languages[0]);
                    var language = Ayamel.utils.getLangName(langCode);
                    return {
                        text: resource.title + " (" + language + ")",
                        value: resource.id
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
                // Get the document name and language from the ID
                return content.enableableAnnotationDocuments.map(function (resource) {
                    var langCode = resource.languages[0].length === 3 ? resource.languages[0] : Ayamel.utils.upgradeLangCode(resource.languages[0]);
                    var language = Ayamel.utils.getLangName(langCode);
                    return {
                        text: resource.title + " (" + language + ")",
                        value: resource.id
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
                predefined.contentType,
                predefined.enabledCaptionTracks,
                predefined.enabledAnnotations,
                predefined.saveButton
            ],
            audio: [
                predefined.contentType,
                predefined.enabledCaptionTracks,
                predefined.enabledAnnotations
            ],
            image: [
                predefined.contentType,
                predefined.enabledAnnotations,
                predefined.saveButton
            ],
            text: [
                predefined.contentType,
                predefined.enabledAnnotations,
                predefined.saveButton
            ]
        },
        course: {
            video: [
                predefined.contentType,
                predefined.playbackLevel,
                predefined.showTranscriptions,
                predefined.enabledCaptionTracks,
                predefined.enabledAnnotations,
                predefined.saveButton
            ],
            audio: [
                predefined.contentType,
                predefined.playbackLevel,
                predefined.showTranscriptions,
                predefined.enabledCaptionTracks,
                predefined.enabledAnnotations,
                predefined.saveButton
            ],
            image: [
                predefined.contentType,
                predefined.enabledAnnotations,
                predefined.saveButton
            ],
            text: [
                predefined.contentType,
                predefined.enabledAnnotations,
                predefined.saveButton
            ]
        },
        global: {
            video: [
                predefined.contentType,
                predefined.playbackLevel,
                predefined.showTranscriptions,
                predefined.enabledCaptionTracks,
                predefined.enabledAnnotations,
                predefined.saveButton
            ],
            audio: [
                predefined.contentType,
                predefined.playbackLevel,
                predefined.showTranscriptions,
                predefined.enabledCaptionTracks,
                predefined.enabledAnnotations,
                predefined.saveButton
            ],
            image: [
                predefined.contentType,
                predefined.enabledAnnotations,
                predefined.saveButton
            ],
            text: [
                predefined.contentType,
                predefined.enabledAnnotations,
                predefined.saveButton
            ]
        }
    };

    var initActions = [
        function (args, context, callback) {

            // Get the list of enableable caption tracks
            $.ajax("/ajax/permissionChecker", {
                type: "post",
                data: {
                    contentId: args.content.id,
                    courseId: context.courseId,
                    permission: "enable",
                    documentType: "captionTrack"
                },
                success: function(data) {

                    // Now turn those IDs into resources
                    async.map(data, function (id, asyncCallback) {
                        ResourceLibrary.load(id, function (resource) {
                            asyncCallback(null, resource);
                        });
                    }, function (err, data) {
                        args.content.enableableCaptionTracks = data;
                        callback();
                    });
                }
            });
        },
        function (args, context, callback) {

            // Get the list of enableable caption tracks
            $.ajax("/ajax/permissionChecker", {
                type: "post",
                data: {
                    contentId: args.content.id,
                    courseId: context.courseId,
                    permission: "enable",
                    documentType: "annotations"
                },
                success: function(data) {

                    // Now turn those IDs into resources
                    async.map(data, function (id, asyncCallback) {
                        ResourceLibrary.load(id, function (resource) {
                            asyncCallback(null, resource);
                        });
                    }, function (err, data) {
                        args.content.enableableAnnotationDocuments = data;
                        callback();
                    });
                }
            });
        }
    ];

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
        } else if (config.type === "hidden") {
            return new SettingsForm.formParts.HiddenInput({
                name: config.name,
                attach: function ($control) {
                    config.attach($control, context, content);
                }
            });
        } else if (config.type === "submit") {
            return new SettingsForm.formParts.Submit({
                name: config.name,
                classes: config.classes,
                text: config.text,
                attach: function ($control) {
                    config.attach($control, context, content);
                }
            });
        }
        return null;
    }

    function init(args, context, callback) {
        async.forEach(initActions, function(action, asyncCallback) {
            action(args, context, asyncCallback);
        }, callback);
    }

    function ContentSettings(args) {

        // Determine what content type and at what permission level we are dealing with
        var context = {
            courseId: args.courseId || 0,
            owner: args.owner || false,
            userId: args.userId || 0
        };
        var permissionLevel = getPermissionLevel(context);

        // Do any async actions now
        init(args, context, function () {

            // Create the form
            var controls = settings[permissionLevel][args.content.contentType].map(function(config) {
                return createControls(config, context, args.content);
            });
            new SettingsForm.SettingsForm({
                $holder: args.$holder,
                controls: controls,
                method: args.method,
                action: args.action
            });

        });
    }
    return ContentSettings;
})();