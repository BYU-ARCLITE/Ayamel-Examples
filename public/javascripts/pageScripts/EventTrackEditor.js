// Event Track Editor
//  - Adding event listeners to make changes to cues
    
var EventTrackEditor = (function(){

    var EventTrackEditor = function(cue, player){
    	// Create references for all editor tools
        var pauseCheckbox 	= document.getElementById('pauseCheckbox'),
            skipCheckbox 	= document.getElementById('skipCheckbox'),
            muteCheckbox 	= document.getElementById('muteCheckbox'),
            blankCheckbox 	= document.getElementById('blankCheckbox'),
            blurCheckbox 	= document.getElementById('blurCheckbox'),
            volumeCheckbox 	= document.getElementById('volumeCheckbox'),
            speedCheckbox 	= document.getElementById('speedCheckbox'),
            blurTextbox		= document.getElementById('blurTextbox'),
            volumeRange		= document.getElementById('volumeRange'),
            speedRange 		= document.getElementById('speedRange');

        // Set values of tools from the given cue
        (function setFromCue(cue){
        	// Parse cue into valid JSON
        	var cueText = (cue.text.length < 1) ? 
					'{"enter":{"events":[{"name":"watched"}],"actions":[]}}' : 
					cue.text.slice('[AyamelEvent]'.length, cue.text.length);

        	// Set all checkboxes and ranges to default
        	pauseCheckbox.checked = skipCheckbox.checked = muteCheckbox.checked = blankCheckbox.checked = 
        	blurCheckbox.checked = volumeCheckbox.checked = speedCheckbox.checked = blurTextbox.value = 0;

        	// TODO:
    		// volumeRange.value default value is AyamelPlayer's current volume value
    		volumeRange.value = player.volume;
    		speedRange.value = player.playbackRate;

			try{
				var newCue = JSON.parse(cueText);

				// for Each action in 'actions' set value of tool
				newCue.enter.actions.forEach(function(el){
					switch(el.type){
						case 'pause': 	pauseCheckbox.checked = true; break;
						case 'skip': 	skipCheckbox.checked  = true; break;
						case 'mute': 	muteCheckbox.checked  = true; break;
						case 'blank': 	blankCheckbox.checked = true; break;
						case 'blur': 	
							blurCheckbox.checked  = true;	
							blurTextbox.value = el.value;
							break;
						case 'setvolume': 
							volumeCheckbox.checked = true;
							volumeRange.value = el.value;
							break;
						case 'setrate': 	
							speedCheckbox.checked = true;
							speedRange.value = el.value;
							break;
					}
				})
			}
			catch(e){ console.log(e); }
        })(cue);

        // Event Listeners
        pauseCheckbox.addEventListener('click',  function(){ (this.checked) ? addElementToCue(cue, 'pause'): removeElementFromCue(cue, "pause");})        
        skipCheckbox.addEventListener('click',   function(){ (this.checked) ? addElementToCue(cue, 'skip') : removeElementFromCue(cue, "skip"); })        
        muteCheckbox.addEventListener('click',   function(){ (this.checked) ? addElementToCue(cue, 'mute') : removeElementFromCue(cue, "mute"); })        
        blankCheckbox.addEventListener('click',  function(){ (this.checked) ? addElementToCue(cue, 'blank'): removeElementFromCue(cue, "blank");})
        blurCheckbox.addEventListener('click', 	 function(){ /*TODO*/ })
        volumeCheckbox.addEventListener('click', function(){ /*TODO*/ })
        speedCheckbox.addEventListener('click',  function(){ /*TODO*/ })
        blurTextbox.addEventListener('change', function() {
        	if(blurCheckbox.checked){ 
        		addElementToCue(cue, 'blur', this.value.toString()); 
        	};
        })
        volumeRange.addEventListener('change', function() {
        	if(volumeCheckbox.checked){
        		addElementToCue(cue, 'setvolume', this.value.toString());
        	}
        })
        speedRange.addEventListener('change', function() {
        	(speedCheckbox.checked) ? addElementToCue(cue, 'setrate', this.value.toString()) : null;
        })



    	/*************************************************************************\
			Adds the action to the given cue with the given key and value
				-> Modifies the 'cue' parameter that it accepts
    	\*************************************************************************/
    	function addElementToCue(cue, key, value){
    		cue.text = (cue.text.length < 1) ? 
    					'{"enter":{"events":[{"name":"watched"}],"actions":[]}}' : 
    					cue.text.slice('[AyamelEvent]'.length, cue.text.length);

    		try{
    			var newCue = JSON.parse(cue.text);
    			var found = false;

    			for(var i = 0; i < newCue.enter.actions.length; i++){
    				if(newCue.enter.actions[i].type === key){
    					found = true;
    					break;
    				}
    			}

    			// if action element is not found, add it to actions[]
    			if(!found){
    				if(value === undefined){newCue.enter.actions.push({"type":key})}
    				else{newCue.enter.actions.push({"type":key, "value": value.toString()})}
    			}

    			// if action element IS found, remove it and and a new one with updated value
    			if(found && value !== undefined){
    				// remove the action element with the given key
    				newCue.enter.actions = newCue.enter.actions.filter(function(el){
    					return el.type !== key;
    				})
    				// add a new action element to the cue with the new value
    				newCue.enter.actions.push({"type":key, "value": value.toString()});
    			}
    			// Set the value of cue.text to the modified value
    			cue.text = '[AyamelEvent]' + JSON.stringify(newCue);
    		} 
    		catch(e){ console.log(e); }
    	}

    	/*************************************************************************\
			Removes the action from the given cue
				-> Modifies the 'cue' parameter that it accepts
    	\*************************************************************************/
    	function removeElementFromCue(cue, key){
    		if(cue.text === ""){ return; }
    		cue.text = cue.text.slice('[AyamelEvent]'.length, cue.text.length);
    		try{
    			// Create a new Cue object from the given 'cue' parameter (which is JSON)
    			var newCue = JSON.parse(cue.text);

    			// Filter out the given action
    			newCue.enter.actions = newCue.enter.actions.filter(function(action){ return action.type !== key; })
    			
    			// Set the value of cue.text to the modified value
    			cue.text = '[AyamelEvent]' + JSON.stringify(newCue);
    		}
    		catch(e) { console.log(e); }
    	}
    }

    return EventTrackEditor;
})()