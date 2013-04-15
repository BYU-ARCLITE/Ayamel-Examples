var supportedMimeTypes = {
    "types": ["audio", "image", "video"],
    "audio": [
        "audio/mp3",
        "audio/mpeg",
        "audio/mpeg3",
        "audio/wav",
        "audio/webm",
        "audio/x-wav",
        "audio/x-aiff",
        "audio/x-midi"
    ],
    "image": [
        "image/bmp",
        "image/cgm",
        "image/cmu-raster",
        "image/g3fax",
        "image/gif",
        "image/ief",
        "image/jpeg",
        "image/naplps",
        "image/png",
        "image/targa",
        "image/tiff",
        "image/vnd.dwg",
        "image/vnd.dxf",
        "image/vnd.fpx",
        "image/vnd.net.fpx",
        "image/vnd.svf",
        "image/x-xbitmap",
        "image/x-cmu-raster",
        "image/x-pict",
        "image/x-portable-anymap",
        "image/x-portable-pixmap",
        "image/x-rgb",
        "image/x-tiff",
        "image/x-win-bmp",
        "image/x-xbitmap",
        "image/x-xbm",
        "image/x-xpixmap",
        "image/x-windowdump"
    ],
    "video": [
        "video/mp4",
        "video/mpeg",
        "video/mpeg4",
        "video/quicktime",
        "video/webm",
        "video/x-msvideo",
        "video/x-ms-wmv",
        "video/x-sgi-movie"
    ]
};

function detectType(file) {
    var normalizedType = file.type.split(";")[0].trim();
    for (var i=0; i < supportedMimeTypes.types.length; i++) {
        var type = supportedMimeTypes.types[i];
        if (supportedMimeTypes[type].indexOf(normalizedType) >= 0)
            return type;
    }
    return "unknown";
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

$(function() {
    var maxFileSize = 20971520; // 20 MB
    var $fileDropper = $(".fileDropper");
    var $file = $("#file");
    var $fileInfo = $("#fileInfo");

    // Set up the file uploading
    bindDropArea($fileDropper[0], $file[0], function(files) {
        $fileDropper.removeClass("active");
    }, function() {
        $fileDropper.addClass("active");
    });

    $file.change(function() {
        $fileInfo.slideDown(300);

        // Update the info form based on the file
        // Set the content type
        var contentType = detectType(this.files[0]);
        if (contentType !== "unknown") {

            // Check the file size
            if (this.files[0].size <= maxFileSize) {
                var $contentType = $("#contentType");
                $contentType.parent().append("<input type='hidden' name='contentType' value='" + contentType +
                    "'><div class='pad-top-low'>" + capitalize(contentType) + "</div>");
                $contentType.remove();
            } else {
                alert("File too big! 20 MB max.");
                location.reload();
            }
        } else {
            alert("Unsupported file type.");
            location.reload();
        }
    });

    // Set up the continue button and sliding panels
    $fileInfo.slideUp(0);
});