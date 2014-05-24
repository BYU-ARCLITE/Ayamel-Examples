$(function() {
	"use strict";

	var captionEditor, videoPlayer,
		commandStack, Dialog,
		langList = Object.keys(Ayamel.utils.p1map).map(function (p1) {
			var code = Ayamel.utils.p1map[p1];
			return {value: code, text: Ayamel.utils.getLangName(code)};
		}).sort(function(a,b){ return a.text.localeCompare(b.text); });

	langList.unshift({value:'zxx',text:'No Linguistic Content'});

	Dialog = Ractive.extend({
		template: '<div class="modal-header">\
			<button type="button" class="close" data-dismiss="modal" aria-hidden="true">�</button>\
			<h3>{{dialogTitle}}</h3>\
		</div>\
		<div class="modal-body">{{>dialogBody}}</div>\
		<div class="modal-footer">\
			{{#buttons}}\
			<button class="btn btn-blue" proxy-tap="buttonpress:{{.event}}">{{.label}}</button>\
			{{/buttons}}\
			<button class="btn" data-dismiss="modal" aria-hidden="true">Close</button>\
		</div>',
		init: function(opts){
			var actions = opts.actions;
			this.on('buttonpress',function(event,which){
				if(typeof actions[which] !== 'function'){ return; }
				actions[which].call(this,event);
			});
		}
	});

	Ractive.partials.trackKindSelect = '<div class="control-group">\
		<label class="control-label">Kind</label>\
		<div class="controls">\
			<select value="{{trackKind}}">\
				<option value="subtitles" selected>Subtitles</option>\
				<option value="captions">Captions</option>\
				<option value="descriptions">Descriptions</option>\
				<option value="chapters">Chapters</option>\
				<option value="metadata">Metadata</option>\
			</select>\
		</div>\
	</div>';
	Ractive.partials.trackLangSelect = '<div class="control-group">\
		<label class="control-label">Language</label>\
		<div class="controls">\
			<superselect icon="icon-globe" text="Select Language" selection="{{trackLang}}" open="{{selectOpen}}" multiple="false" options="{{languages}}">\
		</div>\
	</div>';

	function renderCue(renderedCue, area, renderFunc) {
		return captionEditor.make(renderedCue, area, renderFunc);
	}

	// Render the content

	content.settings = {
		level: 2,
		enabledCaptionTracks: content.settings.enabledCaptionTracks,
		includeTranscriptions: "true"
	};
	var $contentHolder = $("#contentHolder");
	var contentHolder = $contentHolder[0];

	// Figure out what size the video player needs to be so that the timeline and tools don't spill over
	var paddingTop = $contentHolder.offset().top;
	// 61px for player controls. 252px for timeline and tools.
	var paddingBottom = 313;

	function updateSpacing() {
		$("#bottomSpacer").css("margin-top", $("#bottomContainer").height() + "px");
		ScreenAdapter.scrollTo(document.body.scrollHeight - window.innerHeight);
	}

	//Create New Track From Scratch
	var newTrackData = (function(){
		var ractive, datalist, resolver, failer;
		ractive = new Dialog({
			el: document.getElementById('newTrackModal'),
			data: {
				dialogTitle: "Create a new track",
				languages: langList,
				trackLang: "zxx",
				trackKind: "subtitles",
				trackName: "",
				trackMime: "text/vtt",
				buttons: [{event:"create",label:"Create"}]
			},
			partials:{ dialogBody: document.getElementById('createTrackTemplate').textContent },
			components:{ superselect: EditorWidgets.SuperSelect },
			actions: {
				create: function(event){
					var data = this.data;
					$('#newTrackModal').modal('hide');
					resolver(datalist.map(function(key){
						switch(key){
						case 'kind': return data.trackKind;
						case 'name': return data.trackName || "Untitled";
						case 'lang': return data.trackLang;
						case 'mime': return data.trackMime;
						case 'overwrite': return true;
						case 'handler':
							return function(tp){
								tp.then(function(track){ track.mode = "showing"; });
							};
						}
					}));			
				}
			}
		});

		return function(dl){		
			// Clear the form
			ractive.set({trackName: "", selectOpen: false });
			$('#newTrackModal').modal('show');
			datalist = dl;
			return new Promise(function(resolve, reject){
				resolver = resolve;
				failer = reject;
			});
		};
	}());
	
	//Edit Track
	var editTrackData =	(function(){
		var ractive, datalist, resolver, failer;
		ractive = new Dialog({
			el: document.getElementById("editTrackModal"),
			data: {
				dialogTitle: "Edit tracks",
				languages: langList,
				trackLang: "zxx",
				trackKind: "subtitles",
				trackName: "",
				buttons: [{event:"save",label:"Save"}]
			},
			partials:{ dialogBody: document.getElementById('editTrackTemplate').textContent },
			components:{ superselect: EditorWidgets.SuperSelect },
			actions: {
				save: function(event){
					var data = this.data;
					if(data.trackToEdit === "" || data.trackName === ""){
						failer("cancel");
						return;
					}
					
					$("#editTrackModal").modal("hide");
					this.set({selectOpen: false});
					
					resolver(datalist.map(function(key){
						switch(key){
						case 'tid': return data.trackToEdit;
						case 'kind': return data.trackKind;
						case 'name': return data.trackName || "Untitled";
						case 'lang': return data.trackLang;
						case 'overwrite': return true;
						}
					}));
				}
			}
		});
		$("#editTrackModal").on("show", function() {
			var trackList = timeline.trackNames.slice();
			ractive.set({
				trackList: trackList,
				trackToEdit: trackList.length ? trackList[0] : ""
			});
		});

		ractive.observe("trackToEdit",function(trackName){
			var track;
			if(trackName === ""){ return; }
			track = timeline.getTrack(trackName);
			ractive.set({
				trackName: trackName,
				trackKind: track.kind,
				trackLang: track.language
			});
		});
		
		return function(dl){
			$('#editTrackModal').modal('show');
			datalist = dl;
			return new Promise(function(resolve, reject){
				resolver = resolve;
				failer = reject;
			});
		};
	}());
	
	//Save Tracks
	var saveTrackData = (function(){
		var ractive, datalist, resolver, failer,
			targets = EditorWidgets.Save.targets;
		ractive = new Dialog({
			el: document.getElementById('saveTrackModal'),
			data: {
				dialogTitle: "Save Tracks",
				saveDestinations: Object.keys(targets).map(function(key){
					return {
						value: key,
						name: targets[key].label.replace("To ", "")
					};
				}), saveDestination: "server",
				buttons: [{event:"save",label:"Save"}]
			},
			partials:{ dialogBody: document.getElementById('saveTrackTemplate').textContent },
			components:{ superselect: EditorWidgets.SuperSelect },
			actions: {
				save: function(event){
					var saver, data = this.data;

					$("#saveTrackModal").modal("hide");
					this.set({selectOpen: false});
					if(!tracks.length) {
						failer('cancel');
						return;
					}

					resolver(datalist.map(function(key){
						switch(key){
						case 'tidlist': return data.tracksToSave;
						case 'saver': return function(listp){ listp.then(saver); };
						}
					}));
					
					if(data.saveDestination === "server") {
						saver = function(exportedTracks){
							var savep = Promise.all(exportedTracks.map(function(fObj){
								var data = new FormData(),
									textTrack = fObj.track;
								data.append("file", new Blob([fObj.data],{type:fObj.mime}), fObj.name);
								data.append("label", textTrack.label);
								data.append("language", textTrack.language);
								data.append("kind", textTrack.kind);
								data.append("resourceId", videoPlayer.textTrackResources.has(textTrack)?
														  videoPlayer.textTrackResources.get(textTrack).id
														  :"");
								data.append("contentId", content.id);
								return Promise.resolve($.ajax({
									url: "/captionaider/save?course=" + courseId,
									data: data,
									cache: false,
									contentType: false,
									processData: false,
									type: "post",
									dataType: "text"
								})).then(function(data){
									//We really need some way to update cached resources as well as just retrieving newly created ones
									//That might allow us to save a roundtrip by having this ajax call return the complete updated resource
									if(!videoPlayer.textTrackResources.has(textTrack)){
										ResourceLibrary.load(data).then(function(resource){
											videoPlayer.textTrackResources.set(textTrack, resource);
										});
									}
									return textTrack.label;
								},function(xhr, status, error){
									alert("Error occurred while saving "+textTrack.label+":\n"+status)
								});
							}));							
							savep.then(function(){
								alert("Saved Successfully");
								//Scott bandaid to fix the tracks being saved.
								//There is absolutely no logical reason why this should work,
								//but apparently it does.
								window.location.reload(true);
							});
							return savep;
						};
					} else {
						// Use one of the editor widget saving mechanisms
						saver = function(exportedTracks){
							return new Promise(function(resolve, reject){
								EditorWidgets.Save(
									exportedTracks, data.saveDestination,
									function(){
										alert("Saved Successfully");
										resolve(exportedTracks.map(function(fObj){
											return fObj.track.label;
										}));
									},
									function(){
										alert("Error Saving; please try again.");
										reject(new Error("Error saving."));
									}
								);
							});
						};
					}
				}
			}
		});
		// Saving modal opening
		$("#saveTrackModal").on("show", function () {
			ractive.set({
				trackList: timeline.trackNames.slice(),
				tracksToSave: ""
			});
		});
		
		return function(dl){
			$('#editTrackModal').modal('show');
			datalist = dl;
			return new Promise(function(resolve, reject){
				resolver = resolve;
				failer = reject;
			});
		};
	}());
	
	// Load a track
	var loadTrackData = (function(){
		var ractive, datalist, resolver, failer,
			sources = EditorWidgets.LocalFile.sources;
		ractive = new Dialog({
			el: document.getElementById('loadTrackModal'),
			data: {
				dialogTitle: "Load Track",
				languages: langList,
				trackLang: "zxx",
				trackKind: "subtitles",
				sources: Object.keys(sources).map(function(key){ return {name: key, label: sources[key].label}; }),
				buttons: [{event:"load",label:"Load"}]
			},
			partials:{ dialogBody: document.getElementById('loadTrackTemplate').textContent },
			components:{ superselect: EditorWidgets.SuperSelect },
			actions: {
				load: function(event){
					var data = this.data;
					$("#loadTrackModal").modal("hide");
					this.set({selectOpen: false});
					
					EditorWidgets.LocalFile(data.loadSource,/.*\.(vtt|srt|ass|ttml)/,function(fileObj){
						//If the label is omitted, it will be filled in with the file name stripped of extension
						//That's easier than doing the stripping here, so leave out that parameter unless we can
						//fill it with user input in the future
						resolver(datalist.map(function(key){
							switch(key){
							case 'tracksrc': return fileObj;
							case 'kind': return data.trackKind;
							case 'lang': return data.trackLang;
							case 'overwrite': return true;
							case 'handler':
								return function(trackp){
									trackp.then(function(track){
										track.mode = "showing";
										commandStack.setFileUnsaved(track.label);
									},function(_){
										alert("There was an error loading the track.");
									});
								};
							}
						}));
					});
				}
			}
		});
		
		return function(dl){
			$('#loadTrackModal').modal('show');
			datalist = dl;
			return new Promise(function(resolve, reject){
				resolver = resolve;
				failer = reject;
			});
		};
	}());
	
	function loadTranscript(datalist){
		//datalist is always the array ['linesrc']
		return new Promise(function(resolve,reject){
			var f = document.createElement('input');
			f.type = "file";
			f.addEventListener('change',function(evt){
				resolve([evt.target.files[0]]);
			});
			f.click();
		});
	}
	
	function loadAudio(datalist){
		return new Promise(function(resolve,reject){
			var f = document.createElement('input');
			f.type = "file";
			f.addEventListener('change',function(evt){
				var f = evt.target.files[0];
				resolve(datalist.map(function(key){
					switch(key){
					case 'audiosrc': return f;
					case 'name': return f.name;
					}
				}));
			});
			f.click();
		});
	}
	
	function getFor(whatfor, datalist){
		switch(whatfor){
		case 'newtrack': return newTrackData(datalist);
		case 'edittrack': return editTrackData(datalist);
		case 'savetrack': return saveTrackData(datalist);
		case 'loadtrack': return loadTrackData(datalist);
		case 'loadlines': return loadTranscript(datalist);
		case 'loadaudio': return loadAudio(datalist);
		}
	}
	
	function canGetFor(whatfor, datalist){
		switch(whatfor){
		case 'newtrack':
		case 'edittrack':
		case 'savetrack':
		case 'loadtrack':
		case 'loadlines':
		case 'loadaudio': return true;
		}
		return false;
	}
	
	ContentRenderer.render({
		content: content,
		userId: userId,
		owner: owner,
		teacher: teacher,
		courseId: courseId,
		holder: contentHolder,
		annotate: true,
		permission: "edit",
//        screenAdaption: {
//            fit: true,
//            padding: 100
//        },
		startTime: 0,
		endTime: -1,
		renderCue: renderCue,
		noUpdate: true, // Disable transcript player updating for now
		callback: function(args) {
			var renderer, timeline,
				transcript = args.transcriptPlayer;

			commandStack = new EditorWidgets.CommandStack();
			videoPlayer = args.videoPlayer;
			renderer = videoPlayer.captionRenderer;
			
			timeline = new Timeline(document.getElementById("timeline"), {
				stack: commandStack,
				syncWith: videoPlayer,
				width: document.body.clientWidth || window.innerWidth,
				length: 3600,
				start: 0,
				end: 240,
				tool: Timeline.SELECT,
				showControls: true,
				canGetFor: canGetFor,
				getFor: getFor
			});
			
			updateSpacing();

			captionEditor = CaptionEditor({
				stack: commandStack,
				renderer: renderer,
				timeline: timeline
			});

			// Check for unsaved tracks before leaving
			window.addEventListener('beforeunload',function(e){
				if(!commandStack.saved){
					return "You have unsaved tracks. Your unsaved changes will be lost.";
				}
			}, false);

			window.addEventListener('resize',function(){
				timeline.width = window.innerWidth;
			}, false);

			// Set up listeners

			// Track selection
			videoPlayer.addEventListener("enabletrack", function(event) {
				var track = event.detail.track;
				if (timeline.hasTextTrack(track.label)) { return; }
				timeline.addTextTrack(track, track.mime);
				updateSpacing();
			});

			//TODO: Integrate the next listener into the timeline editor
			timeline.on('activechange', function(){ renderer.rebuildCaptions(); });
			
			timeline.on('addtrack',function(evt){
				videoPlayer.addTextTrack(evt.track.textTrack);
				updateSpacing();
			});

			timeline.on('removetrack', updateSpacing);

			[   //Set up keyboard shortcuts
				[Ayamel.KeyBinder.keyCodes.a,Timeline.CREATE],  //a - Add
				[Ayamel.KeyBinder.keyCodes.s,Timeline.SELEC],   //s - Select
				[Ayamel.KeyBinder.keyCodes.d,Timeline.DELETE],  //d - Delete
				[Ayamel.KeyBinder.keyCodes.v,Timeline.MOVE],    //v - Move
				[Ayamel.KeyBinder.keyCodes.q,Timeline.SPLIT],   //q - Split
				[Ayamel.KeyBinder.keyCodes.r,Timeline.SCROLL],  //r - Scroll
				[Ayamel.KeyBinder.keyCodes.e,Timeline.ORDER],   //e - Reorder
				[Ayamel.KeyBinder.keyCodes.f,Timeline.SHIFT],   //f - Time shift
				[Ayamel.KeyBinder.keyCodes.w,Timeline.REPEAT]   //w - Set repeat tool
			].forEach(function(pair) {
				var tool = pair[1];
				Ayamel.KeyBinder.addKeyBinding(pair[0], function() {
					// Only do the shortcut if:
					//  1. We aren't in an input
					//  2. A modal isn't open
					var inputFocused = ["TEXTAREA", "INPUT"].indexOf(document.activeElement.nodeName) > -1,
						modalOpen = $(".modal:visible").length;
					if (!inputFocused && !modalOpen){ timeline.currentTool = tool; }
				});
			});

			// Autocue controls
			Ayamel.KeyBinder.addKeyBinding(Ayamel.KeyBinder.keyCodes['|'], timeline.breakPoint.bind(timeline),true);
		}
	});
});