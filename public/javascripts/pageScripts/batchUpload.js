function initBatchTable(target){
	var myTable = new Ractive({
		el: "#populatedItems",
		template: "#tableTemplate",
		data: {
			disabled: false,
			content: [{
				contentType: "",
				title: "",
				url: "",
				description: "",
				labels: "",
				languages: ""
			}]
		}
	});

	myTable.on("addRow", function(e, index) {
		myTable.get("content").splice(index+1, 0, {
			contentType: "",
			title: "",
			url: "",
			description: "",
			labels: "",
			languages: ""
		});
	});

	myTable.on("removeRow", function(e, index) {
		if(myTable.get("content").length < 2){ return; }
		myTable.get("content").splice(index, 1);
	});

	function submitRow(row, index){
		var formData = new FormData();
		var filesElement = document.getElementById('localFilesList');
		var filesList = [].filter.call(filesElement.files, function(val){
			return row.title == val.name
		});

		// If the URL textbox is empty, check the filesList
		if(row.url == ""){
			console.log("No url! Checking localFilesList...");

			if(filesList.length > 0){
				formData.append("file", filesList[0]);
			}else{
				return Promise.reject();
			}
		}

		formData.append("contentType",  row.contentType.toLowerCase());	// I think that the "contentType" endpoint is case sensitve.
		formData.append("title",        row.title       );
		formData.append("url",          row.url         );
		formData.append("description",  row.description );
		formData.append("labels",        row.labels       );
		formData.append("languages",     row.languages    );

		return new Promise(function(resolve, reject){
			// AJAX section
			var request = new XMLHttpRequest();
			request.responseType = "json";
			request.open("POST", target, true);
			request.addEventListener("load", function(e){
				if(this.status !== 200 || !this.response.contentId){
					myTable.set("content["+index+"].color", "#ff6666"); // red
					resolve();
				} else {
					myTable.set("content["+index+"].color", "lightgreen"); // green
					myTable.set("content["+index+"].contentId", this.response.contentId);
					resolve();
				}
			}, false);
			request.addEventListener("error", function(){
				myTable.set("content["+index+"].color", "lightgreen"); // green
				resolve();
			}, false);

			request.send(formData);
			myTable.set("content["+index+"].color", "#ffff99"); // yellow
		});
	}

	myTable.on("start", function(){
		myTable.set('disabled', true);

		Promise.all([].map.call(myTable.get("content"), submitRow))
		.then(function(){ myTable.set('disabled', false); });
	});

	function clearTable(){
		myTable.set('content', [{
			contentType: "",
			title: "",
			url: "",
			description: "",
			labels: "",
			languages: ""
		}]);
	}

	myTable.on("clear", clearTable);

	document.getElementById('csvList').addEventListener("change", function(){
		myTable.set('content', []);

		[].reduce.call(this.files, function(acc, file){
			return new Promise(function(resolve){
				Papa.parse(file, {
					//header: true,
					skipEmptyLines: true,
					error: function(){ resolve([]); },
					complete: function(results){
						var data = results.data;

						console.log('Data: ' + data[0][0].trim().substring(0,5).toLowerCase());

						if(!(data[0][0].trim().substring(0,5).toLowerCase() === 'video' ||
						     data[0][0].trim().substring(0,5).toLowerCase() === 'audio' ||
						     data[0][0].trim().substring(0,5).toLowerCase() === 'image' ||
						     data[0][0].trim().substring(0,4).toLowerCase() === 'text')){
							data.shift(); // skip the header
						}

						resolve(data);
					}
				});
			}).then(function(results){
				return acc.then(function(rows){
					return rows.concat(results);
				});
			});
		}, Promise.resolve([]))
		.then(function(rows){
			if(rows.length === 0){
				clearTable();
			}else{
				rows.forEach(function(v){
					myTable.get("content").push({
						contentType: v[0],
						title: v[1],
						url: v[2],
						description: v[3],
						labels: v[4],
						languages: v[5]
					});
				});
			}
		});
	},false);
}
