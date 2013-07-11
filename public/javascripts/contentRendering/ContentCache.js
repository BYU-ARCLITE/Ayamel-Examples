/**
 * Created with IntelliJ IDEA.
 * User: josh
 * Date: 7/11/13
 * Time: 2:53 PM
 * To change this template use File | Settings | File Templates.
 */
var ContentCache = {
    cache: {},
    load: function(id, callback) {
        if (ContentCache.cache[id])
            callback(ContentCache.cache[id]);
        else
            $.ajax("/content/" + id + "/json", {
                dataType: "json",
                success: function (data) {
                    ContentCache.cache[id] = data;
                    callback(data);
                }
            });
    }
};