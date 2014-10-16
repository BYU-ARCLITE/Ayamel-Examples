/**
 * Given a JSON structure of an AnnotationManifest, this creates it anew with the proper classes so that their method
 * are available.
 */
var AnnotationLoader = (function(){

    function parseDocument(doc, lang){
		var langobj = {}, wordobj = {};
        switch(doc.meta.target){
		case "text":
			doc.annotations.forEach(function(obj){
                wordobj[obj.regex] = {
					global: {
						className: "annotation",
						data: obj.data
					}
				};
            });
			langobj[lang] = wordobj;
            return langobj;
		case "image":
			return new AnnotationManifest(doc.meta.target, doc.annotations.map(function(obj){
                return new ImageAnnotation(obj.location, obj.data);
            }));
		}
        return null;
    }

    return {
		parseDocument: parseDocument,
        loadURL: function(source, lang, callback){
			return Promise.resolve($.ajax(source, { dataType: "json" }))
			.then(function(data){
				if(data.meta){
					return parseDocument(data, lang);
				}else{
					return data;
				}
			});
        }
    };
}());