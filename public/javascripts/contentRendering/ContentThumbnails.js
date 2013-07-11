/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/11/13
 * Time: 2:47 PM
 * To change this template use File | Settings | File Templates.
 */
var ContentThumbnails = (function() {

    var thumbnailMap = {
        "video": function(c){return !!c.thumbnail ? c.thumbnail : "http://ayamel.byu.edu/assets/images/videos/placeholder.jpg";},
        "image": function(c){return c.thumbnail},
        "audio": function(c){return !!c.thumbnail ? c.thumbnail : "http://ayamel.byu.edu/assets/images/audio/placeholder.jpg";},
        "text": function(c){return !!c.thumbnail ? c.thumbnail : "http://ayamel.byu.edu/assets/images/text/placeholder.jpg";},
        "questions": function(c){return !!c.thumbnail ? c.thumbnail : "http://ayamel.byu.edu/assets/images/questions/placeholder.jpg";}
    };

    return {
        resolve: function(content) {
            return thumbnailMap[content.contentType](content);
        }
    };
})();