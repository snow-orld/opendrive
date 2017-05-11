var scene, camera, renderer;
var container;
var step = 1; // generate point in step 1m 

//var roads = parseXML("../data/Crossing8Course.xodr");
//var roads = parseXML("../data/CrossingComplex8Course.xodr");	// lane lateral shift cause incontinious
var roads = parseXML("../data/Roundabout8Course.xodr");		// error - taken as a rare case when spiral ends a geometry
//var roads = parseXML("../data/CulDeSac.xodr");
//var roads = parseXML("../data/Country.xodr");					// dead loop
//var roads = parseXML("../data/test.xodr");

preProcessing(roads);
init();
animate();

function init() {

	container = document.createElement('div');
	document.body.appendChild(container);

	scene = new THREE.Scene();

	/** Setting up camera */
	camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.05, 10000);
	camera.position.set(0, 0, 200);
	//camera.lookAt(new THREE.Vector3(0, 0, 20));
	scene.add(camera);

	/** Setting up light */
	//scene.add(new THREE.AmbientLight(0xf0f0f0));

	/** Settting up Plane with Grid Helper */
	var planeGeometry = new THREE.PlaneGeometry(1000, 1000);
	planeGeometry.rotateX(- Math.PI / 2);
	var planeMaterial = new THREE.ShadowMaterial();
	planeMaterial.opacity = 0.2;
	var plane = new THREE.Mesh(planeGeometry, planeMaterial);
	plane.receiveShadow = true;
	scene.add(plane);

	var helper = new THREE.GridHelper(1000, 100);
	helper.rotateX(- Math.PI / 2);
	helper.position.y = 0;
	helper.material.opacity = 0.25;
	helper.material.transparent = true;
	scene.add(helper);

	/** Settign up rendere */
	renderer = new THREE.WebGLRenderer( {antialias: true} );
	renderer.setClearColor(0xf0f0f0);
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.shadowMap.enabled = true;
	container.appendChild(renderer.domElement);

	/** Setting up controls */
	controls = new THREE.OrbitControls(camera, renderer.domElement);

	/** pave lanes */
	paveRoads(roads);

	//test();
}

function animate() {
	requestAnimationFrame(animate);
	renderer.render(scene, camera);
}

function parseXML(xmlFile) {
	
	try {
		// Internet Explorer
		xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
		xmlDoc.async = false;
		xmlDoc.load(xmlFile);
	} catch (e) {
		// Chrome
		xmlHttp = new window.XMLHttpRequest();
		xmlHttp.open("GET", xmlFile, false);
		xmlHttp.overrideMimeType('text/xml');
		xmlHttp.send(null);
		xmlDoc = xmlHttp.responseXML;
	}

	var roadNodes = xmlDoc.getElementsByTagName('road');
	var roads = {};

	for ( var i=0 ; i < roadNodes.length; i++ )
	{
		var roadNode = roadNodes[i];
		var id = roadNode.id;	// road id type string

		roads[id] = {};
		roads[id].id = id;
		roads[id].geometry = [];
		roads[id].laneSection = [];

		if (roadNode.children[0].nodeName == 'link') {

			var roadLinkNode = roadNode.children[0];

			var predecessorNodes = roadLinkNode.getElementsByTagName('predecessor');
			if (predecessorNodes.length == 1) {
				roads[id].predecessor = {};
				roads[id].predecessor.elementType = predecessorNodes[0].getAttribute('elementType');
				roads[id].predecessor.elementId = predecessorNodes[0].getAttribute('elementId');
				roads[id].predecessor.contactPoint = predecessorNodes[0].getAttribute('contactPoint');
			}
			var successorNodes = roadLinkNode.getElementsByTagName('successor');
			if (successorNodes.length == 1) {
				roads[id].successor = {};
				roads[id].successor.elementType = successorNodes[0].getAttribute('elementType');
				roads[id].successor.elementId = successorNodes[0].getAttribute('elementId');
				roads[id].successor.contactPoint = successorNodes[0].getAttribute('contactPoint');
			}
			var neighborNodes = roadLinkNode.getElementsByTagName('neighbor');
			if (neighborNodes.length) {
				roads[id].neighbor = [];
				for (var j=0; j < neighborNodes.length; j++) {
					var neighborNode = neighborNodes[j];
					roads[id].neighbor[j] = {};
					roads[id].neighbor[j].side = neighborNode.getAttribute('side');
					roads[id].neighbor[j].elementId = neighborNode.getAttribute('elementId');
					roads[id].neighbor[j].direction = neighborNode.getAttribute('direction');
				}
			}
		}

		var geometryNodes = roadNode.getElementsByTagName('geometry');
		for (var j=0; j < geometryNodes.length; j++) {
		
			var geometryNode = geometryNodes[j];

			roads[id].geometry[j] = {};
			roads[id].geometry[j].s = parseFloat(geometryNode.getAttribute('s'));
			roads[id].geometry[j].x = parseFloat(geometryNode.getAttribute('x'));
			roads[id].geometry[j].y = parseFloat(geometryNode.getAttribute('y'));
			roads[id].geometry[j].hdg = parseFloat(geometryNode.getAttribute('hdg'));
			roads[id].geometry[j].length = parseFloat(geometryNode.getAttribute('length'));

			var geometryType = geometryNode.firstElementChild.nodeName;
			var geometryTypeNode = geometryNode.firstElementChild;
			roads[id].geometry[j].type = geometryType;

			switch(geometryType) {
				case 'line':
					break;
				case 'spiral':
					roads[id].geometry[j][geometryType] = {};
					roads[id].geometry[j][geometryType].curvStart = parseFloat(geometryTypeNode.getAttribute('curvStart'));
					roads[id].geometry[j][geometryType].curvEnd = parseFloat(geometryTypeNode.getAttribute('curvEnd'));
					break;
				case 'arc':
					roads[id].geometry[j][geometryType] = {};
					roads[id].geometry[j][geometryType].curvature = parseFloat(geometryTypeNode.getAttribute('curvature'));
					break;
				default:
					throw new Error('invalid geometry type!')
			}
		}

		var laneOffsetNodes = roadNode.getElementsByTagName('laneOffset');
		if (laneOffsetNodes.length) {

			roads[id].laneOffset = [];
			
			for (var j=0; j < laneOffsetNodes.length; j++) {

				var laneOffsetNode = laneOffsetNodes[j];

				roads[id].laneOffset[j] = {};
				roads[id].laneOffset[j].s = parseFloat(laneOffsetNode.getAttribute('s'));
				roads[id].laneOffset[j].a = parseFloat(laneOffsetNode.getAttribute('a'));
				roads[id].laneOffset[j].b = parseFloat(laneOffsetNode.getAttribute('b'));
				roads[id].laneOffset[j].c = parseFloat(laneOffsetNode.getAttribute('c'));
				roads[id].laneOffset[j].d = parseFloat(laneOffsetNode.getAttribute('d'));
			}
		}

		var laneSectionNodes = roadNode.getElementsByTagName('laneSection');
		for (var j=0; j < laneSectionNodes.length; j++) {

			var laneSectionNode = laneSectionNodes[j];

			roads[id].laneSection[j] = {};
			roads[id].laneSection[j].s = parseFloat(laneSectionNode.getAttribute('s'));
			roads[id].laneSection[j].singleSide = laneSectionNode.getAttribute('singleSide');
			roads[id].laneSection[j].lane = [];

			var laneNodes = laneSectionNode.getElementsByTagName('lane');
			for (var k=0; k < laneNodes.length; k++) {

				var laneNode = laneNodes[k];
				var lane = roads[id].laneSection[j].lane[k];

				roads[id].laneSection[j].lane[k] = {};
				roads[id].laneSection[j].lane[k].id = parseInt(laneNode.getAttribute('id'));
				roads[id].laneSection[j].lane[k].type = laneNode.getAttribute('type');

				// 1+ if no <border> entry is present - not allowed for center lane
				var widthNodes = laneNode.getElementsByTagName('width');
				if (widthNodes.length) roads[id].laneSection[j].lane[k].width = [];

				// 1+ if no <width> entry is present - not allowed for center lane
				var borderNodes = laneNode.getElementsByTagName('border');
				if (borderNodes.width) roads[id].laneSection[j].lane[k].border = [];

				// 0+
				var roadMarkNodes = laneNode.getElementsByTagName('roadMark');
				roads[id].laneSection[j].lane[k].roadMark = [];		

				// 0+ not allowed for center lane
				var materialNodes = laneNode.getElementsByTagName('material');
				if (materialNodes.length) roads[id].laneSection[j].lane[k].material = [];		
				
				// 0+ not allowed for center lane
				var visibilityNodes = laneNode.getElementsByTagName('visibility');
				if (visibilityNodes.length) roads[id].laneSection[j].lane[k].visibility = [];

				// 0+ not allowed for center lane
				var speedNodes = laneNode.getElementsByTagName('speed');
				if (speedNodes.length) roads[id].laneSection[j].lane[k].speed = [];
				
				// 0+ not allowed for center lane
				var accessNodes = laneNode.getElementsByTagName('access');
				if (accessNodes.length) roads[id].laneSection[j].lane[k].access = [];

				// 0+ not allowed for center lane
				var heightNodes = laneNode.getElementsByTagName('height');
				if (heightNodes.length) roads[id].laneSection[j].lane[k].height = [];

				// 0+ not allowed for center lane
				var ruleNodes = laneNode.getElementsByTagName('rule');
				if (ruleNodes.length) roads[id].laneSection[j].lane[k].rule = [];

				// get Lane Width Record 1+ - not allowed for center lane (laneId=0)
				for (var l=0; l < widthNodes.length; l++) {

					var widthNode = widthNodes[l];

					roads[id].laneSection[j].lane[k].width[l] = {};
					roads[id].laneSection[j].lane[k].width[l].sOffset = parseFloat(widthNode.getAttribute('sOffset'));
					roads[id].laneSection[j].lane[k].width[l].a = parseFloat(widthNode.getAttribute('a'));
					roads[id].laneSection[j].lane[k].width[l].b = parseFloat(widthNode.getAttribute('b'));
					roads[id].laneSection[j].lane[k].width[l].c = parseFloat(widthNode.getAttribute('c'));
					roads[id].laneSection[j].lane[k].width[l].d = parseFloat(widthNode.getAttribute('d'));
				}

				// get Lane Border Record 1+ - if both <width> and <border> is defined, <width> prevails
				for (var l=0; l < borderNodes.length; l++) {

					var borderNode = borderNodes[l];

					roads[id].laneSection[j].lane[k].border[l] = {};
					roads[id].laneSection[j].lane[k].border[l].sOffset = parseFloat(borderNode.getAttribute('sOffset'));
					roads[id].laneSection[j].lane[k].border[l].a = parseFloat(borderNode.getAttribute('a'));
					roads[id].laneSection[j].lane[k].border[l].b = parseFloat(borderNode.getAttribute('b'));
					roads[id].laneSection[j].lane[k].border[l].c = parseFloat(borderNode.getAttribute('c'));
					roads[id].laneSection[j].lane[k].border[l].d = parseFloat(borderNode.getAttribute('d'));
				}

				// get Lane Roadmark 0+
				// road mark's centerline is always positioned on the respective lane's outer border line
				for (var l=0; l < roadMarkNodes.length; l++) {

					var roadMarkNode = roadMarkNodes[l];

					roads[id].laneSection[j].lane[k].roadMark[l] = {};
					roads[id].laneSection[j].lane[k].roadMark[l].sOffset = parseFloat(roadMarkNode.getAttribute('sOffset'));
					roads[id].laneSection[j].lane[k].roadMark[l].type = roadMarkNode.getAttribute('type');
					roads[id].laneSection[j].lane[k].roadMark[l].weight = roadMarkNode.getAttribute('weight');
					roads[id].laneSection[j].lane[k].roadMark[l].color = roadMarkNode.getAttribute('color');
					roads[id].laneSection[j].lane[k].roadMark[l].material = roadMarkNode.getAttribute('material');
					roads[id].laneSection[j].lane[k].roadMark[l].width = parseFloat(roadMarkNode.getAttribute('width'));
					roads[id].laneSection[j].lane[k].roadMark[l].laneChange = roadMarkNode.getAttribute('laneChange') ? roadMarkNode.getAttribute('laneChange') : "both";
					roads[id].laneSection[j].lane[k].roadMark[l].height = parseFloat(roadMarkNode.getAttribute('height') ? roadMarkNode.getAttribute('height') : "0");
				}

				// get Lane Material Record 0+ - not allowed for center lane (laneId=0)
				for (var l=0; l < materialNodes.length; l++) {
					
					var materialNode = materialNodes[l];

					roads[id].laneSection[j].lane[k].material[l] = {};
					roads[id].laneSection[j].lane[k].material[l].sOffset = parseFloat(materialNode.getAttribute('sOffset'));
					roads[id].laneSection[j].lane[k].material[l].surface = materialNode.getAttribute('surface');
					roads[id].laneSection[j].lane[k].material[l].friction = parseFloat(materialNode.getAttribute('friction'));
					roads[id].laneSection[j].lane[k].material[l].roughness = parseFloat(materialNode.getAttribute('roughness'));
				}

				// get Lane Visibility Record - not allowed for center lane (laneId=0)
				for (var l=0; l < visibilityNodes.length; l++) {

					var visibilityNode = visibilityNodes[l];

					roads[id].laneSection[j].lane[k].visibility[l] = {};
					roads[id].laneSection[j].lane[k].visibility[l].sOffset = parseFloat(visibilityNode.getAttribute('sOffset'));
					roads[id].laneSection[j].lane[k].visibility[l].forward = parseFloat(visibilityNode.getAttribute('forward'));
					roads[id].laneSection[j].lane[k].visibility[l].back = parseFloat(visibilityNode.getAttribute('back'));
					roads[id].laneSection[j].lane[k].visibility[l].left = parseFloat(visibilityNode.getAttribute('left'));
					roads[id].laneSection[j].lane[k].visibility[l].right = parseFloat(visibilityNode.getAttribute('right'));
				}

				// get Lane Speed Record - not allowed for center lane (laneId=0)
				for (var l=0; l < speedNodes.length; l++) {

					var speedNode = speedNodes[l];

					roads[id].laneSection[j].lane[k].speed[l] = {};
					roads[id].laneSection[j].lane[k].speed[l].sOffset = parseFloat(speedNode.getAttribute('sOffset'));
					roads[id].laneSection[j].lane[k].speed[l].max = parseFloat(speedNode.getAttribute('max'));
					roads[id].laneSection[j].lane[k].speed[l].unit = speedNode.getAttribute('unit') ? speedNode.getAttribute('unit') : 'm/s';
				}

				// get Lane Access Record - not allowed for center lane (laneId=0)
				for (var l=0; l < accessNodes.length; l++) {

					var accessNode = accessNodes[l];

					roads[id].laneSection[j].lane[k].access[l] = {};
					roads[id].laneSection[j].lane[k].access[l].sOffset = parseFloat(accessNode.getAttribute('sOffset'));
					roads[id].laneSection[j].lane[k].access[l].restriction = accessNode.getAttribute('restriction');
				}

				// get Lane Height Record 0+ - not allowed for center lane (laneId=0)
				for (var l=0; l < heightNodes.length; l++) {

					var heightNode = heightNodes[l];

					roads[id].laneSection[j].lane[k].height[l] = {};
					roads[id].laneSection[j].lane[k].height[l].sOffset = heightNode.getAttribute('sOffset');
					roads[id].laneSection[j].lane[k].height[l].inner = heightNode.getAttribute('inner');
					roads[id].laneSection[j].lane[k].height[l].outer = heightNode.getAttribute('outer');
				}

				// get Lane Rule Record 0+ - not allowed for center lane (laneId=0)
				for (var l=0; l < ruleNodes.length; l++) {

					var ruleNode = ruleNodes[l];

					roads[id].laneSection[j].lane[k].rule[l] = {};
					roads[id].laneSection[j].lane[k].rule[l].sOffset = parseFloat(ruleNode.getAttribute('sOffset'));
					roads[id].laneSection[j].lane[k].rule[l].value = ruleNode.getAttribute('value');
				}
			}
		}
		// test
		//if (i == 0) console.log(roads[id])
	}
	return roads;
}

/*
* Find the successor geometry's start, as the actual end point of current geometry
*
* @Param road the road that possess current geometry
* @Param geometryId the index of current geometry in the road.geometry array
* @Return Vector2 (ex, ey) the actual end point in x-y plane
*/
function getGeoemtryEndPoint(road, geometryId) {

	var ex = null;
	var ey = null;

	if (geometryId < road.geometry.length - 1) {

		ex = road.geometry[geometryId + 1].x;
		ey = road.geometry[geometryId + 1].y;

	} else if (road.successor) {
		// geometryId is already the end of the road
		/** NOTE: 
			- A road's successor may be a junction, but in this situtation, the geometry must be a line
			without offset curve (not sure if there can be a offset.a), can ignore the ex, ey when paving;
			- Besides, if a road is isolated witout a successor, ex, ey is also OK to ignore.
		 */
		if (road.successor.elementType == 'road') {

			var nextGeometry = roads[road.successor.elementId].geometry[0];
			ex = nextGeometry.x;
			ey = nextGeometry.y;
		}
	}

	return new THREE.Vector2(ex, ey);
}

/*
* Sub-Diveide a road's geometries based on road laneOffset record
*
* NOTE: POTENTIAL BUG EXITS! (only works when laneOffset happens only on 'line' geometry)
*
* @Param road
* @Return geometries array of sub-divided geometries of the road
*/
function subDivideRoadGeometry(road) {

	if (!road.laneOffset) {
		return road.geometry;
	}

	var geometries = road.geometry;
	var newGeometries = [];

	for (var i = 0; i < geometries.length; i++) {
	
		var geometry = geometries[i];
		var laneOffsetId = 0;
		var foundHead = false;
	
		if (geometry.type != 'line') {
			console.warn('Divide Lane Offset geometry error: not surpport laneOffset on spiral or arc yet');
			newGeometries.push(geometry);
			continue;
		}

		for (var j = laneOffsetId; j < road.laneOffset.length; j++) {

			var laneOffset = road.laneOffset[j];
			var nextLaneOffsetS = road.laneOffset[j + 1] ? road.laneOffset[j + 1].s : geometries[geometries.length - 1].s + geometries[geometries.length - 1].length;

			if (geometry.s + geometry.length <= laneOffset.s) {
				
				if (!foundHead)
					newGeometries.push(geometry);
				break;

			} else if (laneOffset.s > geometry.s) {

				if (!foundHead) {
					foundHead = true;
					var subGeometry1 = {};
					subGeometry1.s = geometry.s;
					subGeometry1.hdg = geometry.hdg;
					subGeometry1.type = geometry.type;
					subGeometry1.length = laneOffset.s - geometry.s;
					subGeometry1.x = geometry.x;
					subGeometry1.y = geometry.y;
					newGeometries.push(subGeometry1);
				}
				
				var subGeometry2 = {};
				subGeometry2.s = laneOffset.s;
				subGeometry2.hdg = geometry.hdg;
				subGeometry2.type = geometry.type;
				subGeometry2.length = Math.min(geometry.s + geometry.length, nextLaneOffsetS) - laneOffset.s;
				subGeometry2.x = geometry.x + (laneOffset.s - geometry.s) * Math.cos(geometry.hdg);
				subGeometry2.y = geometry.y + (laneOffset.s - geometry.s) * Math.sin(geometry.hdg);

				if (laneOffset.a != 0 || laneOffset.b != 0 || laneOffset.c != 0 || laneOffset.d != 0) {
					subGeometry2.offset = {};
					subGeometry2.offset.a = laneOffset.a;
					subGeometry2.offset.b = laneOffset.b;
					subGeometry2.offset.c = laneOffset.c;
					subGeometry2.offset.d = laneOffset.d;
				}

				newGeometries.push(subGeometry2);
				laneOffsetId++;

			} else if (laneOffset.s == geometry.s){
				
				if (!foundHead) foundHead = true;

				var subGeometry = {};
				subGeometry.s = geometry.s;
				subGeometry.hdg = geometry.hdg;
				subGeometry.type = geometry.type;
				subGeometry.length = Math.min(geometry.s + geometry.length, nextLaneOffsetS) - laneOffset.s;
				subGeometry.x = geometry.x;
				subGeometry.y = geometry.y;

				if (laneOffset.a != 0 || laneOffset.b != 0 || laneOffset.c != 0 || laneOffset.d != 0) {
					subGeometry.offset = {};
					subGeometry.offset.a = laneOffset.a;
					subGeometry.offset.b = laneOffset.b;
					subGeometry.offset.c = laneOffset.c;
					subGeometry.offset.d = laneOffset.d;
				}

				newGeometries.push(subGeometry);
				laneOffsetId++;

			} else {
				break;
			}
		}
	}

	return newGeometries;
}

/*
* Pre-process each road's geometry entries based on laneOffset, making sure in each geometry, there is only one kind of laneOffset
* @Param roads
*/
function preProcessing(roads) {
	for (var id in roads) {
		var road = roads[id];
		road.geometry = subDivideRoadGeometry(road);

		// assign central reference line's position 
		// and end position for each sub-devided geometry
		for (var j=0; j < road.geometry.length; j++) {
			var geometry = road.geometry[j];
			var endPoint = getGeoemtryEndPoint(road, j);
			geometry.ex = endPoint.x;
			geometry.ey = endPoint.y;
			geometry.centralX = geometry.x;
			geometry.centralY = geometry.y;
		}
	}
}

function createLine(length, sx, sy, hdg) {

	var material = new THREE.MeshBasicMaterial({color: 0xFF0000});

	var z = 0;
	var lineCurve = new THREE.LineCurve3(
		new THREE.Vector3(sx, sy, z),
		new THREE.Vector3(sx + length * Math.cos(hdg), sy + length * Math.sin(hdg), z)
	);
	var geometry = new THREE.Geometry();
	geometry.vertices = lineCurve.getPoints(2);

	var line = new THREE.Line(geometry, material);
	
	return line;
}

/*
* Create sample points of an Eular-Spiral connecting points (sx, sy) to (ex, ey)
*
* @Param length length of the curve
* @Param sx, sy the starting point of the spiral
* @Param hdg heading direction (rotation of z axis) at start of the road
* @Param curvStart the curvature at the starting point - obslete (can delete)
* @Param curvEnd curvature of the ending point
* @Param ex, ey the ending point of the spiral
* @Param tOffset the constant offset away from central clothoid (used to draw paralell curve to clothoid)
*
* NOTE: the following two pameters are only used when drawing road marks (multiple marks on geometry spiral), may need adjust to accomodate mulitple width on geometry spiral
*
* @Param subOffset given the paramters of a whole segment of Eular-Spiral, the sub-segment's start sOffset from the start of the spiral (sx, sy)
* @Param subLength given the parameters of a while segment of Eular-Spiral, the sub-segemetn's run-through length
*
* @Return sample points
*/
function generateSpiralPoints(length, sx, sy, hdg, curvStart, curvEnd, ex, ey, tOffset, subOffset, subLength) {

	var points = [];
	var heading = [];
	var k = (curvEnd - curvStart) / length;

	var theta = hdg; 	// current heading direction
	var preS = 0;
	var s = 0;

	var reverse = false;
	
	var quaternion = new THREE.Quaternion();
	var point;

	do {

		if (s == 0) {
			points.push(new THREE.Vector2(sx, sy));
			heading.push(theta)
			s += step;
			continue;
		}

		if (s > length) s = length;

		var curvature = (s + preS) * 0.5 * k + curvStart;
		var prePoint = points[points.length - 1];
		
		x = prePoint.x + (s - preS) * Math.cos(theta + curvature * (s - preS) / 2);
		y = prePoint.y + (s - preS) * Math.sin(theta + curvature * (s - preS) / 2);
		
		theta += curvature * (s - preS);
		preS = s;
		s += step;
		
		points.push(new THREE.Vector3(x, y, 0));
		heading.push(theta);
		
	} while (s < length + step);

	// fix the error by altering the end point to he connecting road's start
	if (ex && ey) {

		var delta = new THREE.Vector3(ex - points[points.length - 1].x, ey - points[points.length - 1], 0);
		points[points.length - 1].x = ex;
		points[points.length - 1].y = ey;

		// distrubte error across sample points for central clothoid 		
		for (var i = points.length - 2; i > -1; i--) {
			points[i].x += delta.x * (i + 1) / points.length;
			points[i].y += delta.y * (i + 1) / points.length;
		}
	}

	if (Math.abs(tOffset)) {

		// shift points at central clothoid by tOffset to get the parallel curve points
		for (var i = 0; i < points.length; i++) {

			var point = points[i];
			var currentHeading = heading[i];

			// vector in s-t, then rotate to x-y by -currentHeading, then traslate to point.x, point.y
			point.x += Math.abs(tOffset) * Math.cos(currentHeading + Math.PI / 2 * Math.sign(tOffset));
			point.y += Math.abs(tOffset) * Math.sin(currentHeading + Math.PI / 2 * Math.sign(tOffset));
		}
	}

	// if  needs take only part of the segment
	if (subOffset && subLength) {
		
		var p1, p2;
		var startPoint, endPoint;

		// extract the sample points for the sub spiral
		var startIndex = Math.floor(subOffset / step);
		var startIndexDiff = subOffset / step - startIndex;

		if (subOffset + subLength < length - 1E-4) {
			var endIndex = Math.floor(subOffset + subLength / step);
			var endIndexDiff = (subOffset + subLength) / step - endIndex;
		} else {
			var endIndex = points.length - 1;
			var endIndexDiff = 0;
		}

		// extract points from startIndex + diff to endIndex + diff
		p1 = points[startIndex];
		p2 = points[startIndex + 1];
		startPoint = new THREE.Vector2(p1.x + startIndexDiff / step * (p2.x - p1.x), p1.y + startIndexDiff / step * (p2.y - p1.y));
		points[startIndex] = startPoint;

		if (endIndexDiff > 0) {
			p1 = points[endIndex];
			p2 = points[endIndex + 1] || new THREE.Vector2();
			endPoint = new THREE.Vector2(p1.x + endIndexDiff / step * (p2.x - p1.x), p1.y + endIndexDiff / step * (p2.y - p1.y));
			endIndex = endIndex + 1;
			points[endIndex] = endPoint;
		}

		points.splice(endIndex + 1);
		points.splice(0, startIndex);
	}

	return points;
}

function createSpiral(length, sx, sy, hdg, curvStart, curvEnd, ex, ey, tOffset, subOffset, subLength) {

	var material = new THREE.MeshBasicMaterial({color: 0xFFC125});
	var points = generateSpiralPoints(length, sx, sy, hdg, curvStart, curvEnd, ex, ey, tOffset, subOffset, subLength);
	var path = new THREE.Path(points);
	var geometry = path.createPointsGeometry(points.length);
	var spiral = new THREE.Line(geometry, material);

	return spiral;
}

/*
* Helper function for generateClothoid
*
* Rotate shape about (cx, cy) by hdg degree in x-y plane
* @Param points sample points of the shape
* @Param (cx, cy) the rotation center
* @Param hdg the degree to rotate
*/
function rotateAbout(points, cx, cy, hdg) {

	// move (cx, cy) to (0,0)
	for (var i = 0; i < points.length; i++) {
		var point = points[i];
		point.x -= cx;
		point.y -= cy;

		var tmpx = point.x;
		var tmpy = point.y;
		point.x = tmpx * Math.cos(hdg) - tmpy * Math.sin(hdg);
		point.y = tmpx * Math.sin(hdg) + tmpy * Math.cos(hdg);

		point.x += cx;
		point.y += cy;

	}
}

/*
* Genereate sample points for a clothoid spiral
*
* @Param length the arc length trhoughtou the curve
* @Param sx, sy the start position of the curve
* @Param hdg the heading direction of the starting point
* @Param curvStart curvature of the starting point
* @Param curvEnd curvature of the ending point
* @Param tOffset the constant offset from clothoid (used to draw paralell curve to clothoid)
* @Return sample points
*/
function generateClothoidPoints(length, sx, sy, hdg, curvStart, curvEnd, tOffset) {

	/* S(x) for small x */
	var sn = [-2.99181919401019853726E3, 7.08840045257738576863E5, -6.29741486205862506537E7, 2.54890880573376359104E9, -4.42979518059697779103E10, 3.18016297876567817986E11];
	var sd = [2.81376268889994315696E2, 4.55847810806532581675E4, 5.17343888770096400730E6, 4.19320245898111231129E8, 2.24411795645340920940E10, 6.07366389490084639049E11];

	/* C(x) for small x */
	var cn = [-4.98843114573573548651E-8, 9.50428062829859605134E-6, -6.45191435683965050962E-4, 1.88843319396703850064E-2, -2.05525900955013891793E-1, 9.99999999999999998822E-1];
	var cd = [3.99982968972495980367E-12, 9.15439215774657478799E-10, 1.25001862479598821474E-7, 1.22262789024179030997E-5, 8.68029542941784300606E-4, 4.12142090722199792936E-2, 1.00000000000000000118E0];

	/* Auxiliary function f(x) */
	var fn = [4.21543555043677546506E-1, 1.43407919780758885261E-1, 1.15220955073585758835E-2, 3.45017939782574027900E-4, 4.63613749287867322088E-6, 3.05568983790257605827E-8, 1.02304514164907233465E-10, 1.72010743268161828879E-13, 1.34283276233062758925E-16, 3.76329711269987889006E-20];
	var fd = [7.51586398353378947175E-1, 1.16888925859191382142E-1, 6.44051526508858611005E-3, 1.55934409164153020873E-4, 1.84627567348930545870E-6, 1.12699224763999035261E-8, 3.60140029589371370404E-11, 5.88754533621578410010E-14, 4.52001434074129701496E-17, 1.25443237090011264384E-20];

	/* Auxiliary function g(x) */
	var gn = [5.04442073643383265887E-1, 1.97102833525523411709E-1, 1.87648584092575249293E-2, 6.84079380915393090172E-4, 1.15138826111884280931E-5, 9.82852443688422223854E-8, 4.45344415861750144738E-10, 1.08268041139020870318E-12, 1.37555460633261799868E-15, 8.36354435630677421531E-19, 1.86958710162783235106E-22];
	var gd = [1.47495759925128324529E0, 3.37748989120019970451E-1, 2.53603741420338795122E-2, 8.14679107184306179049E-4, 1.27545075667729118702E-5, 1.04314589657571990585E-7, 4.60680728146520428211E-10, 1.10273215066240270757E-12, 1.38796531259578871258E-15, 8.39158816283118707363E-19, 1.86958710162783236342E-22];

	function polevl(x, coef, n) {
		var ans = 0;
		for (var i = 0; i <= n; i++) {
			ans = ans * x + coef[i];
		}
		return ans;
	}

	function p1evl(x, coef, n) {
		var ans = x + coef[0];
		for (var i = 0; i < n; i++) {
			ans = ans * x + coef[i];
		}
		return ans;
	}

	function fresnel(xxa) {
		var f, g, cc, ss, c, s, t, u;
		var x, x2;
		var point = new THREE.Vector2();

		x  = Math.abs( xxa );
		x2 = x * x;

		if ( x2 < 2.5625 ) {
			t = x2 * x2;
			ss = x * x2 * polevl (t, sn, 5) / p1evl (t, sd, 6);
			cc = x * polevl (t, cn, 5) / polevl (t, cd, 6);
		} else if ( x > 36974.0 ) {
			cc = 0.5;
			ss = 0.5;
		} else {
			x2 = x * x;
			t = M_PI * x2;
			u = 1.0 / (t * t);
			t = 1.0 / t;
			f = 1.0 - u * polevl (u, fn, 9) / p1evl(u, fd, 10);
			g = t * polevl (u, gn, 10) / p1evl (u, gd, 11);

			t = M_PI * 0.5 * x2;
			c = cos (t);
			s = sin (t);
			t = M_PI * x;
			cc = 0.5 + (f * s - g * c) / t;
			ss = 0.5 - (f * c + g * s) / t;
		}

		if ( xxa < 0.0 ) {
			cc = -cc;
			ss = -ss;
		}

		point.x = cc;
		point.y = ss;

		return point;
	}

	var stepCnt = 100;
	var scalar = Math.sqrt(length / Math.max(Math.abs(curvStart), Math.abs(curvEnd))) * Math.sqrt(Math.PI);
	var startArcLength = length * (Math.min(Math.abs(curvStart), Math.abs(curvEnd)) / Math.abs(curvStart - curvEnd));
	var reverse = false;
	var t = 0, Rt, At, x, y;
	var points = [];

	if (Math.abs(curvEnd) < Math.abs(curvStart)) {
		// the start of the normal spiral should be the end of the resulting curve
		reverse = true;
	}
	
	for (var s = startArcLength; s < startArcLength + length + length/stepCnt; s += length / stepCnt) {

		if (s > startArcLength + length) s  = startArcLength + length;

		t =  s / scalar;
		var point = fresnel(t);
		//Rt = (0.506 * t + 1) / (1.79 * Math.pow(t, 2) + 2.054 * t + Math.sqrt(2));
		//At = 1 / (0.803 * Math.pow(t, 3) + 1.886 * Math.pow(t,2) + 2.524 * t + 2);
		//x = 0.5 - Rt * Math.sin(Math.PI / 2 * (At - Math.pow(t, 2)));
		//y = 0.5 - Rt * Math.cos(Math.PI / 2 * (At - Math.pow(t, 2)));
		if (Math.sign(curvStart + curvEnd) < 0) point.y *= -1;
		point.x *= scalar;
		point.y *= scalar;

		// add offset along normal direction (prependicular to tangent)
		var curv = s / length * Math.abs(curvEnd - curvStart);
		var theta = s / 2 * curv;
		if (Math.sign(curvStart + curvEnd) <0) theta *= -1;
		point.x += Math.abs(tOffset) * Math.cos(theta + Math.PI / 2 * Math.sign(tOffset));
		point.y += Math.abs(tOffset) * Math.sin(theta + Math.PI / 2 * Math.sign(tOffset));
		if (point.x < 1e-10) point.x = 0;

		points.push(point);
	}

	// transform
	var len = points.length;
	if (reverse) {
		var tmp;
		for (var i = 0; i < len / 2; i++) {
			tmp = points[i].y;
			points[i].y = points[len - 1 - i].y;
			points[len - 1 - i].y = tmp;
		}
	}
	if (startArcLength != 0 || reverse) {
		for (var i = 1; i < len; i++) {
			points[i].x -= points[0].x;
			points[i].y -= (points[0].y - tOffset);
		}
		points[0].x = 0;
		points[0].y = tOffset;
	}
	if (reverse) {
		var alpha = Math.sign(curvStart + curvEnd) * (startArcLength + length) * Math.max(Math.abs(curvStart), Math.abs(curvEnd)) / 2;
		rotateAbout(points, points[0].x, points[0].y, alpha);
	}

	rotateAbout(points, 0, 0, hdg);

	for (var i = 0; i < points.length; i++) {
		var point = points[i];
		point.x += sx;
		point.y += sy;
	}
	/*
	// calculate length and error
	var s = 0;
	for (var i = 1; i < points.length; i++) {
		s += Math.sqrt(Math.pow(points[i].x - points[i-1].x, 2) + Math.pow(points[i].y - points[i-1].y, 2));
	}
	*/
	return points;
}

function createClothoid(length, sx, sy, hdg, curvStart, curvEnd, tOffset) {

	if (curvStart == curvEnd) {
		console.warn('clothoid error: invalid curvature, use line or arc to draw');
		return;
	}

	var points = generateClothoidPoints(length, sx, sy, hdg, curvStart, curvEnd, tOffset ? tOffset : 0);

	var path = new THREE.Path(points);
	var geometry = path.createPointsGeometry(points.length);
	var material = new THREE.MeshBasicMaterial({color: 0xFFC125});
	var clothoid = new THREE.Line(geometry, material);
	
	return clothoid;
}

/*
* Create sample points for a cicular arc (step is 1m)
*
* @Param length the length of arc
* @Param sx, sy the start of the arc
* @Param hdg heading diretion at start of the arc (rotation of z axis)
* @Param curvature curvature of the arc
* @Param ex, ey the start of the next connecting point (as end of the arc), used for fixing errors
* @Return sample points
*/
function generateArcPoints(length, sx, sy, hdg, curvature) {

	var points = [];
	
	var currentHeading = hdg;
	var preS = 0;
	var s = 0;
	var prePoint, x, y;

	do {

		if (s == 0) {
			points.push(new THREE.Vector2(sx, sy));
			s += step;
			continue;
		}

		if (s > length) s = length;

		prePoint = points[points.length - 1];
		
		x = prePoint.x + (s - preS) * Math.cos(currentHeading + curvature * (s - preS) / 2);
		y = prePoint.y + (s - preS) * Math.sin(currentHeading + curvature * (s - preS) / 2);
		points.push(new THREE.Vector2(x, y));

		currentHeading += curvature * (s - preS);
		preS = s;
		s += step;

	} while (s < length + step);

	return points;
}

/*
* Create an arc with constant curvature from a starting point with fixed length
*
* @Param length the length of the arc
* @Param sx, sy the start of the arc
* @Param hdg heading direction at start of the arc (roation of of z axis)
* @Param curvature curvature of the arc
*/
function createArc(length, sx, sy, hdg, curvature) {

	var material = new THREE.MeshBasicMaterial({color: 0x3A5FCD});

	var radius = 1 / Math.abs(curvature);
	var rotation = hdg - Math.sign(curvature) * Math.PI / 2;

	var curve = new THREE.EllipseCurve(
		//0, 0,							// ax, ay
		sx - radius * Math.cos(rotation), sy - radius * Math.sin(rotation),
		radius, radius,					// xRadius, yRadius
		0, length * curvature,			// aStartAngle, aEndAngle
		curvature > 0 ? false : true,	// aClockwise
		rotation						// aRotation		
	);

	var path = new THREE.Path(curve.getPoints(50));
	var geometry = path.createPointsGeometry(50);

	// Create the final object to add to the scene
	var ellipse = new THREE.Line(geometry, material);

	return ellipse;
	/*
	var points = generateArcPoints(length, sx, sy, hdg, curvature);
	var path = new THREE.Path(points);
	var geometry = path.createPointsGeometry(points.length);
	var arc = new THREE.Line(geometry, new THREE.MeshBasicMaterial({color: 0xFF0000}));
	
	return arc;*/
}

/*
* Generate sample points for a cubic polynomial
*
* @Param offset where does horizontal axis begin (before transformation)
* @Param length the distance between start and end points along the horizontal axis (before the transformation)
* @Param sx, sy the starting position of the actual 'horizontal' axis
* @Param hdg the heading of the starting point
* @Param a,b,c,d the parameters of the cubic polynomial
*/
function generateCubicPoints(offset, length, sx, sy, hdg, a, b, c, d) {
//console.log('generate Cubic Points: offset=' + offset + ' length=' + length + ' (sx, sy)=(' + sx + ', ' + sy + ') hdg=' + hdg + ' a=' + a + ' b=' + b + ' c=' + c + ' d=' + d);
	var stepCnt = 100;
	var points = [];

	for (var ds = offset; ds < offset + length + length / stepCnt; ds += length / stepCnt) {

		if (ds > offset + length) ds = offset + length;

		var tmpx = ds - offset;
		var tmpy = a + b * ds + c * Math.pow(ds, 2) + d * Math.pow(ds, 3);

		// rotate about (0,0) by hdg, then translate by (sx, sy)
		var x = tmpx * Math.cos(hdg) - tmpy * Math.sin(hdg) + sx;
		var y = tmpx * Math.sin(hdg) + tmpy * Math.cos(hdg) + sy;
		points.push(new THREE.Vector2(x, y));

	}

	return points;
}

/*
* Create a cubic line (a ploynomial function of third order) with
* t = a + b*ds + c*ds^2 + d*ds^3, ds is the distance along the reference line between the start of the entry (laneSection) and the actual position
*
* @Param length the length of the original reference line (now assume geometry is of only type 'line')
* @Param sx, sy the start of the curve
* @Param hdg heading direction at start of the curve
* @Param a, b, c, d parameters of the cubic polynomial
*/
function createCubic(length, sx, sy, hdg, a, b, c, d) {

	// since geometry is divided on laneOffset, each geometry starts at offset = 0 along a laneOffset (ds starts from 0) if geometry offset exists, when createCubic is called
	var offset = 0;
	var points = generateCubicPoints(offset, length, sx, sy, hdg, a, b, c, d);
	var path = new THREE.Path(points);
	var geometry = path.createPointsGeometry(points.length);
	var material = new THREE.MeshBasicMaterial({color: 0xFF0000});
	var cubic = new THREE.Line(geometry, material);

	return cubic;
}

/*
* Draw referece line of a given geometry in s-t direction
*/
function drawReferenceLineST(geometry) {

	var s = 0;
	var preS = 0;
	var currentHeading = geometry.hdg;

	for (s = 0; s < length + step; s += step) {

		if (s > length) s = length;

		switch (geometry.type) {

			case 'line':

				break;
		}

		preS = s;
	}
}


/*
* Draw the reference line of a given geometry
* @Param geometry
* @Param nextGeometry reference line of the proceeding one
*/
function drawRefrenceLine(geometry) {

	var mesh;
	switch(geometry.type) {
		case 'line':
			if (!geometry.offset) scene.add(createLine(geometry.length, geometry.x, geometry.y, geometry.hdg));
			// if lane has offset, geometry also has an entry of offset after parsed from subDivideRoadGeometry, now assume laneoffset only exists on line geometry
			if (geometry.offset) {
				// original geometry line without lane offset in green
				//drawCustomLine([new THREE.Vector2(geometry.x, geometry.y), new THREE.Vector2(geometry.x + geometry.length * Math.cos(geometry.hdg), geometry.y + geometry.length * Math.sin(geometry.hdg))]);
				// if offset only contians a constant, still draw a line
				if (geometry.offset.b == 0 && geometry.offset.c == 0 && geometry.offset.d == 0) {
					var x = geometry.centralX + Math.abs(geometry.offset.a) * Math.cos(geometry.hdg + Math.PI / 2 * Math.sign(geometry.offset.a));
					var y = geometry.centralY + Math.abs(geometry.offset.a) * Math.sin(geometry.hdg + Math.PI / 2 * Math.sign(geometry.offset.a));
					mesh = createLine(geometry.length, x, y, geometry.hdg);
				} else {
					// need to draw a cubic curve
					mesh = createCubic(geometry.length, geometry.centralX, geometry.centralY, geometry.hdg, geometry.offset.a, geometry.offset.b, geometry.offset.c, geometry.offset.d);
				}
			}
			break;
		case 'spiral':
			if (geometry.offset.a || geometry.offset.b || geometry.offset.c || geometry.offset.d) {
				console.warn('reference line error (spiral): not surpport laneOffset on spiral or arc yet');
				return;
			}
			try {
				mesh = createSpiral(geometry.length, geometry.x, geometry.y, geometry.hdg, geometry.spiral.curvStart, geometry.spiral.curvEnd, geometry.ex, geometry.ey);
			} catch(e) {
				console.error(e.stack)
			}
			break;
		case 'arc':
			if (geometry.offset.a || geometry.offset.b || geometry.offset.c || geometry.offset.d) {
				console.warn('reference line error (arc): not surpport laneOffset on spiral or arc yet');
				return;
			}
			mesh = createArc(geometry.length, geometry.x, geometry.y, geometry.hdg, geometry.arc.curvature);
			break;
	}

	// referec line's horizontal positon sets to 0.001 (higher than lanes and same as roadMarks' 0.001 to be on top to avoid covering)
	mesh.position.set(0, 0, 0.001)
	scene.add(mesh);
}

/*
* Draw the reference line of a road
* @Param road road parsed from .xodr
*/
function drawRoad(road) {

	// sub divide road's geometry if necessary, i.e when laneOffset record exists
	var geometries = road.geometry;

	for (var i = 0; i < geometries.length; i++) {

		var geometry = geometries[i];
		if (!geometry.offset) geometry.offset = {sOffset: 0, a: 0, b: 0, c: 0, d: 0};
	
		drawRefrenceLine(geometry);
	}
}

/*
* Draw the reference line for all roads
*
* NOTE: for the geometry of reference line is defined in plan view, all points are in x-y plane, thus using just 2D points for now (need 3D points for superelevation and crossfall)
*
* @Param roads roads info parsed from .xodr
*/
function drawRoads(roads) {
	for (var id in roads) {
		drawRoad(roads[id]);
	}
}

/*
* Create a rectangle shape by walking along vertices v1, v2, v3, v4
*
* @Param v1, v2, v3, v4 vertices in 2D Vector
*/
function createRectShape(v1, v2, v3, v4) {

	var shape = new THREE.Shape();
	shape.moveTo(v1.x, v1.y);
	shape.lineTo(v2.x, v2.y);
	shape.lineTo(v3.x, v3.y);
	shape.lineTo(v4.x, v4.y);

	return shape;
}

/*
* Create a custom shape defined by innerBorder points and outerBorder points
*
* NOTE: according to the way of generating sample border poitns, due to js's caculation error, the last step may just close to length but smaller, thus adding another step to let the step oversize to be clamped to length, this point is very close to the last second one (after reversed generated sample outerBorder, the two problemtic points is oBorder's first two point)
* When drawing road#509 geometry#4 and geometry#5 (bot are 'line'), the above situation causes a triangulate error
* But 3 triangulate errors remain after adding the checking for extremely adjacent points
* No errors happen for crossing8.xdor if handle the adjacent points before create custome line
*
* @Param iBorderPoints spline points for inner border spline
* @Param oBorderPoints spline points for outer border spline
*/
function createCustomShape(iBorderPoints, oBorderPoints) {

	var shape = new THREE.Shape();
	shape.moveTo(iBorderPoints[0].x, iBorderPoints[0].y);
	for (var i = 1; i < iBorderPoints.length; i++) {
		shape.lineTo(iBorderPoints[i].x, iBorderPoints[i].y);
	}
	for (var i = 0; i < oBorderPoints.length; i++) {
		//if (i < oBorderPoints.length - 1 && oBorderPoints[i].distanceTo(oBorderPoints[i + 1]) < 1E-15) {
		//	console.log('oBorderPoints#' + i + ' and #' + (i + 1) + ' too close: distance ' + oBorderPoints[i].distanceTo(oBorderPoints[i + 1]));
		//	continue;
		//}
		shape.lineTo(oBorderPoints[i].x, oBorderPoints[i].y);
	}
	shape.lineTo(iBorderPoints[0].x, iBorderPoints[0].y);

	return shape;
}

/*
* Create an arc ring shape given arc center, inner border curvature, length, outer border radius, v1, and v3
*
* @Param center 2D Vector the center of the arc
* @Param v1, v3 2D Vector two of the vertices
* @Param iRadius the radius of the innder border arc
* @Param oRadius the radius of the outer border arc
* @Param rotation the rotation direction of the 
* @Param theta the angel swept by the arc
* @Param isClockwise true if inner border arc is clockwise, false if not
*
*	  ----- v1---- inner border ---v2 ----				v4---------------------v3
*			|						|		or			|						|
*			|						|					|						|
*			v4---------------------v3		 	  ----- v1---- inner border ---v2 ----	 
*/
function createArcShape(center, v1, v3, iRadius, oRadius, rotation, theta, isClockwise) {

	var shape = new THREE.Shape();
	shape.moveTo(v1.x, v1.y);
	shape.absarc(center.x, center.y, iRadius, rotation, rotation + theta, isClockwise);
	shape.lineTo(v3.x, v3.y);
	shape.absarc(center.x, center.y, oRadius, rotation + theta, rotation, !isClockwise);
	//shape.lineTo(v1.x, v1.y);		// if add this line, road#515 geometry#2 lane#-2 won't draw, same error happens to road#517 do not know why
	
	return shape;
}

/*
* Helper function for paving - test iBorder or oBorder
*/
function drawCustomLine(points, color, zOffset) {

	var path = new THREE.Path(points);
	var geometry = path.createPointsGeometry(points.length);
	var material = new THREE.MeshBasicMaterial({color: color != undefined ? color : 0x00FF00});
	var mesh = new THREE.Line(geometry, material);
	mesh.position.set(0, 0, zOffset || 0)
	scene.add(mesh);
}

/*
* Helper function for paving - reverse oBorder points to connect with iBorder in counter-clockwise or clockwise direction
* NOTE: passing argumnent points is passed by ptr
*/
function reversePoints(points) {

	for (var i = 0; i < points.length / 2; i++) {
		var tmp = points[i];
		points[i] = points[points.length - 1 - i];
		points[points.length - i - 1] = tmp;
	}
}

/*
* Draw road mark given the reference line geometry
*
* NOTE: draw road mark triangulate error for road509 geometry 4/5 as type 'line'. Do not know WHY?
* for this geometry, reversed lBorder's two first elements only differs a distance of ~e-16, get rid of lBorder[1], it's OK <- not a permernant solution. since error won't happen on the symetrically short line on the other side 
*
* @Param laneSectionStart the start position (s-coodinate), used for finding which road mark entries are for the geometry
* @Param oBorder the outer border line geometry of the lane, it's modified from geometry reference line
* @Param roadMark roadMark array of lane to draw
* 	v1---------------------v2	 t
*	|						|	/|\
*	----- reference line ----	 |
*	|						|	 |______ s 
*	v4---------------------v3			
*/
function drawRoadMark(laneSectionStart, oBorder, roadMarks) {

	if (roadMarks.length == 0) return;

	// road mark color info
	var colorMaterial = {};
	colorMaterial.standard = new THREE.MeshBasicMaterial({color: 0xFFFFFF});
	colorMaterial.blue = new THREE.MeshBasicMaterial({color: 0x0000FF});
	colorMaterial.green = new THREE.MeshBasicMaterial({color: 0x00FF00});
	colorMaterial.red = new THREE.MeshBasicMaterial({color: 0xFF0000});
	colorMaterial.white = new THREE.MeshBasicMaterial({color: 0xFFFFFF});
	colorMaterial.yellow = new THREE.MeshBasicMaterial({color: 0xFFFF00});

	// find which roadMarks are covered by this oBorder seg
	var currentMarks = [];
	for (var i = 0; i < roadMarks.length; i++) {
		var roadMark = roadMarks[i];
		var nextRoadMarkSOffset = roadMarks[i + 1] ? roadMarks[i + 1].sOffset : oBorder.s + oBorder.centralLength;
		if (nextRoadMarkSOffset + laneSectionStart <= oBorder.s) {
			continue;
		} else if (oBorder.s + oBorder.centralLength <= roadMark.sOffset + laneSectionStart) {
			break;
		} else {
			currentMarks.push(roadMark);
		}
	}

	for (var i = 0; i < currentMarks.length; i++) {

		var roadMark = currentMarks[i];

		var nextRoadMarkSOffset = currentMarks[i + 1] ? currentMarks[i + 1].sOffset : oBorder.s + oBorder.centralLength - laneSectionStart;

		if (roadMark.type == 'none') continue;

		var width = roadMark.width;
		var length = Math.min(nextRoadMarkSOffset + laneSectionStart, oBorder.s + oBorder.centralLength) - Math.max(roadMark.sOffset + laneSectionStart, oBorder.s);

		var shape, mesh;

		switch(oBorder.type) {

			case 'line':

				var sOffset = Math.max(roadMark.sOffset + laneSectionStart - oBorder.s, 0);
				var sx = oBorder.centralX + sOffset * Math.cos(oBorder.hdg);
				var sy = oBorder.centralY + sOffset * Math.sin(oBorder.hdg);

				var rBorderPoints = generateCubicPoints(sOffset, length, sx, sy, oBorder.hdg, oBorder.offset.a - width / 2, oBorder.offset.b, oBorder.offset.c, oBorder.offset.d);
				var lBorderPoints = generateCubicPoints(sOffset, length, sx, sy, oBorder.hdg, oBorder.offset.a + width / 2, oBorder.offset.b, oBorder.offset.c, oBorder.offset.d);
				reversePoints(lBorderPoints);

				// handles the following in createCustomeLine function is not enough!
				if (lBorderPoints[1].distanceTo(lBorderPoints[0]) < 1E-14) {
					lBorderPoints.splice(1, 1);
				}

				//shape = createCustomShape(lBorderPoints, rBorderPoints)
				// for raod#509 geometry#4/5, after altering last 2 very adjacent points of outerBorder, the folloowing still causes triangulate error. DO NOT KNOW WHY?
				shape = createCustomShape(rBorderPoints, lBorderPoints);

				break;
			case 'spiral':

				/* NOTE: multiple roadMarks may happen on geometries besides 'line', e.g. road#91 geometry#1*/
				var sOffset = Math.max(roadMark.sOffset + laneSectionStart - oBorder.s, 0);

				var rBorderPoints = generateSpiralPoints(oBorder.length, oBorder.centralX, oBorder.centralY, oBorder.hdg, oBorder.spiral.curvStart, oBorder.spiral.curvEnd, oBorder.ex, oBorder.ey, oBorder.offset.a - width / 2, sOffset, length);
				var lBorderPoints = generateSpiralPoints(oBorder.length, oBorder.centralX, oBorder.centralY, oBorder.hdg, oBorder.spiral.curvStart, oBorder.spiral.curvEnd, oBorder.ex, oBorder.ey, oBorder.offset.a + width / 2, sOffset, length);
				reversePoints(lBorderPoints);

				shape = createCustomShape(rBorderPoints, lBorderPoints);

				break;
			case 'arc':

				var curvature = oBorder.arc.curvature;
				var radius = 1 / Math.abs(curvature);
				var theta = oBorder.length * curvature;
				var rotation = oBorder.hdg - Math.sign(curvature) * Math.PI / 2;
				hdg = oBorder.hdg + theta;

				// get the start point first
				var x = oBorder.x; 
				var y = oBorder.y;

				// calculate v1, v3, and center for the arc shape
				v1 = new THREE.Vector2(x + width / 2 * Math.cos(hdg + Math.PI / 2), y + width / 2 * Math.sin(hdg + Math.PI / 2));
				v3 = new THREE.Vector2(x - radius * Math.cos(rotation) + (radius + Math.sign(curvature) * width / 2) * Math.cos(rotation + theta),
										y - radius * Math.sin(rotation) + (radius + Math.sign(curvature) * width /2) * Math.sin(rotation + theta));
				var center = new THREE.Vector2(x - radius * Math.cos(rotation), y - radius * Math.sin(rotation));

				shape = createArcShape(center, v1, v3, radius - Math.sign(curvature) * width / 2, radius + Math.sign(curvature) * width / 2, rotation, theta, Math.sign(curvature) > 0 ? false : true);

				break;
		}

		try {
			if (!shape) return;
			mesh = new THREE.Mesh(new THREE.ShapeBufferGeometry(shape), colorMaterial[roadMark.color]);
			mesh.position.set(0,0,0.001);
			scene.add(mesh);
		} catch(e) {
			console.info(oBorder.type)
			console.error(e.stack)
		}
	}
}

/*
* Pave a Lane given the reference line geometry of the inner border of the lane
*
* @Param laneSectionStart the start position (s-coodinate), used for finding which width entry is for the geometry
* @Param geometry the reference line geometry of the inner border of the lane (geometry.offset is the offset from central reference line)
* @Param lane lane to pave
* @Return the outerborder geometry of current lane for paving next lane
*
*	  --------- central geometry ---------
*
* 	  ----- v1---- inner border ---v2 ----				v4---------------------v3
*			|						|			or 		|						|
*			|						|					|						|
*			v4---------------------v3			  ----- v1---- inner border ---v2 ----
*
*												  --------- central geometry ---------
*/
function paveLane(laneSectionStart, geometry, lane) {

	if (!geometry || !lane) {
		console.info('pave: invalid lane. skipped')
		return;
	}

	if (lane.id == 0) {
		// width and border is not allowed for center lane. center lane only needs to draw the mark
		drawRoadMark(laneSectionStart, geometry, lane.roadMark);
		return;
	}

	// lane color based on lane type
	var color = {};
	color.default = 0xCFCFCF;
	color.restricted = 0xB3834C;
	color.shoulder = 0x32CD32;

	var x = geometry.x;
	var y = geometry.y;
	var ex = geometry.ex;
	var ey = geometry.ey;
	var centralX = geometry.centralX;
	var centralY = geometry.centralY;
	var hdg = geometry.hdg;
	var length = geometry.length;
	var type = geometry.type;
	var oGeometries = [];	// outer border of current geometry

	/*
	* find which parts of width is covered in this geometry segment 
	* NOTE: cannot reset width.sOffset if a width seg is partially covered by the geometry (due to polynomial's ds definition!)
	* Potential BUG: assuming the above situation does not exist
	*/
	// store the relative width entries covered by this sgement of geometry
	var currentWidth = [];
	for (var i = 0; i < lane.width.length; i++) {
		var width = lane.width[i];
		var nextWidthSOffset = lane.width[i + 1] ? lane.width[i + 1].sOffset : geometry.s + geometry.centralLength - laneSectionStart;
		if (nextWidthSOffset + laneSectionStart <= geometry.s) {
			continue;
		} else if (geometry.s + geometry.centralLength <= width.sOffset + laneSectionStart) {
			break;
		} else {
			currentWidth.push(width);
		}
	}

	/*
	* NOTE: May need to extend to accommodate multiple width and geometry offset for spiral and arc!
	*/
	if (type != 'line' && (currentWidth.length > 1 || geometry.offset.b || geometry.offset.c || geometry.offset.d)) {
		console.warn('pave error (offset): multiple width segments or offset of reference line on spiral and arc is not surpported yet');
		return;
	}

	var v1, v2, v3, v4;
	var shape, mesh;

	if (currentWidth.length == 1) {
		
		var width = currentWidth[0];
		if (width.a == 0 && width.b == 0 && width.c == 0 && width.d == 0) {
			// width 0 lane does not need to be constructed
			oGeometries.push(geometry);
			return oGeometries;
		} else {

			// inner border's shape is due to geometry's offset and type, outer border's shape is due to inner border and lane width
			var oGeometry = {};
			oGeometry.hdg = hdg;
			oGeometry.type = type;
			oGeometry.length = length;
			oGeometry.s = geometry.s;
			oGeometry.centralX = geometry.centralX;
			oGeometry.centralY = geometry.centralY;
			oGeometry.centralLength = geometry.centralLength;

			switch(type) {
				case 'line':
					oGeometry.offset = {};
					oGeometry.offset.sOffset = geometry.s - laneSectionStart;
					/** NOTE: POTENTIAL BUG! when add offset coefficients, make sure their ds starts at the same start **/
					var wOffset =  Math.max(geometry.s - width.sOffset - laneSectionStart, 0);
					oGeometry.offset.a = geometry.offset.a + Math.sign(lane.id) * (width.a + width.b * wOffset + width.c * Math.pow(wOffset, 2) + width.d * Math.pow(wOffset, 3));
					oGeometry.offset.b = geometry.offset.b + Math.sign(lane.id) * (width.b + 2 * width.c * wOffset + 3 * width.d * Math.pow(wOffset, 2));
					oGeometry.offset.c = geometry.offset.c + Math.sign(lane.id) * (width.c + 3 * width.d * wOffset);
					oGeometry.offset.d = geometry.offset.d + Math.sign(lane.id) * width.d;

					if (geometry.offset.b == 0 && geometry.offset.c == 0 && geometry.offset.d == 0 && width.b ==0 && width.c == 0 && width.d == 0) {
						v1 = new THREE.Vector2(x, y);
						v2 = new THREE.Vector2(x + length * Math.cos(hdg), y + length * Math.sin(hdg));
						v3 = new THREE.Vector2(x + length * Math.cos(hdg) + width.a * Math.cos(hdg + Math.PI / 2 * Math.sign(lane.id)), y + length * Math.sin(hdg) + width.a * Math.sin(hdg + Math.PI / 2 * Math.sign(lane.id)));
						v4 = new THREE.Vector2(x + width.a * Math.cos(hdg + Math.PI / 2 * Math.sign(lane.id)), y + width.a * Math.sin(hdg + Math.PI / 2 * Math.sign(lane.id)));
						shape = createRectShape(v1, v2, v3, v4);

						oGeometry.x = v4.x;
						oGeometry.y = v4.y;
						oGeometry.ex = v3.x;
						oGeometry.ey = v3.y;
					} else {
			
						var gOffset = Math.max(width.sOffset + laneSectionStart - geometry.s, 0);
						var iBorderPoints = generateCubicPoints(gOffset, length, centralX, centralY, hdg, geometry.offset.a, geometry.offset.b, geometry.offset.c, geometry.offset.d);
						//drawCustomLine(iBorderPoints, 0xFF6666);
						var oBorderPoints = generateCubicPoints(0, length, centralX, centralY, hdg, oGeometry.offset.a, oGeometry.offset.b, oGeometry.offset.c, oGeometry.offset.d);
						// /drawCustomLine(oBorderPoints, 0x6666FF);
						reversePoints(oBorderPoints);
						shape = createCustomShape(iBorderPoints, oBorderPoints);

						oGeometry.x = x + width.a * Math.cos(hdg + Math.PI / 2 * Math.sign(lane.id));
						oGeometry.y = y + width.a * Math.sin(hdg + Math.PI / 2 * Math.sign(lane.id));
						oGeometry.ex = ex + (width.a + width.b * length + width.c * Math.pow(length, 2) + width.d * Math.pow(length, 3)) * Math.cos(hdg + Math.PI / 2 * Math.sign(lane.id));
						oGeometry.ey = ey + (width.a + width.b * length + width.c * Math.pow(length, 2) + width.d * Math.pow(length, 3)) * Math.sin(hdg + Math.PI / 2 * Math.sign(lane.id));
					}

					break;
				case 'spiral':
					if (currentWidth.length > 1) throw Error('spiral: lane width change happens');
					if (geometry.offset.b || geometry.offset.c || geometry.offset.d) throw Error('spiral: central geometry offset exists');

					/* ALWAYS use the central clothoid and shift by tOffset to find the border when paving along sprial line */
					var w = currentWidth[0].a;
					var curvStart = geometry.spiral.curvStart;
					var curvEnd = geometry.spiral.curvEnd;
					var tOffsetIBorder = geometry.offset.a;
					var iBorderPoints = generateSpiralPoints(length, centralX, centralY, hdg, curvStart, curvEnd, ex, ey, tOffsetIBorder);
					
					/* shifted line from clothoid with a constan width is not clothoid any more! the oLength is shorter than expected
					var oCurvStart = iCurvStart / (1 - w * Math.abs(iCurvStart) * Math.sign(iCurvStart) * Math.sign(lane.id));
					var oCurvEnd = iCurvEnd / (1 - w * Math.abs(iCurvEnd) * Math.sign(iCurvEnd) * Math.sign(lane.id));
					var oLength = length * Math.max(Math.abs(iCurvStart), Math.abs(iCurvEnd)) / Math.max(Math.abs(oCurvStart), Math.abs(oCurvEnd));
					
					var ox = x + w * Math.cos(hdg + Math.PI / 2 * Math.sign(lane.id));
					var oy = y + w * Math.sin(hdg + Math.PI / 2 * Math.sign(lane.id));
					*/
					var tOffsetOBorder = geometry.offset.a + Math.sign(lane.id) * width.a;

					var oBorderPoints = generateSpiralPoints(length, centralX, centralY, hdg, curvStart, curvEnd, ex, ey, tOffsetOBorder);
					reversePoints(oBorderPoints);
					shape = createCustomShape(iBorderPoints, oBorderPoints);

					/* NOTE: for spiral only, all its x,y, ex,ey, curvStart, curvEnd are the same as central reference line, i.e. keeps the same as original geometry when paving across lanes*/
					oGeometry.x = x;
					oGeometry.y = y;
					oGeometry.ex = ex;
					oGeometry.ey = ey;
					oGeometry.spiral = {curvStart: curvStart, curvEnd: curvEnd};
					oGeometry.offset = {sOffset: 0, a: geometry.offset.a + Math.sign(lane.id) * width.a, b: 0, c: 0, d: 0};
					break;
				case 'arc':
					if (currentWidth.length > 1) throw Error('arc: lane width changehappens');
					if (geometry.offset.b || geometry.offset.c || geometry.offset.d) throw Error('arc: central geometry offset exists');

					var w = currentWidth[0].a;
					var curvature = geometry.arc.curvature;
					var radius = 1 / Math.abs(curvature);
					var theta = length * curvature;
					var rotation = hdg - Math.sign(curvature) * Math.PI / 2;
					var center = new THREE.Vector2(x - radius * Math.cos(rotation), y - radius * Math.sin(rotation));
					v1 = new THREE.Vector2(x, y);
					v2 = new THREE.Vector2(v1.x - radius * Math.cos(rotation) + radius * Math.cos(rotation + theta),
											v1.y - radius * Math.sin(rotation) + radius * Math.sin(rotation + theta));
					v3 = new THREE.Vector2(v1.x - radius * Math.cos(rotation) + (radius - Math.sign(lane.id) * Math.sign(curvature) * w) * Math.cos(rotation + theta),
											v1.y - radius * Math.sin(rotation) + (radius - Math.sign(lane.id) * Math.sign(curvature) * w) * Math.sin(rotation + theta));
					v4 = new THREE.Vector2(v1.x - Math.sign(lane.id) * Math.sign(curvature) * w * Math.cos(rotation),
											v1.y - Math.sign(lane.id) * Math.sign(curvature) * w * Math.sin(rotation));
					shape = createArcShape(center, v1, v3, radius, radius - Math.sign(lane.id) * Math.sign(curvature) * w, rotation, theta, Math.sign(curvature) > 0 ? false : true);

					var oCurvature = curvature / (1 - w * Math.abs(curvature) * Math.sign(curvature) * Math.sign(lane.id));
					oGeometry.x = v4.x;
					oGeometry.y = v4.y;
					oGeometry.ex = v3.x;
					oGeometry.ey = v3.y;
					oGeometry.length *= 1 - w / radius * Math.sign(curvature) * Math.sign(lane.id);
					oGeometry.arc = {curvature: oCurvature};
					oGeometry.offset = {sOffset: 0, a: geometry.a + Math.sign(lane.id) * width.a, b: 0, c: 0, d: 0};

					break;
			}

			oGeometries.push(oGeometry);
			// ~ end of paving only one width seg

			try {
				if (lane.type != 'border' && lane.type != 'none') {
					mesh = new THREE.Mesh(new THREE.ShapeBufferGeometry(shape), new THREE.MeshBasicMaterial({color: color[lane.type]? color[lane.type] : color.default}));
					scene.add(mesh);
				}
			} catch(e) {
				console.error(type, e.stack)
			}
		}

	} else {

		for (var i = 0; i < currentWidth.length; i++) {

			var oGeometry = {};
			oGeometry.type = type;
			oGeometry.hdg = hdg;
			oGeometry.centralX = geometry.centralX;
			oGeometry.centralY = geometry.centralY;
			oGeometry.centralLength = geometry.centralLength;

			// offset distance along central geometry (line) from start of the geometry to start of the current width seg
			var width = currentWidth[i];
			var gOffset = Math.max(width.sOffset + laneSectionStart - geometry.s, 0);
			var nextWidthSOffset = currentWidth[i + 1] ? currentWidth[i + 1].sOffset : geometry.s + geometry.centralLength - laneSectionStart;

			// width offset distance along central geometry (line) from start of the width entry to start of the current geometry.s
			var wOffset = Math.max(geometry.s - width.sOffset - laneSectionStart, 0);

			var sx = centralX + gOffset * Math.cos(hdg);
			var sy = centralY + gOffset * Math.sin(hdg);

			var ds = gOffset;
			var tOffset = geometry.offset.a + geometry.offset.b * ds + geometry.offset.c * Math.pow(ds, 2) + geometry.offset.d * Math.pow(ds, 3);
			//drawCustomLine([new THREE.Vector2(sx + Math.abs(tOffset) * Math.cos(hdg + Math.PI / 2 * Math.sign(tOffset)), sy + Math.abs(tOffset) * Math.sin(hdg + Math.PI / 2 * Math.sign(tOffset))), new THREE.Vector2(sx + Math.abs(tOffset) * Math.cos(hdg + Math.PI / 2 * Math.sign(tOffset)) + 10, sy + Math.abs(tOffset) * Math.sin(hdg + Math.PI / 2 * Math.sign(tOffset)))], 0x000001);

			// generate data for oGeometry
			length = Math.min(nextWidthSOffset + laneSectionStart, geometry.s + geometry.centralLength) - Math.max(width.sOffset + laneSectionStart, geometry.s);

			var ds = gOffset + length;
			var tOffset = geometry.offset.a + geometry.offset.b * ds + geometry.offset.c * Math.pow(ds, 2) + geometry.offset.d * Math.pow(ds, 3);
			ex = sx + length * Math.cos(hdg) + Math.abs(tOffset) * Math.cos(hdg + Math.PI / 2 * Math.sign(tOffset));
			ey = sy + length * Math.sin(hdg) + Math.abs(tOffset) * Math.sin(hdg + Math.PI / 2 * Math.sign(tOffset));
			//drawCustomLine([new THREE.Vector2(ex, ey), new THREE.Vector2(ex + 10, ey)], 0x000001);
			
			oGeometry.length = length;
			oGeometry.centralLength = length;
			oGeometry.s = Math.max(width.sOffset + laneSectionStart, geometry.s);

			/** NOTE: make sure WHICH geometry is used here to generate shifted inner border's coefficients! */
			var innerA = geometry.offset.a + geometry.offset.b * gOffset + geometry.offset.c * Math.pow(gOffset, 2) + geometry.offset.d * Math.pow(gOffset, 3);
			var innerB = geometry.offset.b + 2 * geometry.offset.c * gOffset + 3 * geometry.offset.d * Math.pow(gOffset, 2);
			var innerC = geometry.offset.c + 3 * geometry.offset.d * gOffset;
			var innerD = geometry.offset.d;
			var widthA = width.a + width.b * wOffset + width.c * Math.pow(wOffset, 2) + width.d * Math.pow(wOffset, 3);
			var widthB = width.b + 2 * width.c * wOffset + 3 * width.d * Math.pow(wOffset, 2);
			var widthC = width.c + 3 * width.d * wOffset;
			var widthD = width.d;
	
			oGeometry.offset = {};
			oGeometry.offset.sOffset = Math.max(geometry.s - width.sOffset - laneSectionStart, 0);
			oGeometry.offset.a = innerA + Math.sign(lane.id) * widthA;
			oGeometry.offset.b = innerB + Math.sign(lane.id) * widthB;
			oGeometry.offset.c = innerC + Math.sign(lane.id) * widthC;
			oGeometry.offset.d = innerD + Math.sign(lane.id) * widthD;
	
			oGeometry.x = sx + Math.abs(oGeometry.offset.a) * Math.cos(hdg + Math.PI / 2 * Math.sign(oGeometry.offset.a));
			oGeometry.y = sy + Math.abs(oGeometry.offset.a) * Math.sin(hdg + Math.PI / 2 * Math.sign(oGeometry.offset.a));
			
			tOffset = oGeometry.offset.a + oGeometry.offset.b * length  + oGeometry.offset.c * Math.pow(length, 2) + oGeometry.offset.d * Math.pow(length, 3);
			oGeometry.ex = ex + Math.abs(tOffset) * Math.cos(hdg + Math.PI / 2 * Math.sign(tOffset));
			oGeometry.ey = ey + Math.abs(tOffset) * Math.sin(hdg + Math.PI / 2 * Math.sign(tOffset));

			oGeometry.centralX = sx;
			oGeometry.centralY = sy;

			oGeometries.push(oGeometry);

			// generate spline points
			if (!(width.a == 0 && width.b == 0 && width.c == 0 && width.d == 0)) {
				// get inner border spline points
				var iBorderPoints = generateCubicPoints(gOffset, length, sx, sy, hdg, geometry.offset.a, geometry.offset.b, geometry.offset.c, geometry.offset.d);
				//drawCustomLine(iBorderPoints, 0xFF6666);

				// get outer border spline points
				var oBorderPoints = generateCubicPoints(0, length, sx, sy, hdg, oGeometry.offset.a, oGeometry.offset.b, oGeometry.offset.c, oGeometry.offset.d);
				//drawCustomLine(oBorderPoints, 0x6666FF);
				// reverse oBorder points
				reversePoints(oBorderPoints);

				shape = createCustomShape(iBorderPoints, oBorderPoints);
			}

			try {
				if (lane.type != 'border' && lane.type != 'none') {
					mesh = new THREE.Mesh(new THREE.ShapeBufferGeometry(shape), new THREE.MeshBasicMaterial({color: color[lane.type]? color[lane.type] : color.default}));
					scene.add(mesh);
				}
			} catch(e) {
				console.error(type, e.stack)
			}
		}
	}

	// draw road marks
	for (var i = 0; i < oGeometries.length; i++) {
		try {
			drawRoadMark(laneSectionStart, oGeometries[i], lane.roadMark);	
		} catch(e) {
			console.error(e);
		}
	}

	return oGeometries;
}

/*
* Helper for paveLaneSection
*/
function compareLane(laneA, laneB) {

	// a < b by some ordering criterion
	if (Math.abs(laneA.id) < Math.abs(laneB.id)) {
		return -1;
	}
	// a > b by some ordering criterion
	if (Math.abs(laneA.id) > Math.abs(laneB.id)) {
		return 1;
	}
	// a == b
	return 0;
}

/*
* Helper for paveLaneSection
*
* Given the start position of a lane section along a road, return the geometry of the road starting from that position
* to the next lane section's start position if any
* @Param road the road as the reference corodinate system
* @Param laneSectionId
* @return geometries an array of geometries starting from position s to the end of the road
*/ 
function getGeometry(road, laneSectionId) {

	var geometries  = [];
	var found = false;
	var s = road.laneSection[laneSectionId].s;
	var nextS = road.laneSection[laneSectionId + 1] ? road.laneSection[laneSectionId + 1].s : road.geometry[road.geometry.length - 1].s + road.geometry[road.geometry.length - 1].length;

	for (var i = 0; i < road.geometry.length; i++) {
		var geometry = road.geometry[i];
		
		// if already found the start of the returning geometry, copy the rest of the geometries as the suceeding ones until the next lane section starts
		if (found) {
			if (geometry.s + geometry.length <= nextS) {
				geometries.push(road.geometry[i]);
			} else if (geometry.s < nextS) {
				var newGeometry = {};
				newGeometry.x = geometry.x;
				newGeometry.y = geometry.y;
				newGeometry.hdg = geometry.hdg;
				newGeometry.type = geometry.type;
				newGeometry.length = nextS - geometry.s;
				geometries.push(newGeometry);
			} else {
				break;
			}
		}

		// found the geometry segment which contains the starting position
		if (!found) {
			if (geometry.s == s) {
				// s is the start of a geometry segment of the road, push the whole geometry seg if nextS is not covered by the same geometry
				if (geometry.s + geometry.length <= nextS) {
					geometries.push(geometry);
				} else {
					var newGeometry = {};
					newGeometry.x = geometry.x;
					newGeometry.y = geometry.y;
					newGeometry.hdg = geometry.hdg;
					newGeometry.type = geometry.type;
					newGeometry.length = nextS - geometry.s;
					geometries.push(newGeometry);
				}
				found = true;
			} else if (geometry.s < s && geometry.s + geometry.length > s) {
				// calcuate the first geometry element for the returning geometries
				var ds = s - geometry.s;
				var partialGeometry = {};
				partialGeometry.s = s;
				partialGeometry.type = geometry.type;
				partialGeometry.length = geometry.length + geometry.s - s;

				switch(geometry.type) {
					case 'line':
						partialGeometry.x = geometry.x + ds * Math.cos(geometry.hdg);
						partialGeometry.y = geometry.y + ds * Math.sin(geometry.hdg);
						partialGeometry.hdg = geometry.hdg;
						geometries.push(partialGeometry);
						break;
					case 'spiral':
						// need the equation presentation for clothoid
						break;
					case 'arc':
						var curvature = geometry.arc.curvature;
						var radius = 1 / Math.abs(curvature);
						var theta = ds * curvature;
						var rotation = geometry.hdg - Math.sign(curvature) * Math.PI / 2;
						partialGeometry.x = geometry.x - radius * Math.cos(rotation) + radius * Math.cos(rotation + theta);
						partialGeometry.y = geometry.y - radius * Math.sin(rotation) + radius * Math.sin(rotation + theta);
						partialGeometry.hdg = geometry.hdg + theta;
						partialGeometry.arc = {};
						partialGeometry.arc.curvature = geometry.arc.curvature;
						break;
				}
				found = true;
			}
		}
	}

	return geometries;
}

/*
* The number of lanes is constant per laneSection. However, the properties of each lane (e.g. width,
* road marks, friction etc.) may change
*/
function paveLaneSection(road, laneSectionId) {

	// split lanes into three groups: center, left, right, (only left and right) sorted by absoluate value of lane.id in ascending order (-1 -> -n) (1->m)
	var lanes = road.laneSection[laneSectionId].lane;
	var centralLane, leftLanes = [], rightLanes = [];

	for (var i = 0; i < lanes.length; i++) {
		var lane = lanes[i];
		if (lane.id > 0) 
			leftLanes.push(lane);
		else if (lane.id < 0)
			rightLanes.push(lane);
		else
			centralLane = lane;
	}

	// sort leftLanes and rightLanes in ascending order by Math.abs(lane.id)
	leftLanes.sort(compareLane);
	rightLanes.sort(compareLane);

	// accroding to the start postion relative to the road entry, determine from which point on the geometry will be used 
	var start = road.laneSection[laneSectionId].s;
	var geometries = getGeometry(road, laneSectionId);

	// pave lanes for each geometry seg
	for (var i = 0; i < geometries.length; i++ ) {

		// initiate central reference line's geometry (centralX, centralY and ex, ey is assigend during preProcessing(roads))
		var geometry = geometries[i];
		geometry.centralLength = geometry.length;
		if (!geometry.offset) {
			geometry.offset = {sOffset: 0, a: 0, b: 0, c: 0, d: 0};
		} else {
			// when paving roads, geometry.x, geometry.y is the actural reference line's start position! (drawReferenceLine x,y is still the reference line without offset)
			var tOffset = geometry.offset.a;
			geometry.x += Math.abs(tOffset) * Math.cos(geometry.hdg + Math.PI / 2 * Math.sign(tOffset));
			geometry.y += Math.abs(tOffset) * Math.sin(geometry.hdg + Math.PI / 2 * Math.sign(tOffset));
			geometry.offset.sOffset = 0;
		}

		var currentLane = [0];
		var innerGeometries = [geometry];

		// left Lanes
		while (innerGeometries.length) {

			var laneId = currentLane.pop();
			var innerGeometry = innerGeometries.pop();

			for (var j = laneId; j < leftLanes.length; j++) {

				if (j != laneId) {
					innerGeometry = innerGeometries.pop();
					currentLane.pop();
				}

				try {
					var oGeometries = paveLane(start, innerGeometry, leftLanes[j]);
					if (j != leftLanes.length - 1) {
						for (var k = oGeometries.length; k > 0; k--) {
							innerGeometries.push(oGeometries[k - 1]);
							currentLane.push(j + 1);
						}
					}
				} catch(e) {
					console.info('paving error: road#' + road.id + ' laneSection#' + laneSectionId + ' geometry#' + i + ' lane#' + leftLanes[j].id);
					console.error(e.stack)
				}
			}

		}

		innerGeometries = [geometry];
		currentLane = [0];

		// right Lanes
		while (innerGeometries.length) {

			var laneId = currentLane.pop();
			var innerGeometry = innerGeometries.pop();

			for (var j = laneId; j < rightLanes.length; j++) {

				if (j != laneId) {
					innerGeometry = innerGeometries.pop();
					currentLane.pop();
				}

				try {
					var oGeometries = paveLane(start, innerGeometry, rightLanes[j]);
					if (j != rightLanes.length - 1) {
						for (var k = oGeometries.length; k > 0; k--) {
							innerGeometries.push(oGeometries[k - 1]);
							currentLane.push(j + 1);
						}
					}
				} catch(e) {
					console.info('paving error: road#' + road.id + ' laneSection#' + laneSectionId + ' geometry#' + i + ' lane#' + rightLanes[j].id);
					console.error(e.stack);
				}
			}
		}

		// central lanes - draw on top of right/left lanes to be seen
		try {
			paveLane(start, geometry, centralLane);
		} catch(e) {
			console.info('paving error: road#' + road.id + ' laneSection#' + laneSectionId + ' geometry#' + i + ' lane#' + centralLane.id);
			console.error(e.stack)
		}
	}

}

function paveRoad(road) {

	for (var i  = 0; i < road.laneSection.length; i++) {
		try {
			paveLaneSection(road, i);
		} catch(e) {
			console.info('paving error: road#' + road.id + ' laneSection#' + i);
			console.error(e.message + '\n' + e.stack);
		}
	}

	drawRoad(road);
}

/*
* Pave roads with lanes
* @Param roads array of road parsed from .xodr.
*/
function paveRoads(roads) {

	for (var id in roads) {
		if (id == '119' || id == '91' || id == '1' || id == '509')
		paveRoad(roads[id]);
	}
}

function test() {

	//scene.add(createSpiral(3.1746031746031744e+00, 0, 0, 0, 0, -1.2698412698412698e-01, null, null, 0))
	//scene.add(createSpiral(3.1746031746031744e+00, 0, 0, 0, 0, -1.2698412698412698e-01, null, null, 0, 1, 2))
	//scene.add(createSpiral(3.1746031746031744e+00, 0, 0, 0, 0, -1.2698412698412698e-01, null, null, 1))
	//scene.add(createSpiral(9.1954178989066371e+00, 0, 0, 0, -1.2698412698412698e-01))
	
	//scene.add(createClothoid(3.1746031746031744e+00, 0, 0, 0, -1.2698412698412698e-01, 0, 0))
	//scene.add(createClothoid(3.1746031746031744e+00, 0, 0, 0, -1.2698412698412698e-01, 0, -1))

	//scene.add(createClothoid(3.1746031746031744e+00, -4.6416930098799849e+00, -4.3409256447923106e+00, 0, -1.2698412698412698e-01, 0, -3.75))

	/*
	var width2 = {sOffset: 23, a: 1.8750000000000000e+00, b: 0, c: -1.1027633829036099e-02, d: 3.2551498277724457e-04};
	//var oBorder2 = createCubic(22.585, 0, 0, 0, width2.a, width2.b, width2.c, width2.d);
	//scene.add(oBorder2);
	
	var width1 = {sOffset: 0, a: 0, b: 0, c: 1.0633270321361058e-02, d: -3.0821073395249443e-04}
	//var oBorder1 = createCubic(23, -23, 0, 0, width1.a, width1.b, width1.c, width1.d);
	//scene.add(oBorder1)
	
	var width21 = {sOffset: 0, a: 3.7500000000000000e+00, b: 0, c: -1.5432098765432098e-02, d: 3.8103947568968145e-04};
	var oBorder21 = createCubic(23, 0, 0, 0, width21.a, width21.b, width21.c, width21.d);
	//scene.add(oBorder21);


	var wOffset = 23;
	var widthA = width21.a + width21.b * wOffset + width21.c * Math.pow(wOffset, 2) + width21.d * Math.pow(wOffset, 3);
	var widthB = width21.b + width21.c * wOffset * 2 + width21.d * Math.pow(wOffset, 2) * 3;
	var widthC = width21.c + width21.d * wOffset * 3;
	var widthD = width21.d;
	//scene.add(createCubic(4, wOffset, 0, 0, widthA, widthB, widthC, widthD));
	
	var offset = {sOffset: 0, a: -1.8750000000000000e+00, b: 0, c: 2.5464010864644634e-03, d: -3.6119164347013670e-05}
	var iBorder = createCubic(48, 0, 0, 0, offset.a, offset.b, offset.c, offset.d)
	scene.add(iBorder);

	scene.add(createCubic(23, 0, 0, 0, offset.a + width1.a, offset.b + width1.b, offset.c + width1.c, offset.d + width1.d))
	scene.add(createCubic(23, 0, 0, 0, offset.a + width1.a + width21.a, offset.b + width1.b + width21.b, offset.c + width1.c + width21.c, offset.d + width1.d + width21.d))

	var sOffset = 23;
	var innerA = offset.a + offset.b * sOffset + offset.c * Math.pow(sOffset, 2) + offset.d * Math.pow(sOffset, 3);
	var innerB = offset.b + offset.c * sOffset * 2 + offset.d * Math.pow(sOffset, 2) * 3;
	var innerC = offset.c + offset.d * sOffset * 3;
	var innerD = offset.d;
	scene.add(createCubic(4, sOffset, 0, 0, innerA + width2.a, innerB + width2.b, innerC + width2.c, innerD + width2.d));
	scene.add(createCubic(4, sOffset, 0, 0, innerA + width2.a + widthA, innerB + width2.b + widthB, innerC + width2.c + widthC, innerD + width2.d + widthD));
	*/
	//console.log(oBorder1.geometry.vertices, oBorder2.geometry.vertices, iBorder.geometry.vertices)
}