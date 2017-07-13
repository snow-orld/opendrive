var targetEngineMatrix = new THREE.Matrix3();
targetEngineMatrix.set(-1,0,0, 0,0,1, 0,1,0);

var TrackBuilder = {};

TrackBuilder.DefaultTrack = function(type) {

	var defaultTrack = {
		s: 0,
		type: 'line',
		position: new THREE.Vector3(),
		heading: 0,
		length: 10,
		width: 11,
		curvature: 0,
		elevation: {a: 0, b: 0, c: 0, d: 0},
		superelevation: {a: 0, b: 0, c: 0, d: 0},
		isElevatedLocal: false,
	}

	if (type == 'arc') {
		defaultTrack.type = 'arc';
		defaultTrack.curvature = -1 / 10;
		defaultTrack.length = Math.PI / 2 * (1 / Math.abs(defaultTrack.curvature));
	}

	if (type == 'loop') {
		defaultTrack.type = 'loop';
		defaultTrack.curvature = -0.1;
		defaultTrack.length = Math.PI * 2 / Math.abs(defaultTrack.curvature);
	}

	return defaultTrack;
}

/*
* Initiate a new Track with given type (line or arc), length, width, isElevatedLocal, elevation and superelevation
*/
TrackBuilder.Track = function(data) {
	// body...

	this.s = data.s || 0;
	this.type = data.type || 'line';
	this.length = data.length || 10;
	this.width = data.width || 11;
	this.curvature = data.curvature || 0;
	this.elevation = JSON.parse(JSON.stringify(data.elevation)) || {a: 0, b: 0, c: 0, d: 0};
	this.superelevation = JSON.parse(JSON.stringify(data.superelevation)) || {a: 0, b: 0, c: 0, d: 0};
	this.isElevatedLocal = data.isElevatedLocal || false;

	this.position = data.position.clone() || new THREE.Vector3();
	this.heading = data.heading || 0;
	this.endPosition = new THREE.Vector3();
	this.endHeading = 0;
	this.endSuperelevation = 0;
	this.actualLength = 0;

	this.geometry = this.generateGeometry();
	this.material = new THREE.MeshBasicMaterial({color: 0xCFCFCF, side: THREE.DoubleSide});
	this.mesh = this.generateMesh();

	this.walls = this.generateWall();
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

	// h0 the height introduced by superelevation at S=0
	var h0 = this.width / 2 * Math.tan(Math.abs(this.superelevation.a));

	switch (this.type) {
		
		case 'line':
			do {

				if (s >= this.length) {
					s = this.length;
					this.endHeading = this.heading;
					this.endSuperelevation = cubicPolynomial(this.length, this.superelevation);
				}

				rollAngle = cubicPolynomial(s, this.superelevation);
				h = cubicPolynomial(s, this.elevation);

				h += this.width / 2 * Math.tan(Math.abs(rollAngle)) - h0;

				svector.set(1, 0, 0);
				tvector.set(0, 1, 0);
				tvector.applyAxisAngle(svector, rollAngle);
				if (this.isElevatedLocal)
					hvector = svector.clone().cross(tvector).multiplyScalar(h);
				else
					hvector.set(0, 0, h);

				centralPoints.push(svector.multiplyScalar(s).add(hvector).clone());
				leftPoints.push(tvector.clone().multiplyScalar(this.width / 2 / Math.cos(rollAngle)).add(svector));
				rightPoints.push(tvector.clone().multiplyScalar(- this.width / 2 / Math.cos(rollAngle)).add(svector));

				s += step;

			} while (s < this.length + step);
		
			break;
		
		case 'arc':

			radius = 1 / Math.abs(this.curvature);

			do {

				if (s >= this.length) {
					s = this.length;
					this.endHeading = this.heading + s * this.curvature;
					this.endSuperelevation = cubicPolynomial(this.length, this.superelevation);
				}

				rollAngle = cubicPolynomial(s, this.superelevation);
				h = cubicPolynomial(s, this.elevation);

				h += this.width / 2 * Math.tan(Math.abs(rollAngle)) - h0;

				svector.set(1, 0, 0); svector.applyAxisAngle(new THREE.Vector3(0, 0, 1), s * this.curvature);
				tvector.set(0, 1, 0); tvector.applyAxisAngle(new THREE.Vector3(0, 0, 1), s * this.curvature);
				tvector.applyAxisAngle(svector, rollAngle);
				if (this.isElevatedLocal)
					hvector = svector.clone().cross(tvector).multiplyScalar(h);
				else
					hvector.set(0, 0, h);

				if (s == 0) {
					centralPoints.push(new THREE.Vector3().add(hvector));
					leftPoints.push(tvector.clone().multiplyScalar(this.width / 2 / Math.cos(rollAngle)).add(hvector));
					rightPoints.push(tvector.clone().multiplyScalar(-this.width / 2 / Math.cos(rollAngle)).add(hvector));
					s += step;
					continue;
				}

				prePoint = centralPoints[centralPoints.length - 1];
				x = prePoint.x + 2 * radius * Math.sin((s - preS) / radius / 2) * Math.cos(preS * this.curvature + (s - preS) * this.curvature / 2);
				y = prePoint.y + 2 * radius * Math.sin((s - preS) / radius / 2) * Math.sin(preS * this.curvature + (s - preS) * this.curvature / 2);
				z = 0;

				svector.set(x, y, z).add(hvector);
				centralPoints.push(svector.clone());
				leftPoints.push(tvector.clone().multiplyScalar(this.width / 2 / Math.cos(rollAngle)).add(svector));
				rightPoints.push(tvector.clone().multiplyScalar(-this.width / 2 / Math.cos(rollAngle)).add(svector));

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

	this.centralPoints = centralPoints;
	this.leftPoints = leftPoints;
	this.rightPoints = rightPoints;

	return createCustomFaceGeometry(leftPoints, rightPoints);
};

TrackBuilder.Track.prototype.generateMesh = function() {

	return new THREE.Mesh(this.geometry, this.material);
};

TrackBuilder.Track.prototype.generateWall = function() {
	// body...

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

function easeInOutCubic(t) {

	return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1;
}

TrackBuilder.Circuit = function() {

	this.constructionPosition = new THREE.Vector3();
	this.currentHeading = 0;
	this.currentS = 0;
	this.elevation = 0;
	this.superelevation = 0;
	this.tracks = [];
	this.mesh = new THREE.Mesh();

	this.bound = {we: 300, sn: 200, bottomRight: new THREE.Vector3(), bottomLeft: new THREE.Vector3(-300, 0, 0), topRight: new THREE.Vector3(0, 200, 0), topLeft: new THREE.Vector3(-300, 200, 0)};

	this.build();
	this.showBound();
}

TrackBuilder.Circuit.prototype.build = function() {
	// body...
	scene.add(this.mesh);
};

TrackBuilder.Circuit.prototype.buildTrack = function(trackdata) {
	// body...
	trackdata.s = this.currentS;
	trackdata.position = this.constructionPosition.clone();
	trackdata.heading = this.currentHeading;

	var track = new TrackBuilder.Track(trackdata);
	track.mesh.position.set(this.constructionPosition.x, this.constructionPosition.y, this.constructionPosition.z);
	track.mesh.rotation.z = this.currentHeading;
	track.build(this.mesh);

	this.tracks.push(track);
	this.constructionPosition.set(track.endPosition.x, track.endPosition.y, track.endPosition.z);
	this.currentHeading = track.endHeading;
	this.currentS = track.s + track.length;
	this.superelevation = track.endSuperelevation;
};

TrackBuilder.Circuit.prototype.undo = function() {
	// body...
	if (this.tracks.length) {
		var track = this.tracks.pop();
		this.constructionPosition.set(track.position.x, track.position.y, track.position.z);
		this.currentHeading = track.heading;
		this.currentS = track.s;
		//this.superelevation = this.tracks.length ? cubicPolynomial(this.tracks[this.tracks.length - 1].length, this.tracks[this.tracks.length - 1].superelevation) : 0;
		this.superelevation = track.superelevation.a;
		track.unbuild(this.mesh);
	}
};

TrackBuilder.Circuit.prototype.showBound = function() {
	// body...
	var material = new THREE.MeshBasicMaterial({color: 0xFF6666});

	var geometryr = new THREE.Geometry();
	geometryr.vertices = [this.bound.bottomRight, this.bound.topRight];
	this.bound.rightBound = new THREE.Line(geometryr, material);

	var geometryt = new THREE.Geometry();
	geometryt.vertices = [this.bound.topRight, this.bound.topLeft];
	this.bound.topBound = new THREE.Line(geometryt, material);

	var geometryl = new THREE.Geometry();
	geometryl.vertices = [this.bound.topLeft, this.bound.bottomLeft];
	this.bound.leftBound = new THREE.Line(geometryl, material);

	var geometryb = new THREE.Geometry();
	geometryb.vertices = [this.bound.bottomLeft, this.bound.bottomRight];
	this.bound.bottomBound = new THREE.Line(geometryb, material);

	scene.add(this.bound.rightBound);
	scene.add(this.bound.topBound);
	scene.add(this.bound.leftBound);
	scene.add(this.bound.bottomBound);
};

TrackBuilder.Circuit.prototype.refreshBound = function() {
	// body...
	scene.remove(this.bound.rightBound);
	scene.remove(this.bound.topBound);
	scene.remove(this.bound.leftBound);
	scene.remove(this.bound.bottomBound);

	this.bound.rightBound.geometry.dispose();
	this.bound.rightBound.material.dispose();
	this.bound.topBound.geometry.dispose();
	this.bound.topBound.material.dispose();
	this.bound.leftBound.geometry.dispose();
	this.bound.leftBound.material.dispose();
	this.bound.bottomBound.geometry.dispose();
	this.bound.bottomBound.material.dispose();

	this.showBound();
};

TrackBuilder.Circuit.prototype.autoClose = function() {
	// body...
	var current = this.constructionPosition;
	var track = new TrackBuilder.DefaultTrack('line');
	track.length = current.distanceTo(new THREE.Vector3());
	this.currentHeading = current.angleTo(current.x < 0 ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(1, 0, 0));
	if (current.y > 0)
		this.currentHeading *= -1;
	if (current.x > 0)
		this.currentHeading = Math.PI - this.currentHeading;
	this.buildTrack(track);
};

TrackBuilder.Circuit.prototype.exportOBJ = function() {
	// body...
	//if (!this.mesh || !this.mesh.length) return;

	var exporter = new THREE.OBJExporter(targetEngineMatrix);
	var obj = exporter.parse(this.mesh);

	saveFile(obj, 'Circuit.obj');
};

TrackBuilder.Circuit.prototype.superelevationInDegree = function() {
	// body...
	console.log(this.superelevation * 180 / Math.PI);
};

TrackBuilder.UI = function(circuit) {
	
	this.circuit = circuit;
	this.defaultLine = new TrackBuilder.DefaultTrack('line');
	this.defaultArc = new TrackBuilder.DefaultTrack('arc');
	this.defaultLoop = new TrackBuilder.DefaultTrack('loop');
	this.bound = new THREE.Mesh();

	this.gui = new dat.GUI({width: 310});
	this.mainMenu = {
		Line: ( function() { this.circuit.buildTrack(this.defaultLine); }.bind(this) ),
		Arc: ( function() { this.circuit.buildTrack(this.defaultArc); }.bind(this) ),
		Loop: ( function() { this.circuit.buildTrack(this.defaultLoop); }.bind(this) ),
		Close: ( function() { this.circuit.autoClose(); }.bind(this)),
		Undo: ( function() { this.circuit.undo(); }.bind(this) ),
		Export: ( function() {this.circuit.exportOBJ(); }.bind(this) ),
	}

	this.gui.add(this.mainMenu, 'Line');
	this.gui.add(this.mainMenu, 'Arc');
	this.gui.add(this.mainMenu, 'Loop');
	this.gui.add(this.mainMenu, 'Close');
	this.gui.add(this.mainMenu, 'Undo');

	this.boundFolder = this.gui.addFolder('Circuit Boundary');
	this.boundMenu = {
		we: 300,
		sn: 200,
		bottomRightX: 0,
		bottomRightY: 0,
		bottomRightZ: 0, 
	}
	this.boundFolder.add(this.boundMenu, 'we').onChange(function(value) {
		this.circuit.bound.we = value;
		this.circuit.bound.bottomLeft.x = this.circuit.bound.bottomRight.x - value;
		this.circuit.bound.topLeft.x = this.circuit.bound.topRight.x - value;
		this.circuit.refreshBound();
	}.bind(this));
	this.boundFolder.add(this.boundMenu, 'sn').onChange(function(value) {
		this.circuit.bound.sn = value;
		this.circuit.bound.topRight.y = this.circuit.bound.bottomRight.y + value;
		this.circuit.bound.topLeft.y = this.circuit.bound.bottomLeft.y + value;
		this.circuit.refreshBound();
	}.bind(this));
	this.boundFolder.add(this.boundMenu, 'bottomRightX').step(0.01).onChange(function(value) {
		this.circuit.bound.bottomRight.x = value;
		this.circuit.bound.topRight.x = value;
		this.circuit.bound.bottomLeft.x = value - this.circuit.bound.we;
		this.circuit.bound.topLeft.x = value - this.circuit.bound.we;
		this.circuit.refreshBound();
	}.bind(this));
	this.boundFolder.add(this.boundMenu, 'bottomRightY').step(0.01).onChange(function(value) {
		this.circuit.bound.bottomRight.y = value;
		this.circuit.bound.bottomLeft.y = value;
		this.circuit.bound.topRight.y = value + this.circuit.bound.sn;
		this.circuit.bound.topLeft.y = value + this.circuit.bound.sn;
		this.circuit.refreshBound();
	}.bind(this));

	this.configFolder = this.gui.addFolder('Custom Configurations');
	this.configMenu = {
		lineLength: 10,
		width: 11,
		radius: 10,
		arcAngle: 90,
		elevationA: 0,
		elevationB: 0,
		superelevationA: 0,
		superelevationB: 0,
		leftArc: false,
		leftLoop: false,
		elevationEase: 'none',
		superelevationEase: 'inout',
	}

	this.configFolder.add(this.configMenu, 'lineLength', 0).step(0.01).onChange(function(value) {
		this.defaultLine.length = value;
		this.updateElevation();
		this.updateSuperelevation();
	}.bind(this));
	this.configFolder.add(this.configMenu, 'width', 1, 16).step(0.1).onChange(function(value) {
		this.defaultLine.width = value;
		this.defaultArc.width = value;
		this.defaultLoop.width = value;
	}.bind(this));
	this.configFolder.add(this.configMenu, 'radius', 0).step(0.01).onChange(function(value) {
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
		this.defaultArc.length = Math.PI / 180 * this.configMenu.arcAngle * value;
		this.updateElevation();
		this.updateSuperelevation();
	}.bind(this));
	this.configFolder.add(this.configMenu, 'arcAngle').step(0.1).onChange(function(value) {
		this.defaultArc.length = Math.PI / 180 * value / Math.abs(this.defaultArc.curvature);
		this.updateElevation();
		this.updateSuperelevation();
	}.bind(this));
	this.configFolder.add(this.configMenu, 'elevationA').step(0.000000001).onChange(function(value) {
		this.updateElevation();
	}.bind(this));
	this.configFolder.add(this.configMenu, 'elevationB').step(0.000000001).onChange(function(value) {
		this.updateElevation();
	}.bind(this));
	this.configFolder.add(this.configMenu, 'superelevationA').step(0.000000001).onChange(function(value) {
		this.updateSuperelevation();
	}.bind(this));
	this.configFolder.add(this.configMenu, 'superelevationB').step(0.000000001).onChange(function(value) {
		this.updateSuperelevation();
	}.bind(this));
	this.configFolder.add(this.configMenu, 'elevationEase', ['none', 'inout', 'in', 'out']).onChange(function(value) {
		this.updateElevation();
	}.bind(this));
	this.configFolder.add(this.configMenu, 'superelevationEase', ['inout', 'none', 'in', 'out']).onChange(function(value) {
			this.updateSuperelevation();
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

TrackBuilder.UI.prototype.updateElevation = function() {
	// body...
	this.defaultLine.elevation.a = this.configMenu.elevationA;
	this.defaultArc.elevation.a = this.configMenu.elevationA;
	if (this.configMenu.elevationEase == 'none') {
		this.defaultLine.elevation.b = this.configMenu.elevationB;
		this.defaultLine.elevation.c = this.defaultLine.elevation.d = 0;
		this.defaultArc.elevation.b = this.configMenu.elevationB;
		this.defaultArc.elevation.c = this.defaultArc.elevation.d = 0;
	} else if (this.configMenu.elevationEase == 'in') {
		this.defaultLine.elevation.b = 0;
		this.defaultLine.elevation.c = 2 * this.configMenu.elevationB / this.defaultLine.length;
		this.defaultLine.elevation.d = - this.configMenu.elevationB / Math.pow(this.defaultLine.length, 2);
		this.defaultArc.elevation.b = 0;
		this.defaultArc.elevation.c = 2 * this.configMenu.elevationB / this.defaultArc.length;
		this.defaultArc.elevation.d = - this.configMenu.elevationB / Math.pow(this.defaultArc.length, 2);
	} else if (this.configMenu.elevationEase == 'out') {
		this.defaultLine.elevation.b = this.configMenu.elevationB;
		this.defaultLine.elevation.c = this.configMenu.elevationB / this.defaultLine.length;
		this.defaultLine.elevation.d = - this.configMenu.elevationB / Math.pow(this.defaultLine.length, 2);
		this.defaultArc.elevation.b = this.configMenu.elevationB;
		this.defaultArc.elevation.c = this.configMenu.elevationB / this.defaultArc.length;
		this.defaultArc.elevation.d = - this.configMenu.elevationB / Math.pow(this.defaultArc.length, 2);
	} else if (this.configMenu.elevationEase == 'inout') {
		this.defaultLine.elevation.b = 0;
		this.defaultLine.elevation.c = 3 * this.configMenu.elevationB / this.defaultLine.length;
		this.defaultLine.elevation.d = -2 * this.configMenu.elevationB / Math.pow(this.defaultLine.length, 2);
		this.defaultArc.elevation.b = 0;
		this.defaultArc.elevation.c = 3 * this.configMenu.elevationB / this.defaultArc.length;
		this.defaultArc.elevation.d = -2 * this.configMenu.elevationB / Math.pow(this.defaultArc.length, 2);
	}

};

TrackBuilder.UI.prototype.updateSuperelevation = function() {
	// body...
	this.defaultLine.superelevation.a = Math.PI / 180 * this.configMenu.superelevationA;
	this.defaultArc.superelevation.a = Math.PI / 180 * this.configMenu.superelevationA;
	if (this.configMenu.superelevationEase == 'none') {
		this.defaultLine.superelevation.b = Math.PI / 180 * this.configMenu.superelevationB;
		this.defaultLine.superelevation.c = this.defaultLine.superelevation.d = 0;
		this.defaultArc.superelevation.b = Math.PI / 180 * this.configMenu.superelevationB;
		this.defaultArc.superelevation.c = this.defaultArc.superelevation.d = 0;
	} else if (this.configMenu.superelevationEase == 'in') {
		this.defaultLine.superelevation.b = 0;
		this.defaultLine.superelevation.c = 2 * Math.PI / 180 * this.configMenu.superelevationB / this.defaultLine.length;
		this.defaultLine.superelevation.d = - Math.PI / 180 * this.configMenu.superelevationB / Math.pow(this.defaultLine.length, 2);
		this.defaultArc.superelevation.b = 0;
		this.defaultArc.superelevation.c = 2 * Math.PI / 180 * this.configMenu.superelevationB / this.defaultArc.length;
		this.defaultArc.superelevation.d = - Math.PI / 180 * this.configMenu.superelevationB / Math.pow(this.defaultArc.length, 2);
	} else if (this.configMenu.superelevationEase == 'out') {
		this.defaultLine.superelevation.b =  Math.PI / 180 * this.configMenu.superelevationB;
		this.defaultLine.superelevation.c =  Math.PI / 180 * this.configMenu.superelevationB / this.defaultLine.length;
		this.defaultLine.superelevation.d = - Math.PI / 180 * this.configMenu.superelevationB / Math.pow(this.defaultLine.length, 2);
		this.defaultArc.superelevation.b =  Math.PI / 180 * this.configMenu.superelevationB;
		this.defaultArc.superelevation.c =  Math.PI / 180 * this.configMenu.superelevationB / this.defaultArc.length;
		this.defaultArc.superelevation.d = - Math.PI / 180 * this.configMenu.superelevationB / Math.pow(this.defaultArc.length, 2);
	} else if (this.configMenu.superelevationEase == 'inout') {
		this.defaultLine.superelevation.b = 0;
		this.defaultLine.superelevation.c = 3 * Math.PI / 180 * this.configMenu.superelevationB / this.defaultLine.length;
		this.defaultLine.superelevation.d = -2 * Math.PI / 180 * this.configMenu.superelevationB / Math.pow(this.defaultLine.length, 2);
		this.defaultArc.superelevation.b = 0;
		this.defaultArc.superelevation.c = 3 * Math.PI / 180 * this.configMenu.superelevationB / this.defaultArc.length;
		this.defaultArc.superelevation.d = -2 * Math.PI / 180 * this.configMenu.superelevationB / Math.pow(this.defaultArc.length, 2);
	}
};

TrackBuilder.kartUI = function(circuit) {

	this.circuit = circuit;
	
	this.arc = TrackBuilder.DefaultTrack('arc');
	this.angle = Math.PI / 2;
	
	this.circle = TrackBuilder.DefaultTrack('arc');
	this.circle.curvature = 1 / 35;
	this.circle.length = Math.PI * 2 * (1 / Math.abs(this.circle.curvature));
	this.circle.elevation = {a: 0, b: 20 / this.circle.length, c: 0, d: 0};
	this.angle = Math.PI * 2;

	this.indexMenu = {
		Undo: ( function() { this.circuit.undo(); }.bind(this) ),
		Export: ( function() {this.circuit.exportOBJ(); }.bind(this) ),
	}

	this.arcMenu = {
		Width: 11,
		Center_Radius: 25,
		Central_Angle_in_Degree: 90,
		Build: ( function() { this.circuit.buildTrack(this.arc); }.bind(this) ),
	}

	this.circleMenu = {
		Width: 11,
		Center_Radius: 35,
		Central_Angle_in_Degree: 360,
		Height_Difference: 20,
		Build: ( function() { this.circuit.buildTrack(this.circle); }.bind(this) ),
	}

	this.uturnMenu = {
		Width: 11,
		Center_Radius: 35,
		Superelevation_in_Degree: 4,
		Transition_Line_Length: 5,
		Build: ( function() { }.bind(this) ),
	}
	
	// main menu
	this.gui = new dat.GUI({width: 400});
	this.arcFolder = this.gui.addFolder('Arc');
	this.circleFolder = this.gui.addFolder('Elevated Circle');
	this.uturnFolder = this.gui.addFolder('Uturn');
	this.gui.add(this.indexMenu, 'Undo');
	this.gui.add(this.indexMenu, 'Export');

	// arc folder
	this.arcFolder.open();
	this.arcFolder.add(this.arcMenu, 'Width').onChange( function(value) {
		this.arc.width = value;
	}.bind(this) );
	this.arcFolder.add(this.arcMenu, 'Center_Radius').onChange( function(value) {
		this.arc.curvature = 1 / value;
		this.arc.length = this.angle * value;
	}.bind(this) );
	this.arcFolder.add(this.arcMenu, 'Central_Angle_in_Degree').onChange( function(value) {
		this.arc.angle = value * Math.PI / 180;
		this.arc.length = 1 / Math.abs(this.curvature) * this.angle;
	}.bind(this) );
	this.arcFolder.add(this.arcMenu, 'Build');

	// elevated circle folder
	this.circleFolder.open();
	this.circleFolder.add(this.circleMenu, 'Width').onChange( function(value) {
		this.circle.width = value;
	}.bind(this) );
	this.circleFolder.add(this.circleMenu, 'Center_Radius').onChange( function(value) {
		this.circle.curvature = 1 / value;
		this.circle.length = this.angle * value;
	}.bind(this) );
	this.circleFolder.add(this.circleMenu, 'Central_Angle_in_Degree').onChange( function(value) {
		this.circle.angle = value * Math.PI / 180;
		this.circle.length = 1 / Math.abs(this.circle.curvature) * this.circle.angle;
	}.bind(this) );
	this.circleFolder.add(this.circleMenu, 'Height_Difference').onChange( function(value) {
		this.circle.elevation = {a: 0, b: value / this.circle.length, c: 0, d: 0};
	}.bind(this) );
	this.circleFolder.add(this.circleMenu, 'Build');

	// uturn folder
	this.uturnFolder.open();

}

TrackBuilder.kartUI.prototype.method_name = function(first_argument) {
	// body...
};

var circuit = new TrackBuilder.Circuit();
var ui = new TrackBuilder.UI(circuit);
//var kartUI = new TrackBuilder.kartUI(circuit);

// component of Kart Project
// var track1 = new TrackBuilder.DefaultTrack('line');
// track1.length = 200; track1.elevation = {a: 0, b: track1.width / 2 * Math.sin(30 * Math.PI / 180) / 200, c: 0, d: 0}; track1.superelevation = {a: 0, b: -30 * Math.PI / 180 / 200, c: 0, d: 0};
// circuit.buildTrack(track1);

// var track2 = new TrackBuilder.DefaultTrack('arc');
// track2.curvature = 1 / 35; track2.length =  Math.PI * 35; track2.superelevation = {a: -30 * Math.PI / 180, b: 0, c: 0, d: 0};
// circuit.buildTrack(track2);

// var track3 = new TrackBuilder.DefaultTrack('line');
// track3.length = 200; track3.elevation = {a: 0, b: - track3.width / 2 * Math.sin(30 * Math.PI / 180) / 200, c: 0, d: 0};track3.superelevation = {a: -30 * Math.PI / 180, b: 30 * Math.PI / 180 / 200, c: 0, d: 0}
// circuit.buildTrack(track3)

// var track4 = new TrackBuilder.DefaultTrack('line');
// track4.length = 10; 
// track4.elevation = {a: 0, b: track4.width / 2 * Math.sin(4 * Math.PI / 180) / 10, c: 0, d: 0};
// track4.superelevation = {a: 0, b: -4 * Math.PI / 180 / 10, c: 0, d: 0};
// circuit.buildTrack(track4);

// var track5 = new TrackBuilder.DefaultTrack('line');
// track5.length = 10; track5.superelevation = {a: -4 * Math.PI / 180, b: 0, c: 0, d: 0};
// circuit.buildTrack(track5);

// var track6 = new TrackBuilder.DefaultTrack('line');
// track6.length = 10; 
// track6.elevation = {a: 0, b: - track6.width / 2 * Math.sin(4 * Math.PI / 180) / 10, c: 0, d: 0};
// track6.superelevation = {a: -4 * Math.PI / 180, b: 4 * Math.PI / 180 / 10, c: 0, d: 0};
// circuit.buildTrack(track6);
