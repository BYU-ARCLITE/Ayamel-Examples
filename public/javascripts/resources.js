function Resource(id, callback) {
    this.id = id;
    callback = callback || function() {};

    // Load the resource
    var me = this;
    var url = "/api?url=" + encodeURI("http://ayamel.americancouncils.org/api/v1/resources/" + id);
    $.ajax(url, {
        dataType: "json",
        success: function(data) {
            me.content = {
                files: data.resource.content.files
            };
            me.relations = data.resource.relations;
            callback(me);
        }
    });
}
Resource.prototype.getThumbnail = function() {
    var filesIndex;

    for (filesIndex = 0; filesIndex < this.content.files.length; filesIndex++) {
        var file = this.content.files[filesIndex];
        if (file.mime.substr(0,5) === "image" && file.representation === "summary")
            return file.downloadUri;
    }
    return null;
};
Resource.prototype.getInformationFromVideo = function(video) {
    this.title = video.title;
    this.description = video.description;
};