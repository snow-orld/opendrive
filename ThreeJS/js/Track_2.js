var targetEngineMatrix = new THREE.Matrix3();
targetEngineMatrix.set(-1,0,0, 0,0,1, 0,1,0);

var TrackBuilder = {};

TrackBuilder.Circuit = function() {
	// body...
	this.constructionPosition = new THREE.Vector3();
	this.currentHeading = 0;
	this.elevation = 0;
	this.superelevation = 0;
	this.tracks = [];
	this.mesh = new THREE.Mesh();
};

TrackBuilder.UI = function(circuit) {
	
}