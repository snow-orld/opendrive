var scene, camera, renderer;
var container;

var roads = parseXML("../data/Crossing8Course.xodr");
//var roads = parseXML("../data/CrossingComplex8Course.xodr");
//var roads = parseXML("../data/Roundabout8Course.xodr");	// error - taken as a rare case when spiral ends a geometry
//var roads = parseXML("../data/CulDeSac.xodr");
//var roads = parseXML("../data/Country.xodr");	// move towards upper right to see the roads

init();
animate();

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

	var roadsNode = xmlDoc.getElementsByTagName('road');
	var roads = [];

	for ( var i=0 ; i < roadsNode.length; i++ )
	{
		var roadNode = roadsNode[i];

		roads[i] = {};
		roads[i].id = roadNode.id;
		roads[i].geometry = [];
		
		var geometriesNode = roadNode.getElementsByTagName('geometry');
		for (var j=0; j < geometriesNode.length; j++) {
		
			var geometryNode = geometriesNode[j];

			roads[i].geometry[j] = {};
			roads[i].geometry[j].x = parseFloat(geometryNode.getAttribute('x'));
			roads[i].geometry[j].y = parseFloat(geometryNode.getAttribute('y'));
			roads[i].geometry[j].hdg = parseFloat(geometryNode.getAttribute('hdg'));
			roads[i].geometry[j].length = parseFloat(geometryNode.getAttribute('length'));

			var geometryType = geometryNode.firstElementChild.nodeName;
			var geometryTypeNode = geometryNode.firstElementChild;
			roads[i].geometry[j].type = geometryType;

			switch(geometryType) {
				case 'line':
					break;
				case 'spiral':
					roads[i].geometry[j][geometryType] = {};
					roads[i].geometry[j][geometryType].curvStart = parseFloat(geometryTypeNode.getAttribute('curvStart'));
					// roads[i].geometry[j][geometryType].curvEnd = geometryTypeNode.getAttribute('curvEnd');
					break;
				case 'arc':
					roads[i].geometry[j][geometryType] = {};
					roads[i].geometry[j][geometryType].curvature = parseFloat(geometryTypeNode.getAttribute('curvature'));
					break;
				default:
					throw new Error('invalid geometry type!')
			}
		}
		// test
		//if (i == 0) console.log(roads[i])
	}
	return roads;
}

function init() {

	container = document.createElement('div');
	document.body.appendChild(container);

	scene = new THREE.Scene();

	/** Setting up camera */
	camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 1, 10000);
	camera.position.set(0, 0, 100);
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

	drawRoads(roads);

	// lines
/*	scene.add(createLine(4.8660000002386400e-01, 2, 1, -7.0710678117841717e+00, 7.0710678119660715e+00, 5.4977871437752235e+00));
	scene.add(createLine(4.8660000002378989e-01, 2, 1, -6.7269896521209764e+00, -6.7269902521517775e+00, 3.9269908169787415e+00))
	// Curves
	scene.add(createSpiral(2, 1, -6.7269896520425938e+00, 6.7269896522231525e+00, 5.4977871437736381e+00, -0.0000000000000000e+00, -4.6416930098385274e+00, 4.3409250448366459e+00));
	scene.add(createArc(9.1954178989066371e+00, 2, 1, -4.6416930098385274e+00, 4.3409250448366459e+00, 5.2962250374496271e+00, -1.2698412698412698e-01));
	scene.add(createSpiral(2, 1, -4.6416930098799849e+00, -4.3409256447923106e+00, 4.1285529233027525e+00, -1.2698412698412698e-01, -6.7269896521209764e+00, -6.7269902521517775e+00));
*/
	// Coutry Roads
	scene.add(createLine(5.2576797818161140e+01, 2, 1, 1.0850000000000000e+03, 1.5029609375569712e+03, 1.5707963267948966e+00));

}

function animate() {
	requestAnimationFrame(animate);
	renderer.render(scene, camera);
}

function createLine(length, width, height, sx, sy, hdg) {

	var material = new THREE.MeshBasicMaterial({color: 0xFF0000});

	//var line = new THREE.BoxGeometry(length, width, height);

	var z = 0;
	var lineCurve = new THREE.LineCurve3(
		new THREE.Vector3(sx, sy, z),
		new THREE.Vector3(sx + length * Math.cos(hdg), sy + length * Math.sin(hdg), z)
	);
	var geometry = new THREE.Geometry();
	geometry.vertices = lineCurve.getPoints(2);

	var line = new THREE.Line(geometry, material);
	//mesh.position.x = sx + length / 2;
	//mesh.position.y = sy;
	//mesh.position.z = height / 2;
	return line;
}

/*
* Create an Eular-Spiral connecting points (sx, sy) to (ex, ey), with a starting curvature
*
* NOTE: Cannot be sure that THREE's QuadraticBezierCurve is the same as Colothoids. If it is,
* Not sure if the starting curvature is handled correctly here. Need Double Check.
* For Roundabout8Course.xdor, error happens for undefined nextGeometry when passing arguments. See Line 267.
*
* @Param width the width of the road
* @Param height the height of the road
* @Param sx, sy the starting point of the spiral
* @Param hdg heading direction (rotation of z axis) at start of the road
* @Param curvStart the curvature at the starting point
* @Param ex, ey the ending point of the spiral
*/
function createSpiral(width, height, sx, sy, hdg, curvStart, ex, ey) {

	var material = new THREE.MeshBasicMaterial({color: 0xFFC125});
	var z = 0;

	var controlPoint = new THREE.Vector3(sx + Math.cos(hdg + curvStart), sy + Math.sin(hdg + curvStart), z);

	var curve = new THREE.QuadraticBezierCurve3(
		new THREE.Vector3( sx, sy, z),
		controlPoint,
		new THREE.Vector3(ex, ey, z)
	);

	var geometry = new THREE.Geometry();
	geometry.vertices = curve.getPoints(50);

	// create the final object to add to the scene
	var curveObject = new THREE.Line(geometry, material);

	return curveObject;

	var segments =50;
	var radiusSegments = 4;
	closed = true;
	var tube = new THREE.TubeBufferGeometry(curve, segments, 2, radiusSegments, true);
	
	var tubeMesh = new THREE.Mesh(tube, material);

	return tube;
}

/*
* Create an arc with constant curvature from a starting point with fixed length
*
* @Param length the length of the arc
* @Param width the width of the road
* @Param height the height of the road
* @Param sx, sy the start of the road
* @Param hdg headding direction at start of the road (roation of of z axis)
* @Param curvature curvature of the arc
*/
function createArc(length, width, height, sx, sy, hdg, curvature) {

	var material = new THREE.MeshBasicMaterial({color: 0x3A5FCD});

	var radius = 1 / Math.abs(curvature);
	var rotation = hdg - Math.sign(curvature) * Math.PI / 2;

	var curve = new THREE.EllipseCurve(
		//0, 0,							// ax, ay
		sx - radius * Math.cos(rotation), sy - radius * Math.sin(rotation),
		radius, radius,					// xRaidus, yRadius
		0, length * curvature,	// aStartAngle, aEndAngle
		curvature > 0 ? false : true,	// aClockwise
		//hdg							// aRotation
		rotation
	);

	var path = new THREE.Path(curve.getPoints(50));
	var geometry = path.createPointsGeometry(50);

	// Create the final object to add to the scene
	var ellipse = new THREE.Line(geometry, material);

	return ellipse;
}

/*
* Draw the reference line of a road
*
* @Param road road parsed from .xodr, containing only id and geometry for now.
*/
function drawRoad(road) {

	var width = 2, height = 1;
	var geometries = road.geometry;

	for (var i = 0; i < geometries.length; i++) {
		
		var geometry = geometries[i];
/*		
		if (i == 0) {
			console.log(road)
			for (var p in geometry) {
				console.log(p + ": " + geometry[p])
			}
		}
*/		
		switch(geometry.type) {
			case 'line':
				scene.add(createLine(geometry.length, width, height, geometry.x, geometry.y, geometry.hdg));
				break;
			case 'spiral':
				var nextGeometry = geometries[i + 1];
				try {
					scene.add(createSpiral(width, height, geometry.x, geometry.y, geometry.hdg, geometry.spiral.curvStart, nextGeometry.x, nextGeometry.y));
				}
				catch(e) {
					console.log(road)
					//console.log(geometry)
					console.info("this is an exception that spiral ends a road, which should occur in a continious road without ending with spiral.")
					console.info(e.message)
				}
				break;
			case 'arc':
				scene.add(createArc(geometry.length, width, height, geometry.x, geometry.y, geometry.hdg, geometry.arc.curvature));
		}
	}
}

/*
* Draw roads' reference line
*
* @Param roads array of road parsed from .xodr.
*/
function drawRoads(roads) {

	for (var i = 0; i < roads.length; i++) {
		drawRoad(roads[i]);
	}
}