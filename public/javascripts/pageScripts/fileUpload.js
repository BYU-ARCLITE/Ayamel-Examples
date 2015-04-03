var supportedMimeTypes = {
    "types": ["audio", "image", "video", "text"],
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
        "video/x-sgi-movie",
        "application/x-mpegURL",
        "application/vnd.apple.mpegURL"
    ],
    "text": [
        "text/plain",
        "text/x-markdown"
    ]
};

function detectType(mime){
    var i, type;
    for(i=0; i < supportedMimeTypes.types.length; i++){
        type = supportedMimeTypes.types[i];
        if(supportedMimeTypes[type].indexOf(mime) >= 0){
            return type;
        }
    }
    return "unknown";
}

function capitalize(str){
    return str.charAt(0).toUpperCase() + str.slice(1);
}

$(function(){
    var selectedFile = null,
        selectedMime = "",
        maxFileSize = 20971520, // 20 MB
        uploadbtn = document.getElementById('uploadbtn'),
        $fileInfo = $("#fileInfo");

    // Set up the continue button and sliding panels
    $fileInfo.slideUp(0);

    // Set up the file uploading
    [].forEach.call(document.querySelectorAll('.fileDropper'),function(el){
        bindDropArea(el, function(files){
            el.classList.remove("active");
            setFile(files[0]);
        }, function(){
            el.classList.add("active");
        });
    });

    document.getElementById("file").addEventListener('change',function(e){
        setFile(this.files[0]);
    },false);

    uploadbtn.addEventListener('click',uploadHandler,false);

    function uploadHandler(e){
        e.preventDefault();
        uploadbtn.disabled = true;
        var data = new FormData();
        data.append("file", new Blob([selectedFile],{type:selectedMime}), selectedFile.name);
        data.append("contentType", document.getElementById('contentType').value);
        data.append("title", document.getElementById('title').value);
        data.append("description", document.getElementById('description').value);
        [].forEach.call(document.getElementById('labels').options,function(option){
            data.append("labels", option.value);
        });

        [].forEach.call(document.getElementById('languages').options,function(option){
            if(option.selected){ data.append('languages', option.value); }
        });
        [].forEach.call(document.getElementById('categories').options,function(option){
            if(option.selected){ data.append('categories', option.value); }
        });

        Promise.resolve($.ajax({
            url: uploadTarget,
            data: data,
            cache: false,
            contentType: false,
            processData: false,
            type: "post",
            dataType: "text"
        })).then(function(data){
            //replace current page with returned page
            document.open();
            document.write(data);
            document.close();
        },function(error){
            alert("Error occurred while uploading.");
            uploadbtn.disabled = false;
        });
    }

    function setFile(file){
        // Update the info form based on the file
        // Set the content type
        var contentTypeEl, contentType;
        selectedMime = Ayamel.utils.mimeFromFilename(
            file.name,
            file.type.split(";")[0].trim() //default value
        );
        contentType = detectType(selectedMime);
        if(contentType !== "unknown"){
            // Check the file size
            if(file.size <= maxFileSize){
                document.getElementById("title").value = Ayamel.utils.stripFileExt(file.name);
                contentTypeEl = document.getElementById("contentType");
                contentTypeEl.parentNode.innerHTML = "<input id='contentType' type='hidden' value='"+contentType+"' /><div class='pad-top-low'>" + capitalize(contentType) + "</div>";
                selectedFile = file;
                $fileInfo.slideDown(300);
            }else{
                alert("File too big! 20 MB max.");
            }
        }else{
            alert("Unsupported file type: " + selectedMime);
        }
    }

});