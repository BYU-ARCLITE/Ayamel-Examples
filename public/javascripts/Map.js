(function(global){
	if(typeof global.Map === 'function'){ return; }
	
	function Map(iterable){
		if(!(iterable instanceof Array)){ iterable = []; }
		Object.defineProperties(this,{
			keys: { value: iterable.map(function(p){ return p[0]; }) },
			vals: { value: iterable.map(function(p){ return p[1]; }) },
			size: {	get: function(){ return this.keys.length; }, enumerable: true }
		});
	}

	Map.prototype.get = function(key){
		var idx = this.keys.indexOf(key);
		return idx < 0 ? void 0: this.vals[idx];
	};

	Map.prototype.set = function(key, val){
		var idx = this.keys.indexOf(key);
		if(idx >= 0){ this.vals[idx] = val; }
		else{
			this.keys.push(key);
			this.vals.push(val);
		}
	};

	Map.prototype.has = function(key){
		return this.keys.indexOf(key) >= 0;
	};

	Map.prototype.delete = function(key){
		var idx = this.keys.indexOf(key);
		if(idx < 0){ return false; }
		this.keys.splice(idx,1);
		this.vals.splice(idx,1);
		return true;
	};

	Map.prototype.clear = function(){
		this.keys.length = 0;
		this.vals.length = 0;
	};
	
	global.Map = Map;
	
}(window));