var scene, camera, renderer;
var container;

parseXML("Crossing8Course.xodr");

init();
animate();

function parseXML(xmlFile) {
	
	if (window.File && window.FileReader && window.FileList && window.Blob) {

		var xmlDoc;

		if (window.DOMParser) {
			parser = new DOMParser();
			xmlDoc = parser.parseFromString(xmlFile, "text/xml");
		} else {
			// Internet Explorer
			xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
			xmlDoc.async = false;
			xmlDoc.loadXML(xmlFile);
		}
		
		var roads = xmlDoc.getElementsByTagName("geometry");
		console.log(xmlDoc);

		return xmlDoc;
	} else {
		alert("File APIs are not fully supported in this browser.");
	}
}

function init() {

	container = document.createElement('div');
	document.body.appendChild(container);

	scene = new THREE.Scene();

	/** Setting up camera */
	camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 1, 1000);
	camera.position.z = 100;
	scene.add(camera);

	/** Setting up light */
	//scene.add(new THREE.AmbientLight(0xf0f0f0));

	/** Settting up Plane with Grid Helper */
	var planeGeometry = new THREE.PlaneGeometry(200, 200);
	planeGeometry.rotateX(- Math.PI / 2);
	var planeMaterial = new THREE.ShadowMaterial();
	planeMaterial.opacity = 0.2;
	var plane = new THREE.Mesh(planeGeometry, planeMaterial);
	plane.receiveShadow = true;
	scene.add(plane);

	var helper = new THREE.GridHelper(200, 100);
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

	/*******
	* Line
	********/
	scene.add(createLine(4.8660000002386400e-01, 2, 1, -7.0710678117841717e+00, 7.0710678119660715e+00, 5.4977871437752235e+00));
	scene.add(createLine(4.8660000002378989e-01, 2, 1, -6.7269896521209764e+00, -6.7269902521517775e+00, 3.9269908169787415e+00))

	/*******
	* Curves
	********/
	scene.add(createSpiral(2, 1, -6.7269896520425938e+00, 6.7269896522231525e+00, 5.4977871437736381e+00, -0.0000000000000000e+00, -4.6416930098385274e+00, 4.3409250448366459e+00));

	scene.add(createArc(9.1954178989066371e+00, 2, 1, -4.6416930098385274e+00, 4.3409250448366459e+00, 5.2962250374496271e+00, -1.2698412698412698e-01));

	scene.add(createSpiral(2, 1, -4.6416930098799849e+00, -4.3409256447923106e+00, 4.1285529233027525e+00, -1.2698412698412698e-01, -6.7269896521209764e+00, -6.7269902521517775e+00));
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
* NOTE: Cannot be sure that THREE's QuadraticBezierCurve is the same as Colothoids. It it is,
* Not sure if the starting curvature is handled correctly here. Need Double Check.
*
* @Param width the width of the road
* @Param height the height of the road
* @Param sx, sy the starting point of the spiral
* @Param hdg heading direction (rotation of z axis) at start of the road
* @Param curvature the curvature at the starting point
* @Param ex, ey the ending point of the spiral
*/
function createSpiral(width, height, sx, sy, hdg, curvature, ex, ey) {

	var material = new THREE.MeshBasicMaterial({color: 0xFFC125});
	var z = 0;

	var controlPoint = new THREE.Vector3(sx + Math.cos(hdg + curvature), sy + Math.sin(hdg + curvature), z);

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