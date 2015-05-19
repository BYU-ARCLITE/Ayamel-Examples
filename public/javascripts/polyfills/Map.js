(function(global){
	if(typeof global.Map === 'function'){ return; }

	function Map(iterable){
		if(!(iterable instanceof Array)){ iterable = []; }
		this._keys = iterable.map(function(p){ return p[0]; });
		this._vals = iterable.map(function(p){ return p[1]; });
		Object.defineProperties(this,{
			size: { get: function(){ return this._keys.length; }, enumerable: true }
		});
	}

	Map.prototype.entries = function(){
		var ks = this._keys.slice(),
			vs = this._vals.slice(),
			l = ks.length, i = -1;
		return {
			next: function(){
				i++;
				if(i < l){ return {value: [ks[i],vs[i]], done: false}; }
				return {value: void 0, done: true};
			}
		};
	};

	Map.prototype.keys = function(){
		var ks = this._keys.slice(),
			l = ks.length, i = -1;
		return {
			next: function(){
				i++;
				if(i < l){ return {value: ks[i], done: false}; }
				return {value: void 0, done: true};
			}
		};
	};

	Map.prototype.values = function(){
		var vs = this._values.slice(),
			l = vs.length, i = -1;
		return {
			next: function(){
				i++;
				if(i < l){ return {value: vs[i], done: false}; }
				return {value: void 0, done: true};
			}
		};
	};

	Map.prototype.get = function(key){
		var idx = this._keys.indexOf(key);
		return idx < 0 ? void 0: this._vals[idx];
	};

	Map.prototype.set = function(key, val){
		var idx = this._keys.indexOf(key);
		if(idx >= 0){ this._vals[idx] = val; }
		else{
			this._keys.push(key);
			this._vals.push(val);
		}
	};

	Map.prototype.has = function(key){
		return this._keys.indexOf(key) >= 0;
	};

	Map.prototype.delete = function(key){
		var idx = this._keys.indexOf(key);
		if(idx < 0){ return false; }
		this._keys.splice(idx,1);
		this._vals.splice(idx,1);
		return true;
	};

	Map.prototype.forEach = function(callback,thisArg){
		var i, len,
			keys = this._keys,
			vals = this._vals;
		for(i = 0, len = keys.length; i < len; i++){
			callback.call(thisArg,vals[i],keys[i],this);
		}
	};

	Map.prototype.clear = function(){
		this._keys.length = 0;
		this._vals.length = 0;
	};

	global.Map = Map;

}(window));