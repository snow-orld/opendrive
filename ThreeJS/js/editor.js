var MapEditor = function(map) {
	
	this.map = map;
}

MapEditor.prototype.constructor = MapEditor;

MapEditor.prototype.init = function() {

	raycaster = new THREE.Raycaster();
}

function editor() {
	var editor = new MapEditor(map);
}

editor();