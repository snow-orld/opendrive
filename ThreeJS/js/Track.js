var targetEngineMatrix = new THREE.Matrix3();
targetEngineMatrix.set(-1,0,0, 0,0,1, 0,1,0);

var TrackBuilder = {};

TrackBuilder.DefaultTrack = function(type) {

	var defaultTrack = {
		type: 'line',
		position: new THREE.Vector3(),
		heading: 0,
		length: 10,
		width: 5,
		curvature: 0,
		elevation: {a: 0, b: 0, c: 0, d: 0},
		superelevation: {a: 0, b: 0, c: 0, d: 0},
		isTrasitional: false,
		isElevatedLocal: false,
	}

	if (type == 'arc') {
		defaultTrack.type = 'arc';
		defaultTrack.curvature = -0.1;
		defaultTrack.length = Math.PI / 4 * 10;
	}

	if (type == 'loop') {
		defaultTrack.type = 'loop';
		defaultTrack.curvature = -0.1;
	}

	return defaultTrack;
}

/*
* Initiate a new Track with given type (line or arc), length, width, isElevatedLocal, elevation and superelevation
*/
TrackBuilder.Track = function(data) {
	// body...

	this.type = data.type || 'line';
	this.length = data.length || 10;
	this.width = data.width || 5;
	this.curvature = data.curvature || 0;
	this.elevation = data.elevation || {a: 0, b: 0, c: 0, d: 0};
	this.superelevation = data.superelevation || {a: 0, b: 0, c: 0, d: 0};
	this.isElevatedLocal = data.isElevatedLocal || false;

	this.isTrasitional = data.isTrasitional || false;

	this.position = data.position.clone() || new THREE.Vector3();
	this.heading = data.heading || 0;
	this.endPosition = new THREE.Vector3();
	this.endHeading = 0;
	this.actualLength = 0;

	this.geometry = this.generateGeometry();
	this.material = new THREE.MeshBasicMaterial({color: 0xCFCFCF, side: THREE.DoubleSide});
	this.mesh = this.generateMesh();
};

TrackBuilder.Track.prototype.generateGeometry = function() {
	// body...
	var centralPoints = [];
	var leftPoints = [];
	var rightPoints = [];

	var svector = new THREE.Vector3(), tvector = new THREE.Vector3(), hvector = new THREE.Vector3();
	var zvector = new THREE.Vector3(0, 0, 1), sevector = new THREE.Vector3();
	var s = 0, preS = 0, prePoint, x, y, z, radius;
	var rollAngle, h;
	var step = 0.5;

	switch (this.type) {
		
		case 'line':
			do {

				if (s >= this.length) {
					s = this.length;
					this.endHeading = this.heading;
				}

				if (this.isTrasitional) {
					rollAngle = this.superelevation.a + easeInCubic(s / this.length) * (this.superelevation.b * this.length);
					h = this.elevation.a + easeInCubic(s / this.length) * (this.elevation.b * this.length);
				} else {
					rollAngle = cubicPolynomial(s, this.superelevation);
					h = cubicPolynomial(s, this.elevation);
				}

				svector.set(1, 0, 0);
				tvector.set(0, 1, 0);
				tvector.applyAxisAngle(svector, rollAngle);
				if (this.isElevatedLocal)
					hvector = svector.clone().cross(tvector).multiplyScalar(h);
				else
					hvector.set(0, 0, h);

				centralPoints.push(svector.multiplyScalar(s).add(hvector).clone());
				leftPoints.push(tvector.clone().multiplyScalar(this.width / 2).add(svector));
				rightPoints.push(tvector.clone().multiplyScalar(-this.width / 2).add(svector));

				s += step;

			} while (s < this.length + step);
		
			break;
		
		case 'arc':

			radius = 1 / Math.abs(this.curvature);

			do {

				if (s >= this.length) {
					s = this.length;
					this.endHeading = this.heading + s * this.curvature;
				}

				if (this.isTrasitional) {
					rollAngle = easeInCubic(s / this.length) * cubicPolynomial(this.length, this.superelevation);
					h = easeInCubic(s / this.length) * cubicPolynomial(this.length, this.elevation);
				} else {
					rollAngle = cubicPolynomial(s, this.superelevation);
					h = cubicPolynomial(s, this.elevation);
				}

				svector.set(1, 0, 0); svector.applyAxisAngle(new THREE.Vector3(0, 0, 1), s * this.curvature);
				tvector.set(0, 1, 0); tvector.applyAxisAngle(new THREE.Vector3(0, 0, 1), s * this.curvature);
				tvector.applyAxisAngle(svector, rollAngle);
				if (this.isElevatedLocal)
					hvector = svector.clone().cross(tvector).multiplyScalar(h);
				else
					hvector.set(0, 0, h);

				if (s == 0) {
					centralPoints.push(new THREE.Vector3().add(hvector));
					leftPoints.push(tvector.clone().multiplyScalar(this.width / 2).add(hvector));
					rightPoints.push(tvector.clone().multiplyScalar(-this.width / 2).add(hvector));
					s += step;
					continue;
				}

				prePoint = centralPoints[centralPoints.length - 1];
				x = prePoint.x + 2 * radius * Math.sin((s - preS) / radius / 2) * Math.cos(preS * this.curvature + (s - preS) * this.curvature / 2);
				y = prePoint.y + 2 * radius * Math.sin((s - preS) / radius / 2) * Math.sin(preS * this.curvature + (s - preS) * this.curvature / 2);
				z = 0;

				svector.set(x, y, z).add(hvector);
				centralPoints.push(svector.clone());
				leftPoints.push(tvector.clone().multiplyScalar(this.width / 2).add(svector));
				rightPoints.push(tvector.clone().multiplyScalar(-this.width / 2).add(svector));

				preS = s;
				s += step;

			} while (s < this.length + step);

			break;
		
		case 'loop': 

			radius = 1 / Math.abs(this.curvature);

			do {
				if (s == 0) {
					centralPoints.push(new THREE.Vector3());
					leftPoints.push(new THREE.Vector3(0, this.width / 2, 0));
					rightPoints.push(new THREE.Vector3(0, -this.width / 2, 0));
					s += step;
					continue;
				}

				if (s >= Math.PI * 2 * radius) {
					s = Math.PI * 2 * radius;
					this.endHeading = this.heading;
				}

				prePoint = centralPoints[centralPoints.length - 1];

				x = prePoint.x + 2 * radius * Math.sin((s - preS) / radius / 2) * Math.cos(preS / radius + (s - preS) / radius / 2);
				y = Math.sign(this.curvature) * 2 * this.width * easeInOutCubic(s / (Math.PI * 2 * radius));
				z = prePoint.z + 2 * radius * Math.sin((s - preS) / radius / 2) * Math.sin(preS / radius + (s - preS) / radius / 2);

				centralPoints.push(new THREE.Vector3(x, y, z));
				leftPoints.push(new THREE.Vector3(x, y + this.width / 2, z));
				rightPoints.push(new THREE.Vector3(x, y - this.width / 2, z));

				preS = s;
				s += step;

			} while (s < Math.PI * 2 * radius + step);

			break;

		default:
			throw new Error('Invalid track type', this.type);
	}

	// get the end position considering start position and heading
	sevector.subVectors(centralPoints[centralPoints.length - 1], centralPoints[0]);
	sevector.applyAxisAngle(zvector, this.heading)
	this.endPosition = sevector.clone().add(centralPoints[0]).add(this.position);

	drawSphereAtPoint(this.endPosition)

	//drawCustomLine(centralPoints, 0xFF00000);
	//drawCustomLine(leftPoints, 0xFF6666);
	//drawCustomLine(rightPoints, 0x6666FF);

	return createCustomFaceGeometry(leftPoints, rightPoints);
};

TrackBuilder.Track.prototype.generateMesh = function() {

	return new THREE.Mesh(this.geometry, this.material);
};

TrackBuilder.Track.prototype.build = function(parent) {
	// body...
	parent.add(this.mesh);
};

TrackBuilder.Track.prototype.unbuild = function(parent) {
	// body...
	parent.remove(this.mesh);
	this.mesh.geometry.dispose();
	this.mesh.material.dispose();
};

TrackBuilder.Track.prototype.exportOBJ = function(filename) {
	// body...
	var exporter = new THREE.OBJExporter(targetEngineMatrix);
	var obj = exporter.parse(this.mesh);

	saveFile(obj, filename);
};

function cubicPolynomial(x, coefficients) {

	return coefficients.a + coefficients.b * x + coefficients.c * x * x + coefficients.d * x * x * x;
}

function easeInCubic(t) {

	 return t*t*t;
}

function easeOutCubic(t) {

	return (--t)*t*t +1;
}

function easeInOutCubic(t) {

	return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1;
}

TrackBuilder.Circuit = function() {

	this.constructionPosition = new THREE.Vector3();
	this.currentHeading = 0;
	this.elevation = 0;
	this.superelevation = 0;
	this.tracks = [];
	this.mesh = new THREE.Mesh();

	this.build();
}

TrackBuilder.Circuit.prototype.build = function() {
	// body...
	scene.add(this.mesh);
};

TrackBuilder.Circuit.prototype.buildTrack = function(trackdata) {
	// body...
	trackdata.position = this.constructionPosition.clone();
	trackdata.heading = this.currentHeading;

	var track = new TrackBuilder.Track(trackdata);
	track.mesh.position.set(this.constructionPosition.x, this.constructionPosition.y, this.constructionPosition.z);
	track.mesh.rotation.z = this.currentHeading;
	track.build(this.mesh);

	this.tracks.push(track);
	this.constructionPosition.set(track.endPosition.x, track.endPosition.y, track.endPosition.z);
	this.currentHeading = track.endHeading;
};

TrackBuilder.Circuit.prototype.undo = function() {
	// body...
	if (this.tracks.length) {
		var track = this.tracks.pop();
		this.constructionPosition.set(track.position.x, track.position.y, track.position.z);
		this.currentHeading = track.heading;
		track.unbuild(this.mesh);
	}
};

TrackBuilder.Circuit.prototype.exportOBJ = function() {
	// body...
	var exporter = new THREE.OBJExporter(targetEngineMatrix);
	var obj = exporter.parse(this.mesh);

	saveFile(obj, 'Circuit.obj');
};

TrackBuilder.UI = function(circuit) {
	
	this.circuit = circuit;
	this.defaultLine = TrackBuilder.DefaultTrack('line');
	this.defaultArc = TrackBuilder.DefaultTrack('arc');
	this.defaultLoop = TrackBuilder.DefaultTrack('loop');

	this.gui = new dat.GUI();
	this.mainMenu = {
		Line: ( function() { this.circuit.buildTrack(this.defaultLine); }.bind(this) ),
		Arc: ( function() { this.circuit.buildTrack(this.defaultArc); }.bind(this) ),
		Loop: ( function() { this.circuit.buildTrack(this.defaultLoop); }.bind(this) ),
		Undo: ( function() { this.circuit.undo(); }.bind(this) ),
		Export: ( function() {this.circuit.exportOBJ(); }.bind(this) ),
	}

	this.gui.add(this.mainMenu, 'Line');
	this.gui.add(this.mainMenu, 'Arc');
	this.gui.add(this.mainMenu, 'Loop');
	this.gui.add(this.mainMenu, 'Undo');

	this.configFolder = this.gui.addFolder('Custom Configurations');
	this.configMenu = {
		length: 10,
		width: 5,
		radius: 10,
		elevation: 'none',
		superelevation: 'none',
		steep: false,
		leftArc: false,
		leftLoop: false,
	}

	this.configFolder.add(this.configMenu, 'length', 1).step(0.1).onChange(function(value) {
		this.defaultLine.length = value;
		this.defaultArc.length = value;
	}.bind(this));
	this.configFolder.add(this.configMenu, 'width', 1, 16).step(0.1).onChange(function(value) {
		this.defaultLine.width = value;
		this.defaultArc.width = value;
		this.defaultLoop.width = value;
	}.bind(this));
	this.configFolder.add(this.configMenu, 'elevation', ['none', 'down', 'up']).onChange(function(value) {
		var elevation;
		switch (value) {
			case 'none':
				elevation = {a: 0, b: 0, c: 0, d: 0};
				break;
			case 'down':
				elevation = {a: 0, b: -0.1, c: 0, d: 0};
				break;
			case 'up':
				elevation = {a: 0, b: 0.1, c: 0, d: 0};
				break;
		}
		this.defaultLine.elevation = elevation;
		this.defaultArc.elevation = elevation;
	}.bind(this));
	this.configFolder.add(this.configMenu, 'superelevation', ['none', 'left', 'right']).onChange(function(value) {
		var superelevation;
		switch (value) {
			case 'none':
				superelevation = {a: 0, b: 0, c: 0, d: 0};
				break;
			case 'left':
				superelevation = {a: -Math.PI / 6, b: 0, c: 0, d: 0};
				break;
			case 'right':
				superelevation = {a: Math.PI / 6, b: 0, c: 0, d: 0};
				break;
		}
		this.defaultLine.superelevation = superelevation;
		this.defaultArc.superelevation = superelevation;
	}.bind(this));
	//this.configFolder.add(this.configMenu, 'steep').onChange(function(value) {
	//	if (value) {
	//		this.defaultLine.elevation.b *= 2;
	//		this.defaultArc.elevation.b *= 2;
	//	}
	//}.bind(this));
	this.configFolder.add(this.configMenu, 'radius', 0).onChange(function(value) {
		if (this.configMenu.leftArc) {
			this.defaultArc.curvature = 1 / value;
		} else {
			this.defaultArc.curvature = -1 / value;
		}
		if (this.configMenu.leftLoop) {
			this.defaultLoop.curvature = 1 / value;
		} else { 
			this.defaultLoop.curvature = -1 / value;
		}
		this.defaultArc.length = Math.PI / 4 * value;
	}.bind(this));
	this.configFolder.add(this.configMenu, 'leftArc').onChange(function(value) {
		if (value) {
			this.defaultArc.curvature = Math.abs(this.defaultArc.curvature);	
		} else {
			this.defaultArc.curvature = -Math.abs(this.defaultArc.curvature);
		}
	}.bind(this));
	this.configFolder.add(this.configMenu, 'leftLoop').onChange(function(value) {
		if (value) {
			this.defaultLoop.curvature = Math.abs(this.defaultLoop.curvature);
		} else {
			this.defaultLoop.curvature = -Math.abs(this.defaultLoop.curvature);
		}
	}.bind(this));

	this.gui.add(this.mainMenu, 'Export');
}

TrackBuilder.UI.prototype.method_name = function(first_argument) {
	// body...

};

var circuit = new TrackBuilder.Circuit();
var ui = new TrackBuilder.UI(circuit);
circuit.buildTrack({isTrasitional: true, elevation: {a: 1, b: -0.1, c: 0, d: 0}})
circuit.buildTrack({isTrasitional: false, elevation: {a: 0, b: -0.1, c: 0, d: 0}})
//circuit.buildTrack({elevation: {a: 0, b: 0, c: 0, d: 0}})
