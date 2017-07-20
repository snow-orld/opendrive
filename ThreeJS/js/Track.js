var targetEngineMatrix = new THREE.Matrix3();
targetEngineMatrix.set(-1,0,0, 0,0,1, 0,1,0);

xvector = new THREE.Vector3(1,0,0)
yvector = new THREE.Vector3(0,1,0)
zvector = new THREE.Vector3(0,0,1)

var TrackBuilder = {};

TrackBuilder.DefaultTrack = function(type) {

	var defaultTrack = {
		s: 0,
		type: 'line',
		position: new THREE.Vector3(),
		heading: 0,
		length: 20,
		width: 11,
		curvature: 0,
		elevation: {a: 0, b: 0, c: 0, d: 0},
		superelevation: {a: 0, b: 0, c: 0, d: 0},
		isElevatedLocal: false,
		startSlope: 0,
		endSlope: 0,
		startSup: 0,
		endSup: 0,
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

	if (type == 'clothoid') {
		defaultTrack.type = 'clothoidTurn';
		defaultTrack.fullAngle = 90;
		defaultTrack.halfwayRadius = 10;
		defaultTrack.length = Math.PI / 2 * 10;
	}

	return defaultTrack;
}

// track built in hermite methods
TrackBuilder.DefaultTrack2 = function(type) {

	var defaultTrack = {
		s: 0,
		type: 'clothoidTurn',
		subtype: 'fullTurn',
		position: new THREE.Vector3(),
		heading: 0,
		length: 72,
		width: 11,
		halfwayRadius: 28.5,
		nextPoint: new THREE.Vector3(),
		startHandleScale: 5,
		endHandleScale: 1,
		slope: 0,
		startSlope: 0,
		endSlope: 0,
		supDiff: 0,
		endSupRate: 0,
		startSup: 0,
		endSup: 0,
		supAxis: 'central',
	}

	if (type == 'hermite') {
		defaultTrack.type = 'hermite';
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
	this.subtype = data.subtype;
	this.length = data.length || 10;
	this.width = data.width || 11;
	this.curvature = data.curvature || 0;
	this.elevation = data.elevation? JSON.parse(JSON.stringify(data.elevation)) : {a: 0, b: 0, c: 0, d: 0};
	this.superelevation = data.superelevation ? JSON.parse(JSON.stringify(data.superelevation)) : {a: 0, b: 0, c: 0, d: 0};
	this.isElevatedLocal = data.isElevatedLocal || false;

	this.position = data.position.clone() || new THREE.Vector3();
	this.heading = data.heading || 0;
	this.endPositionC = new THREE.Vector3();
	this.endPositionL = new THREE.Vector3();
	this.endPositionR = new THREE.Vector3();
	this.endHeading = 0;
	this.endSuperelevation = 0;
	this.actualLength = 0;

	// for DefaultTrack2
	this.halfwayRadius = data.halfwayRadius;
	this.nextPoint = data.nextPoint ? data.nextPoint.clone() : new THREE.Vector3();
	this.startHandleScale = data.startHandleScale;
	this.endHandleScale = data.endHandleScale;
	this.slope = data.slope;
	this.startSlope = data.startSlope;
	this.endSlope = data.endSlope;
	this.startSup = data.startSup;
	this.endSup = data.endSup;
	this.supAxis = data.supAxis;
	this.supDiff = data.supDiff;
	// end

	this.geometry = this.generateGeometry();
	this.material = new THREE.MeshBasicMaterial({color: 0xCFCFCF, side: THREE.DoubleSide});
	this.mesh = this.generateMesh();

	this.meshShown = true;

	this.walls = this.generateWall();
};

TrackBuilder.Track.prototype.generateGeometry = function() {
	// body...
	var centralPoints = [];
	var leftPoints = [];
	var rightPoints = [];

	var svector = new THREE.Vector3(), tvector = new THREE.Vector3(), hvector = new THREE.Vector3();
	var zvector = new THREE.Vector3(0, 0, 1), sevector = new THREE.Vector3();
	var s = 0, preS = 0, prePoint, x, y, z, radius, curvature;
	var rollAngle, h = 0;
	var k, slope;
	var step = 1;

	// h0 the height introduced by superelevation at S=0
	var h0 = this.width / 2 * Math.tan(Math.abs(this.startSup));

	switch (this.type) {
		
		case 'line':
			do {

				if (s >= this.length) {
					s = this.length;
					this.endHeading = this.heading;
					this.endSuperelevation = cubicPolynomial(this.length, this.superelevation);
				}

				k = (this.endSlope - this.startSlope) / this.length;
				slope = this.startSlope + k * preS;
				h += (s - preS) * slope;

				rollAngle = this.startSup + s * (this.endSup - this.startSup) / this.length;

				// rollAngle = cubicPolynomial(s, this.superelevation);
				// h = cubicPolynomial(s, this.elevation);

				// h += this.width / 2 * ( Math.tan(Math.abs(this.endSup)) - Math.tan(Math.abs(this.startSup)) ) / this.length * s - h0;

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

				preS = s;
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

				k = (this.endSlope - this.startSlope) / this.length;
				slope = this.startSlope + k * preS;
				h += (s - preS) * slope;

				rollAngle = this.startSup + s * (this.endSup - this.startSup) / this.length;

				// rollAngle = cubicPolynomial(s, this.superelevation);
				// h = cubicPolynomial(s, this.elevation);

				//h += this.width / 2 * Math.tan(Math.abs(rollAngle)) - h0;

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

		case 'clothoidTurn':

			var halfCnt = 0;
			var fullLength = this.subtype == 'fullTurn'? this.length : this.length / 2;
			var centralPoint, leftPoint, rightPoint, deltaZ;

			this.superelevation.a = this.startSup;
			this.superelevation.b = 0;
			this.superelevation.c = 3 * (this.endSup - this.startSup) / Math.pow(this.length, 2);
			this.superelevation.d = -2 * (this.endSup - this.startSup) / Math.pow(this.length, 3);

			var theta = 0, currentHeading = 0;
			var k = (1 / this.halfwayRadius - 0) * 2 / this.length;

			if (this.subtype != 'lastHalf') {
				do {
					if (s == 0) {
						centralPoint = new THREE.Vector3();
						rightPoint = new THREE.Vector3(0, - this.width / 2, -this.width / 2 * Math.tan(this.startSup));
						leftPoint = new THREE.Vector3(0, this.width / 2, this.width / 2 * Math.tan(this.startSup));
						deltaZ = this.width / 2 * Math.tan(this.startSup);

						centralPoints.push(centralPoint);
						rightPoints.push(rightPoint);
						leftPoints.push(leftPoint);

						s += step;
						continue;
					}
					
					if (Math.abs(s - this.length / 2) < 1E-4 || s >  this.length / 2) s = this.length / 2;

					curvature = (s + preS) * 0.5 * k + 0;
					prePoint = centralPoints[centralPoints.length - 1];

					currentHeading = s < this.length / 2 ? theta + curvature * (s - preS) : theta + curvature * (s - preS) / 2;

					slope = this.startSlope + ((this.endSlope - this.startSlope) / fullLength) * preS;
					h += (s - preS) * slope;
					// rollAngle = this.startSup + s * (this.endSup - this.startSup) / this.length;

					// svector.set(1,0,slope).normalize().applyAxisAngle(zvector, currentHeading);
					// tvector.set(0,1,0).applyAxisAngle(zvector, currentHeading);
					// tvector.applyAxisAngle(svector, rollAngle);
					
					x = prePoint.x + (s - preS) * Math.cos(theta + curvature * (s - preS) / 2);
					y = prePoint.y + (s - preS) * Math.sin(theta + curvature * (s - preS) / 2);
					z = h;

					centralPoint = new THREE.Vector3(x, y, z);
					leftPoint = new THREE.Vector3(x + this.width / 2 * Math.cos(currentHeading + Math.PI / 2), y + this.width / 2 * Math.sin(currentHeading + Math.PI / 2), z);
					rightPoint = new THREE.Vector3(x + this.width / 2 * Math.cos(currentHeading - Math.PI / 2), y + this.width / 2 * Math.sin(currentHeading - Math.PI / 2), z);
					
					deltaZ = s * (( Math.tan(this.endSup) - Math.tan(this.startSup) ) * this.width / 2 / fullLength) + this.width / 2 * Math.tan(this.startSup);
					// deltaZ = Math.tan(rollAngle) * this.width / 2;

					if (this.supAxis == 'central') {
						leftPoint.z += deltaZ;
						rightPoint.z -= deltaZ;
					} else if (this.supAxis == 'left') {
						leftPoint.z -= h0;
						centralPoint.z -= deltaZ + h0;
						rightPoint.z -= 2 * deltaZ + h0;
					} else if (this.supAxis == 'right') {
						rightPoint.z -= h0;
						centralPoint.z +=  deltaZ + h0;
						leftPoint.z += 2 * deltaZ + h0;
					}

					// svector.set(x, y, z);
					// centralPoint = svector.clone();
					// leftPoint = tvector.clone().multiplyScalar(this.width / 2 / Math.cos(rollAngle)).add(svector);
					// rightPoint = tvector.clone().multiplyScalar(-this.width / 2 / Math.cos(rollAngle)).add(svector);
			
					// if (this.supAxis != 'central') {
					// 	leftPoint.z += h0;
					// 	rightPoint.z += h0;
					// 	centralPoint.z += h0;
					// }

					centralPoints.push(centralPoint);
					leftPoints.push(leftPoint);
					rightPoints.push(rightPoint);

					if (s < this.length / 2) {
						theta += curvature * (s - preS);
					} else {
						theta += curvature * (s - preS) / 2;
					}
					preS = s;
					s += step;

				} while(s < this.length / 2 + step);

				halfCnt++;
			}

			k *= -1;
			s = preS = 0;
			if (this.subtype != 'firstHalf') {
				
				do {
					
					if (s == 0) {
						
						if (this.subtype == 'lastHalf') {
							centralPoint = new THREE.Vector3();
							rightPoint = new THREE.Vector3(0, - this.width / 2, -this.width / 2 * Math.tan(this.startSup));
							leftPoint = new THREE.Vector3(0, this.width / 2, this.width / 2 * Math.tan(this.startSup));
							deltaZ = this.width / 2 * Math.tan(this.startSup);

							centralPoints.push(centralPoint);
							rightPoints.push(rightPoint);
							leftPoints.push(leftPoint);
						}
						
						s += step;
						continue;
					}

					slope = this.startSlope + ((this.endSlope - this.startSlope) / fullLength) * (preS + halfCnt * this.length / 2);
					h += (s - preS) * slope;

					if (Math.abs(s - this.length / 2) < 1E-4 || s > this.length / 2) s = this.length / 2;

					curvature = (s + preS) * 0.5 * k + 1 / this.halfwayRadius;
					prePoint = centralPoints[centralPoints.length - 1];
					// rollAngle = this.startSup + (s + this.length / 2) * (this.endSup - this.startSup) / this.length;
					
					currentHeading = s < this.length / 2 ? theta + curvature * (s - preS) : theta + curvature * (s - preS) / 2;
					
					// svector.set(1,0,slope).normalize().applyAxisAngle(zvector, currentHeading);
					// tvector.set(0,1,0).applyAxisAngle(zvector, currentHeading);
					// tvector.applyAxisAngle(svector, rollAngle);

					x = prePoint.x + (s - preS) * Math.cos(theta + curvature * (s - preS) / 2);
					y = prePoint.y + (s - preS) * Math.sin(theta + curvature * (s - preS) / 2);
					z = h;

					centralPoint = new THREE.Vector3(x, y, z);
					leftPoint = new THREE.Vector3(x + this.width / 2 * Math.cos(currentHeading + Math.PI / 2), y + this.width / 2 * Math.sin(currentHeading + Math.PI / 2), z);
					rightPoint = new THREE.Vector3(x + this.width / 2 * Math.cos(currentHeading - Math.PI / 2), y + this.width / 2 * Math.sin(currentHeading - Math.PI / 2), z);
					
					deltaZ = (s + halfCnt * this.length / 2) * (( Math.tan(this.endSup) - Math.tan(this.startSup) ) * this.width / 2 / fullLength) + this.width / 2 * Math.tan(this.startSup);
					// deltaZ = Math.tan(rollAngle) * this.width / 2;

					if (s == this.length / 2) {
						deltaZ = this.width / 2 * Math.tan(this.endSup);
					}

					if (this.supAxis == 'central') {
						leftPoint.z += deltaZ;
						rightPoint.z -= deltaZ;
					} else if (this.supAxis == 'left') {
						leftPoint.z -= h0;
						centralPoint.z -= deltaZ + h0;
						rightPoint.z -= 2 * deltaZ + h0;
					} else if (this.supAxis == 'right') {
						centralPoint.z +=  deltaZ;
						leftPoint.z += 2 * deltaZ;
					}

					// centralPoint = new THREE.Vector3(x, y, z);
					// leftPoint = tvector.clone().multiplyScalar(this.width / 2 / Math.cos(rollAngle)).add(centralPoint);
					// rightPoint = tvector.clone().multiplyScalar(-this.width / 2 / Math.cos(rollAngle)).add(centralPoint);

					// if (this.supAxis != 'central') {
					// 	leftPoint.z += h0;
					// 	rightPoint.z += h0;
					// 	centralPoint.z += h0;
					// }

					centralPoints.push(centralPoint);
					leftPoints.push(leftPoint);
					rightPoints.push(rightPoint);

					if (s < this.length / 2) {
						theta += curvature * (s - preS);
					} else {
						theta += curvature * (s - preS) / 2;
					}
					preS = s;
					s += step;

				} while(s < this.length / 2 + step);
			}

			this.endHeading = this.heading + theta;
			// var p0 = centralPoints[centralPoints.length - 2].clone()
			// var p1 = centralPoints[centralPoints.length - 1].clone()
			// var v = new THREE.Vector3().subVectors(p1, p0)
			// var heading = v.angleTo(xvector);
			// if (v.y < 0) heading = Math.PI * 2 - heading;
			// console.log('clothoid end heading', heading)
			break;

		case 'hermite':

			var s;
			var p0, s0, p1, s1;
			var planS0, planS1;
			var oDistance = this.position.distanceTo(this.nextPoint);

			s0 = new THREE.Vector3(1,0,this.startSlope).applyAxisAngle(zvector, this.heading).normalize();
			s1 = new THREE.Vector3().subVectors(this.nextPoint, this.position).normalize();

			planS0 = new THREE.Vector3(1, 0, 0).applyAxisAngle(zvector, this.heading).normalize();
			planS1 = new THREE.Vector3(this.nextPoint.x - this.position.x, this.nextPoint.y - this.position.y, 0).normalize();

			this.endHeading = s1.angleTo(new THREE.Vector3(1,0,0));
			if (s1.y < 0) {
				this.endHeading *= -1;
			}
			//t1 = new THREE.Vector3(1,0,this.endSlope).applyAxisAngle(zvector, this.endHeading);

			s0.multiplyScalar(this.startHandleScale);
			s1.multiplyScalar(this.endHandleScale);
			// t0.multiplyScalar(Math.max(this.position.distanceTo(this.nextPoint) / 20, 1));
			// t1.multiplyScalar(Math.max(this.position.distanceTo(this.nextPoint) / 20, 1));

			// central line
			p0 = this.position.clone();
			p1 = this.nextPoint.clone();
			centralPoints = cubicHermitePoints(p0, s0, p1, s1, oDistance / step);

			// left line
			p0 = this.position.clone().add(new THREE.Vector3(0,1,0).applyAxisAngle(zvector, this.heading).applyAxisAngle(planS0, this.startSup).multiplyScalar(this.width / 2 / Math.cos(this.startSup)));
			drawSphereAtPoint(p0, 0.2, 0xFF0000)
			p1 = this.nextPoint.clone().add(new THREE.Vector3(0,1,0).applyAxisAngle(zvector, this.endHeading).applyAxisAngle(planS1, this.endSup).multiplyScalar(this.width / 2 / Math.cos(this.endSup)));
			drawSphereAtPoint(p1, 0.2, 0x0000FF)
			// p0 = this.position.clone().add(new THREE.Vector3(0,1,0).applyAxisAngle(zvector, this.heading).applyAxisAngle(s0.clone().normalize(), this.startSup).multiplyScalar(this.width / 2 / Math.cos(this.startSup)));
			// p1 = this.nextPoint.clone().add(new THREE.Vector3(0,1,0).applyAxisAngle(zvector, this.endHeading).applyAxisAngle(s1.clone().normalize(), this.endSup).multiplyScalar(this.width / 2 / Math.cos(this.endSup)));
			leftPoints = cubicHermitePoints(p0, s0, p1, s1, oDistance / step);

			// right line
			p0 = this.position.clone().add(new THREE.Vector3(0,-1,0).applyAxisAngle(zvector, this.heading).applyAxisAngle(planS0, this.startSup).multiplyScalar(this.width / 2 / Math.cos(this.startSup)));
			drawSphereAtPoint(p0, 0.2, 0xFF0000)
			p1 = this.nextPoint.clone().add(new THREE.Vector3(0,-1,0).applyAxisAngle(zvector, this.endHeading).applyAxisAngle(planS1, this.endSup).multiplyScalar(this.width / 2 / Math.cos(this.endSup)));
			drawSphereAtPoint(p1, 0.2, 0x0000FF)
			// p0 = this.position.clone().add(new THREE.Vector3(0,-1,0).applyAxisAngle(zvector, this.heading).applyAxisAngle(s0.clone().normalize(), this.startSup).multiplyScalar(this.width / 2 / Math.cos(this.startSup)));
			// p1 = this.nextPoint.clone().add(new THREE.Vector3(0,-1,0).applyAxisAngle(zvector, this.endHeading).applyAxisAngle(s1.clone().normalize(), this.endSup).multiplyScalar(this.width / 2 / Math.cos(this.endSup)));
			rightPoints = cubicHermitePoints(p0, s0, p1, s1, oDistance / step);

			var planCentralPoints = cubicHermitePoints(this.position.clone().setZ(0), planS0, this.nextPoint.clone().setZ(0), planS1);
			var planLength = customLineLength(planCentralPoints);
			p0 = centralPoints[centralPoints.length - 2];
			p1 = centralPoints[centralPoints.length - 1];
			var endSlope = Math.tan(Math.asin((p1.z - p0.z) / p1.distanceTo(p0)));
			console.log('hermite plan length ', planLength, '\nendSlope', endSlope);

			break;

		default:
			throw new Error('Invalid track type', this.type);
	}

	// get the end position considering start position and heading
	if (this.type != 'hermite') {
		sevector.subVectors(centralPoints[centralPoints.length - 1], centralPoints[0]);
		sevector.applyAxisAngle(zvector, this.heading)
		this.endPositionC = sevector.clone().add(centralPoints[0]).add(this.position);
		sevector.subVectors(leftPoints[leftPoints.length - 1], leftPoints[0]);
		sevector.applyAxisAngle(zvector, this.heading);
		this.endPositionL = sevector.clone().add(leftPoints[0]).add(this.position);
		sevector.subVectors(rightPoints[rightPoints.length - 1], rightPoints[0]);
		sevector.applyAxisAngle(zvector, this.heading);
		this.endPositionR = sevector.clone().add(rightPoints[0]).add(this.position);
	} else {
		this.endPositionC = centralPoints[centralPoints.length - 1].clone();
		this.endPositionL = leftPoints[leftPoints.length - 1].clone();
		this.endPositionR = rightPoints[rightPoints.length - 1].clone();
	}

	this.endSuperelevation = this.endSup;

	drawSphereAtPoint(this.endPositionC, 0.5)

	//drawCustomLine(centralPoints, 0xFF00000);
	//drawCustomLine(leftPoints, 0xFF6666);
	//drawCustomLine(rightPoints, 0x6666FF);

	this.centralPoints = centralPoints;
	this.leftPoints = leftPoints;
	this.rightPoints = rightPoints;

	this.line = new THREE.Mesh();
	this.line.add(generateCustomLine(centralPoints, 0x0000FF));
	this.line.add(generateCustomLine(leftPoints, 0x000000));
	this.line.add(generateCustomLine(rightPoints, 0x000000));

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
	parent.remove(this.line);
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

function hermite(t, range, v0, rate0, v1, rate1) {

	return (2*t*t*t-3*t*t+1) * v0 + (t*t*t - 2*t*t+t) * range * rate0 + (-2*t*t*t + 3*t*t) * v1 + (t*t*t-t*t) * range * rate1;
}

TrackBuilder.Circuit = function() {

	this.constructionPosition = new THREE.Vector3();
	this.currentHeading = 0;
	this.currentS = 0;
	this.currentPitch = 0;
	this.heightRate = 0;
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
	trackdata.heightRate = this.heightRate;

	var track = new TrackBuilder.Track(trackdata);
	if (track.type != 'hermite') {
		track.mesh.position.set(this.constructionPosition.x, this.constructionPosition.y, this.constructionPosition.z);
		track.mesh.rotation.z = this.currentHeading;
		track.line.position.set(this.constructionPosition.x, this.constructionPosition.y, this.constructionPosition.z);
		track.line.rotation.z = this.currentHeading;
	}
	track.build(this.mesh);

	this.tracks.push(track);
	this.constructionPosition.set(track.endPositionC.x, track.endPositionC.y, track.endPositionC.z);
	this.currentHeading = track.endHeading;
	this.currentS = track.s + track.length;
	this.superelevation = track.endSuperelevation;
	this.heightRate = track.endSlope;

	console.log('center', track.endPositionC)//, '\nleft', track.endPositionL, '\nright', track.endPositionR);
};

TrackBuilder.Circuit.prototype.undo = function() {
	// body...
	if (this.tracks.length) {
		var track = this.tracks.pop();
		this.constructionPosition.set(track.position.x, track.position.y, track.position.z);
		this.currentHeading = track.heading;
		this.currentS = track.s;
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

TrackBuilder.Circuit.prototype.hideBound = function() {
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
};

TrackBuilder.Circuit.prototype.refreshBound = function() {
	// body...
	this.hideBound();
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

TrackBuilder.Circuit.prototype.showMesh = function() {
	// body...
	for (var i in this.tracks) {
		var track = this.tracks[i];
		if (!track.meshShown) {
			this.mesh.add(track.mesh);
			this.mesh.remove(track.line);
			track.meshShown = true;
		}
	}
};

TrackBuilder.Circuit.prototype.hideMesh = function() {
	// body...
	for (var i in this.tracks) {
		var track = this.tracks[i];
		if (track.meshShown) {
			this.mesh.remove(track.mesh);
			this.mesh.add(track.line);
			track.meshShown = false;
		}
	}
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

TrackBuilder.Circuit.prototype.showEndDetail = function() {
	// body...
	if (this.tracks.length == 0) return;

	var lastTrack = this.tracks[this.tracks.length - 1];
	var p = this.constructionPosition.clone();
	var v = new THREE.Vector3(1, 0, lastTrack.endSlope).multiplyScalar(10);
	v.applyAxisAngle(zvector, this.currentHeading);
	this.headingLine = generateCustomLine([p.clone(), p.clone().add(v)], 0x0000FF);
	var t = new THREE.Vector3(0, 1, 0).multiplyScalar(lastTrack.width / 2);
	t.applyAxisAngle(zvector, this.currentHeading);
	this.tplanLine = generateCustomLine([p.clone(), p.clone().add(t)], 0xFFAAAA);
	t.multiplyScalar(1 / Math.cos(lastTrack.endSup));
	t.applyAxisAngle(v.clone().normalize(), lastTrack.endSup);
	this.tactualLine = generateCustomLine([p.clone(), p.clone().add(t)], 0xFF0000);

	scene.add(this.headingLine);
	scene.add(this.tplanLine);
	scene.add(this.tactualLine);
};

TrackBuilder.Circuit.prototype.hideEndDetail = function(first_argument) {
	// body...
	if (this.tracks.length == 0) return;

	scene.remove(this.headingLine);
	scene.remove(this.tplanLine);
	scene.remove(this.tactualLine);

	this.headingLine.material.dispose();
	this.headingLine.geometry.dispose();
	this.tplanLine.material.dispose();
	this.tplanLine.geometry.dispose();
	this.tactualLine.material.dispose();
	this.tactualLine.geometry.dispose();
};

// Using hermite and half-way radius clothoid - 2017.7.16
TrackBuilder.Circuit.prototype.turn = function(startPos, length, width, halfwayRadius) {
	// body...
	var centralPoints = [];
	var leftPoints = [];
	var rightPoints = [];

	var s = 0, preS = 0;
	var theta = 0;
	var step = 1;

	var k = (1 / halfwayRadius - 0) * 2 / length;

	do {
		if (s == 0) {
			centralPoints.push(new THREE.Vector3());
			rightPoints.push(new THREE.Vector3(0, - width / 2, 0));
			leftPoints.push(new THREE.Vector3(0, width / 2, 0));
			s += step;
			continue;
		}

		if (Math.abs(s - length / 2) < 1E-4) s = length / 2;

		var curvature = (s + preS) * 0.5 * k + 0;
		var prePoint = centralPoints[centralPoints.length - 1];

		x = prePoint.x + (s - preS) * Math.cos(theta + curvature * (s - preS) / 2);
		y = prePoint.y + (s - preS) * Math.sin(theta + curvature * (s - preS) / 2);
		z = 0;

		if (s < length / 2) {
			theta += curvature * (s - preS);
		} else {
			theta += curvature * (s - preS) / 2;
		}
		preS = s;
		s += step;

		centralPoints.push(new THREE.Vector3(x, y, z));
		leftPoints.push(new THREE.Vector3(x + width / 2 * Math.cos(theta + Math.PI / 2), y + width / 2 * Math.sin(theta + Math.PI / 2), z));
		rightPoints.push(new THREE.Vector3(x + width / 2 * Math.cos(theta - Math.PI / 2), y + width / 2 * Math.sin(theta - Math.PI / 2), z));
	} while(s < length / 2 + step);

	k *= -1;
	s = preS = 0;
	do {
		if (s == 0) {
			s += step;
			continue;
		}

		if (Math.abs(s - length / 2) < 1E-4) s = length / 2;

		var curvature = (s + preS) * 0.5 * k + 1 / halfwayRadius;
		var prePoint = centralPoints[centralPoints.length - 1];

		x = prePoint.x + (s - preS) * Math.cos(theta + curvature * (s - preS) / 2);
		y = prePoint.y + (s - preS) * Math.sin(theta + curvature * (s - preS) / 2);
		z = 0;

		if (s < length / 2) {
			theta += curvature * (s - preS);
		} else {
			theta += curvature * (s - preS) / 2;
		}
		preS = s;
		s += step;

		centralPoints.push(new THREE.Vector3(x, y, z));
		leftPoints.push(new THREE.Vector3(x + width / 2 * Math.cos(theta + Math.PI / 2), y + width / 2 * Math.sin(theta + Math.PI / 2), z));
		rightPoints.push(new THREE.Vector3(x + width / 2 * Math.cos(theta - Math.PI / 2), y + width / 2 * Math.sin(theta - Math.PI / 2), z));

	} while(s < length / 2 + step);

	var geometry = createCustomFaceGeometry(leftPoints, rightPoints);
	var material = new THREE.MeshBasicMaterial({color: 0xCFCFCF});
	var mesh = new THREE.Mesh(geometry, material);
	mesh.position.set(startPos.x, startPos.y, startPos.z); 
	mesh.rotation.z = this.currentHeading;
	this.mesh.add(mesh);

	var endVector = new THREE.Vector3().subVectors(centralPoints[centralPoints.length - 1], centralPoints[0]);
	endVector.applyAxisAngle(new THREE.Vector3(0,0,1), this.currentHeading)

	this.constructionPosition = endVector.add(centralPoints[0]).add(startPos);
	this.currentHeading += theta;

	drawSphereAtPoint(this.constructionPosition, 3, 0x0000FF);
};

TrackBuilder.Circuit.prototype.hermite = function(nextPoint) {
	// body...
	var p0 = this.constructionPosition.clone(); 
	var t0 = new THREE.Vector3(Math.cos(this.currentHeading),Math.sin(this.currentHeading),0);
	var p1 = nextPoint.clone();
	var t1 = new THREE.Vector3();
	t1.subVectors(nextPoint, this.constructionPosition).normalize();

	t0.multiplyScalar(2)//nextPoint.distanceTo(this.constructionPosition) / 20);
	t1.multiplyScalar(2)//nextPoint.distanceTo(this.constructionPosition) / 20);
	
	var centralPoints = cubicHermitePoints(p0, t0, p1, t1, 100);

	p0 = new THREE.Vector3(p0.x + 5.5 * Math.cos(this.currentHeading + Math.PI / 2), p0.y + 5.5 * Math.sin(this.currentHeading + Math.PI / 2), 0);
	drawSphereAtPoint(p0, 0.08, 0x0000FF)
	
	p1 = nextPoint.clone().add(t1.clone().normalize().applyAxisAngle(new THREE.Vector3(0,0,1), Math.PI / 2).multiplyScalar(5.5));
	drawSphereAtPoint(p1, 0.08, 0x0000FF);
	var leftPoints = cubicHermitePoints(p0, t0, p1, t1, 100);

	p0 = new THREE.Vector3(this.constructionPosition.x + 5.5 * Math.cos(this.currentHeading - Math.PI / 2), this.constructionPosition.y + 5.5 * Math.sin(this.currentHeading - Math.PI / 2), 0);
	drawSphereAtPoint(p0, 0.08, 0xFF0000)

	p1 = nextPoint.clone().add(t1.clone().normalize().applyAxisAngle(new THREE.Vector3(0,0,1), -Math.PI / 2).multiplyScalar(5.5));
	drawSphereAtPoint(p1, 0.08, 0xFF0000)
	var rightPoints = cubicHermitePoints(p0, t0, p1, t1, 100);

	//drawCustomLine(centralPoints);	
	var geometry = createCustomFaceGeometry(leftPoints, rightPoints);
	var material = new THREE.MeshBasicMaterial({color: 0xCFCFCF});
	var mesh = new THREE.Mesh(geometry, material);
	this.mesh.add(mesh);

	this.constructionPosition = nextPoint.clone();
	this.currentHeading = t1.angleTo(new THREE.Vector3(1,0,0));
	
	if (t1.y < 0) {
		this.currentHeading *= -1;
	}

	drawSphereAtPoint(this.constructionPosition, 3, 0xFF0000)
	console.log(this.constructionPosition, nextPoint)
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
		View: 'Mesh',
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
		lineLength: 20,
		width: 11,
		radius: 10,
		arcAngle: 90,
		elevationA: 0,
		elevationB: 0,
		startElevB: 0,
		endElevB: 0,
		startSlope: 0,
		endSlope: 0,
		superelevationA: 0,
		superelevationB: 0,
		startSupB: 0,
		endSupB: 0,
		startSuperelevation: 0,
		endSuperelevation: 0,
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
	this.configFolder.add(this.configMenu, 'width').step(0.1).onChange(function(value) {
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
	this.configFolder.add(this.configMenu, 'startSlope').step(0.01).onChange(function(value) {
		this.defaultLine.startSlope = value;
		this.defaultArc.startSlope = value;
	}.bind(this));
	this.configFolder.add(this.configMenu, 'endSlope').step(0.01).onChange(function(value) {
		this.defaultLine.endSlope = value;
		this.defaultArc.endSlope = value;
	}.bind(this));
	// this.configFolder.add(this.configMenu, 'elevationA').step(0.000000001).onChange(function(value) {
	// 	this.updateElevation();
	// }.bind(this));
	// this.configFolder.add(this.configMenu, 'elevationB').step(0.0000000000000001).onChange(function(value) {
	// 	this.updateElevation();
	// }.bind(this));
	// this.configFolder.add(this.configMenu, 'startElevB').step(0.0000000000000001).onChange(function(value) {
	// 	this.updateElevation();
	// }.bind(this));
	// this.configFolder.add(this.configMenu, 'endElevB').step(0.0000000000000001).onChange(function(value) {
	// 	this.updateElevation();
	// }.bind(this));
	// this.configFolder.add(this.configMenu, 'superelevationA').step(0.000000001).onChange(function(value) {
	// 	this.updateSuperelevation();
	// }.bind(this));
	// this.configFolder.add(this.configMenu, 'superelevationB').step(0.0000000000000001).onChange(function(value) {
	// 	this.updateSuperelevation();
	// }.bind(this));
	// this.configFolder.add(this.configMenu, 'startSupB').step(0.000000001).onChange(function(value) {
	// 	this.updateSuperelevation();
	// }.bind(this));
	// this.configFolder.add(this.configMenu, 'endSupB').step(0.0000000000000001).onChange(function(value) {
	// 	this.updateSuperelevation();
	// }.bind(this));
	this.configFolder.add(this.configMenu, 'startSuperelevation').step(0.01).onChange(function(value) {
		this.defaultLine.startSup = value * Math.PI / 180
		this.defaultArc.startSup = value * Math.PI / 180
	}.bind(this));
	this.configFolder.add(this.configMenu, 'endSuperelevation').step(0.01).onChange(function(value) {
		this.defaultLine.endSup = value * Math.PI / 180
		this.defaultArc.endSup = value * Math.PI / 180
	}.bind(this));
	// this.configFolder.add(this.configMenu, 'elevationEase', ['none', 'ease']).onChange(function(value) {
	// 	this.updateElevation();
	// }.bind(this));
	// this.configFolder.add(this.configMenu, 'superelevationEase', ['ease', 'none']).onChange(function(value) {
	// 		this.updateSuperelevation();
	// }.bind(this));	
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

	this.gui.add(this.mainMenu, 'View', ['Mesh', 'Line']).onChange(function(value) {
		if (value == 'Mesh') this.circuit.showMesh();
		if (value == 'Line') this.circuit.hideMesh();
	}.bind(this));

	this.gui.add(this.mainMenu, 'Export');
}

TrackBuilder.UI.prototype.updateElevation = function() {
	// body...
	this.defaultLine.elevation.a = this.configMenu.elevationA;
	this.defaultArc.elevation.a = this.configMenu.elevationA;
	// the most common way regardless of transition options (in / out / inout / or straight)
	var k = this.configMenu.elevationB;
	var k1 = this.configMenu.startElevB;
	var k2 = this.configMenu.endElevB;
	this.defaultLine.elevation.b = k1;
	this.defaultLine.elevation.c = (3 * k - 2 * k1 - k2) / this.defaultLine.length;
	this.defaultLine.elevation.d = (k1 + k2 - 2 * k) / Math.pow(this.defaultLine.length, 2);
	this.defaultArc.elevation.b = k1;
	this.defaultArc.elevation.c = (3 * k - 2 * k1 - k2) / this.defaultArc.length;
	this.defaultArc.elevation.d = (k1 + k2 - 2 * k) / Math.pow(this.defaultArc.length, 2);	
};

TrackBuilder.UI.prototype.updateSuperelevation = function() {
	// body...
	this.defaultLine.superelevation.a = Math.PI / 180 * this.configMenu.superelevationA;
	this.defaultArc.superelevation.a = Math.PI / 180 * this.configMenu.superelevationA;
	// the most common way regardless of transition options (in / out / inout / or straight)
	var k = this.configMenu.superelevationB;
	var k1 = this.configMenu.startSupB;
	var k2 = this.configMenu.endSupB;
	this.defaultLine.superelevation.b = k1;
	this.defaultLine.superelevation.c = (3 * k - 2 * k1 - k2) / this.defaultLine.length;
	this.defaultLine.superelevation.d = (k1 + k2 - 2 * k) / Math.pow(this.defaultLine.length, 2);
	this.defaultArc.superelevation.b = k1;
	this.defaultArc.superelevation.c = (3 * k - 2 * k1 - k2) / this.defaultArc.length;
	this.defaultArc.superelevation.d = (k1 + k2 - 2 * k) / Math.pow(this.defaultArc.length, 2);
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

TrackBuilder.hermiteUI = function(circuit) {

	this.circuit = circuit;
	this.gui = new dat.GUI({width: 310});

	this.turn = new TrackBuilder.DefaultTrack2('turn');
	this.transition = new TrackBuilder.DefaultTrack2('hermite');

	this.mainMenu = {
		Turn: ( function() { this.circuit.buildTrack(this.turn); }.bind(this) ),
		Hermite: ( function() { this.circuit.buildTrack(this.transition); }.bind(this) ),
		Undo: ( function() { this.circuit.undo(); }.bind(this) ),
		Export: ( function() { this.circuit.exportOBJ(); }.bind(this) ),
	}
	this.gui.add(this.mainMenu, 'Turn');
	this.gui.add(this.mainMenu, 'Hermite');
	this.gui.add(this.mainMenu, 'Undo');

	this.boundFolder = this.gui.addFolder('Circuit Boundary');
	this.boundMenu = {
		we: 300,
		sn: 200,
		bottomRightX: 300,
		bottomRightY: -200,
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

	this.circuitFolder = this.gui.addFolder('Circuit Config');
	this.circuitMenu = {
		startPos_X: 113.1,
		startPos_Y: -94.9,
	}
	this.circuitFolder.add(this.circuitMenu, 'startPos_X').step(0.01).onChange(function(value) {
		this.circuit.constructionPosition.x = value;
	}.bind(this));
	this.circuitFolder.add(this.circuitMenu, 'startPos_Y').step(0.01).onChange(function(value) {
		this.circuit.constructionPosition.y = value;
	}.bind(this));

	this.configFolder = this.gui.addFolder('Config Menu');
	this.configFolder.open();
	this.configMenu = {
		width: 11,
		fullTurnLength: 72,
		halfwayRadius: 28.5,
		turnType: 'fullTurn',
		nextPoint_X: 0,
		nextPoint_Y: 0,
		nextPoint_Z: 0,
		startHandleScale: 5,
		endHandleScale: 1,
		slope: 0,
		startSlope: 0,
		endSlope: 0,
		startSup: 0,
		endSup: 0,
		supAxis: 'central',
		endDetail: false,
	}
	this.configFolder.add(this.configMenu, 'width').step(0.01).onChange(function(value) {
		this.turn.width = value;
		this.hermite.width = value;
	}.bind(this));
	this.configFolder.add(this.configMenu, 'fullTurnLength').step(0.01).onChange(function(value) {
		this.turn.length = value;
	}.bind(this));
	this.configFolder.add(this.configMenu, 'halfwayRadius').step(0.01).onChange(function(value) {
		this.turn.halfwayRadius = value;
	}.bind(this));
	this.configFolder.add(this.configMenu, 'turnType', ['fullTurn', 'firstHalf', 'lastHalf']).onChange(function(value) {
		this.turn.subtype = value;
	}.bind(this));
	this.configFolder.add(this.configMenu, 'nextPoint_X').step(0.01).onChange(function(value) {
		this.transition.nextPoint.x = value;
	}.bind(this));
	this.configFolder.add(this.configMenu, 'nextPoint_Y').step(0.01).onChange(function(value) {
		this.transition.nextPoint.y = value;
	}.bind(this));
	this.configFolder.add(this.configMenu, 'nextPoint_Z').step(0.000000001).onChange(function(value) {
		this.transition.nextPoint.z = value;
	}.bind(this));
	this.configFolder.add(this.configMenu, 'startHandleScale').step(0.01).onChange(function(value) {
		this.transition.startHandleScale = value;
	}.bind(this));
	this.configFolder.add(this.configMenu, 'endHandleScale').step(0.01).onChange(function(value) {
		this.transition.endHandleScale = value;
	}.bind(this));
	this.configFolder.add(this.configMenu, 'startSlope').step(0.000000000001).onChange(function(value) {
		this.turn.startSlope = value;
		this.transition.startSlope = value;
	}.bind(this));
	this.configFolder.add(this.configMenu, 'endSlope').step(0.000000000001).onChange(function(value) {
		this.turn.endSlope = value;
		this.transition.endSlope = value;
	}.bind(this));
	this.configFolder.add(this.configMenu, 'startSup').step(0.01).onChange(function(value) {
		this.turn.startSup = value * Math.PI / 180;
		this.transition.startSup = value * Math.PI / 180;
	}.bind(this));
	this.configFolder.add(this.configMenu, 'endSup').step(0.01).onChange(function(value) {
		this.turn.endSup = value * Math.PI / 180;
		this.transition.endSup = value * Math.PI / 180;
	}.bind(this));
	this.configFolder.add(this.configMenu, 'supAxis', ['central', 'left', 'right']).onChange(function(value) {
		this.turn.supAxis = value;
		this.transition.supAxis = value;
	}.bind(this));
	this.configFolder.add(this.configMenu, 'endDetail').onChange(function(value) {
		if (value) {
			this.circuit.showEndDetail();
		} else {
			this.circuit.hideEndDetail();
		}
	}.bind(this));

	this.gui.add(this.mainMenu, 'Export');
}

var circuit = new TrackBuilder.Circuit();
// var ui = new TrackBuilder.UI(circuit);
// var kartUI = new TrackBuilder.kartUI(circuit);
circuit.constructionPosition.set(113.1, -94.9, 0);
var hermiteUI = new TrackBuilder.hermiteUI(circuit);

/*
	P 113.1, -94.9
	L 72, R 28.5

	P 201, 37.9
	L 180, R 30

	P 91, 24.1
	L 25, R -15

	P 50, -8.1
	L 29, R -12.5

	P -10, 41.9
	L 42.8, R 30.3

	P -119.7, 76.3
	L 180.4 25

	P -85.5 30
	L 80, R -15.5

	P -75.4, -29.2
	L 30, R 20

	P -88.8, -65.3
	L 48, R 13.5
*/
turn = TrackBuilder.DefaultTrack2('turn');
transition = TrackBuilder.DefaultTrack2('hermite');

// circuit.turn(new THREE.Vector3(113.1, -94.9, 0), 72, 11, 28.5);
// circuit.hermite(new THREE.Vector3(201, 37.9, 0));

// circuit.turn(new THREE.Vector3(201, 37.9, 0), 180, 11, 30);
// circuit.hermite(new THREE.Vector3(91, 24.1, 0));

// circuit.turn(new THREE.Vector3(91, 24.1, 0), 25, 11, -15);
// circuit.hermite(new THREE.Vector3(50, -8.1, 0));

// circuit.turn(new THREE.Vector3(50, -8.1, 0), 29, 11, -12.5);
// circuit.hermite(new THREE.Vector3(-10, 41.9, 0));

// circuit.turn(new THREE.Vector3(-10, 41.9, 0), 42.8, 11, 30.3);
// circuit.hermite(new THREE.Vector3(-119.7, 76.3, 0));

// circuit.turn(new THREE.Vector3(-119.7, 76.3, 0), 180.4, 11, 25);
// circuit.hermite(new THREE.Vector3(-85.5, 30, 0));

// circuit.turn(new THREE.Vector3(-85.5, 30, 0), 80, 11, -15.5);
// circuit.hermite(new THREE.Vector3(-75.4, -29.2, 0));

// circuit.turn(new THREE.Vector3(-75.4, -29.2, 0), 30, 11, 20);
// circuit.hermite(new THREE.Vector3(-88.8, -65.3, 0));

// circuit.turn(new THREE.Vector3(-88.8, -65.3, 0), 48, 11, 13.5);
// circuit.hermite(new THREE.Vector3(113.1, -94.9, 0));