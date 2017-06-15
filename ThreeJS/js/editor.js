var MapEditor = function(map) {
	
	this.map = JSON.parse(JSON.stringify(map || {}));
}

MapEditor.prototype.constructor = MapEditor;

MapEditor.prototype.init = function() {

	raycaster = new THREE.Raycaster();
	mouse = new THREE.Vector2();
	document.addEventListener( 'mousemove', onDocumentMouseMove, false );
}

MapEditor.prototype.setMap = function(map) {

	this.map = JSON.parse(JSON.stringify(map || {}));
}

MapEditor.prototype.getMap = function() {

	//return JSON.parse(JSON.stringify(this.map));
	return this.map;
}

MapEditor.prototype.destroy = function() {
	for (var p in this.map) {
		delete this.map[p];
	}
	document.removeEventListener( 'mousemove', onDocumentMouseMove );
}

function editor() {
	var editor = new MapEditor(map);
}

editor();