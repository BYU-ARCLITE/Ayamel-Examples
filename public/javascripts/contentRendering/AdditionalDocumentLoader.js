/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/25/13
 * Time: 10:45 AM
 * To change this template use File | Settings | File Templates.
 */
var AdditionalDocumentLoader = (function() {

    function documentIsGlobal(relation) {
        return !!relation.attributes.owner === false;
    }

    function documentIsCourse(relation, courseId) {
        return relation.attributes.owner &&
            relation.attributes.owner === "course" &&
            relation.attributes.ownerId === "" + courseId;
    }

    function documentIsPersonal(relation, userId) {
        return relation.attributes.owner &&
            relation.attributes.owner === "user" &&
            relation.attributes.ownerId === "" + userId;
    }

    /*
     * Visible algorithm
     * -----------------
     *
     * Are we in the context of a course?
     * If no
     *   Show global documents filtered by globally enabled
     * If yes
     *   Show global documents filtered by globally enabled and filtered by course enabled
     *   Show course documents filtered by course enabled
     * Show all personal documents filtered by personal enabled
     */
    function visibleTest(relation, args) {
        var coursePrefix = "course_" + args.courseId + ":";
        var userPrefix = "user_" + args.userId + ":";
        var type = "enabled" + args.settingType;
        var globalAllowed = args.content.settings[type] ? args.content.settings[type].split(",") : [];
        var courseAllowed = args.content.settings[coursePrefix + type] ?
            args.content.settings[coursePrefix + type].split(",") : [];
        var personalAllowed = args.content.settings[userPrefix + type] ?
            args.content.settings[userPrefix + type].split(",") : [];

        var allowedInGlobal = globalAllowed.indexOf(relation.subjectId) >= 0;
        var allowedInCourse = courseAllowed.indexOf(relation.subjectId) >= 0;
        var allowedInPersonal = personalAllowed.indexOf(relation.subjectId) >= 0;

        var course = args.courseId &&
            ((documentIsGlobal(relation) && allowedInGlobal && allowedInCourse) ||
                (documentIsCourse(relation, args.courseId) && allowedInCourse));
        var global = !args.courseId && documentIsGlobal(relation) && allowedInGlobal;
        var personal = documentIsPersonal(relation, args.userId) && allowedInPersonal;
        return course || global || personal;
    }

    /*
     * Editable algorithm
     * ------------------
     *
     * Is the user allowed to edit the content?
     * If yes
     *   Show global documents
     * Are we in the context of a course?
     * If yes
     *   Is the user a teacher
     *   If yes
     *     Show course documents
     * Show all personal documents
     */
    function editableTest(relation, args) {
        var global = (args.owner && documentIsGlobal(relation));
        var course = (args.courseId && args.teacher && documentIsCourse(relation, args.courseId));
        return global || course || documentIsPersonal(relation, args.userId);
    }

    /*
     * Enablable algorithm
     * ------------------
     *
     * Are we in the context of the course
     * If yes
     *   Is the user a teacher
     *   if yes
     *     Show global documents filtered by globally enabled
     *     Show course documents
     * If no
     *   Is the user the owner
     *   if yes
     *     Show global documents
     * Show all personal documents
     */
    function enablableTest(relation, args) {
        var type = "enabled" + args.settingType;
        var globalAllowed = args.content.settings[type] ? args.content.settings[type].split(",") : [];
        var allowedInGlobal = globalAllowed.indexOf(relation.subjectId) >= 0;

        var course = (args.courseId && args.teacher &&
            (documentIsCourse(relation, args.courseId) || (documentIsGlobal(relation) && allowedInGlobal)));
        var global = (!args.courseId && args.owner && documentIsGlobal(relation));

        return (global && args.allowGlobal) || (course && args.allowCourse) ||
            (documentIsPersonal(relation, args.userId) && args.allowPersonal);
    }

    return {
        annotations: {
            loadEditable: function(args) {
                args.resource.getAnnotations(args.callback, function (relation) {
                    return editableTest(relation, args);
                });
            },
            loadEnablable: function(args) {
                args.settingType = "AnnotationDocuments";
                args.resource.getAnnotations(args.callback, function (relation) {
                    return enablableTest(relation, args);
                });
            },
            loadVisible: function(args) {
                args.settingType = "AnnotationDocuments";
                args.resource.getAnnotations(args.callback, function (relation) {
                    return visibleTest(relation, args);
                });
            }
        },
        captionTracks: {
            loadEditable: function(args) {
                args.resource.getTranscripts(args.callback, function (relation) {
                    return editableTest(relation, args);
                });
            },
            loadEnablable: function(args) {
                args.settingType = "CaptionTracks";
                args.resource.getTranscripts(args.callback, function (relation) {
                    return enablableTest(relation, args);
                });
            },
            loadVisible: function(args) {
                args.settingType = "CaptionTracks";
                args.resource.getTranscripts(args.callback, function (relation) {
                    return visibleTest(relation, args);
                });
            }
        }
    };
}());