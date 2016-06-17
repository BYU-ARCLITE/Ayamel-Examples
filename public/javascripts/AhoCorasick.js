var AhoCorasick = (function(){
	"use strict";

	function ACNode(out, i){
		this.go = {};
		this.fail = null;
		this.out = out;
		this.index = i;
	}

	ACNode.prototype.findall = function(s){
		var i, c, q = this,
			e = s.length,
			out = [];

		function mapout(o){
			var len = o.len,
				start = i-len+1;

			return {
				start: start,
				len: len,
				key: s.substr(start,len),
				value: o.value
			};
		}

		for(i = 0; i < e; i++){
			c = s[i];
			while(!q.go.hasOwnProperty(c) && q !== this){
				q = q.fail;
			}
			q = q.go[c] || this;
			[].push.apply(out,q.out.map(mapout));
		}
		return out;
	};

	function BuildACTable(keys){
		var q, queue, r,
			idx = 0,
			root = new ACNode([],0);

		root.fail = root;

		//Phase 1: build a trie
		keys.forEach(function(key){
			var i, c, e, str, val;

			if(typeof key === "object"){
				str = key.key;
				val = key.value;
			}else{
				str = key+"";
			}

			q = root;
			e = str.length;

			for(i = 0; i < e; i++){
				c = str[i];
				if(!q.go.hasOwnProperty(c)){
					q.go[c] = new ACNode([],++idx);
				}
				q = q.go[c];
			}

			q.out.push({len: e, value: val});
		});

		//Phase 2: add failure links

		// Set failure links for depth-1 states to root
		queue = Object.keys(root.go).map(function(c){ return root.go[c]; });
		queue.forEach(function(r){ r.fail = root; });

		// Compute states of depth d+1 from states of depth d

		function updateQueue(a){
			var state, s = r.go[a];
			queue.push(s);
			state = r.fail;
			while(!state.go.hasOwnProperty(a) && state !== root){
				state = state.fail;
			}
			s.fail = state.go[a] || root;
			[].push.apply(s.out, s.fail.out);
		}

		while(queue.length > 0){
			r = queue.shift();
			Object.keys(r.go).forEach(updateQueue);
		}

		return root;
	}

	return {
		buildTable: BuildACTable
	};
}());