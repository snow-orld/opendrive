var scene, camera, renderer;
var container;

var roads = parseXML("../data/Crossing8Course.xodr");
//var roads = parseXML("../data/CrossingComplex8Course.xodr");	// lane lateral shift cause incontinious
//var roads = parseXML("../data/Roundabout8Course.xodr");		// error - taken as a rare case when spiral ends a geometry
//var roads = parseXML("../data/CulDeSac.xodr");
//var roads = parseXML("../data/Country.xodr");	// move towards upper right to see the roads

init();
animate();

function init() {

	container = document.createElement('div');
	document.body.appendChild(container);

	scene = new THREE.Scene();

	/** Setting up camera */
	camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.05, 10000);
	camera.position.set(0, 0, 10);
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

	/** draw reference line */
	//drawRoads(roads);

	createCubic(3.7500000000000000e+00,0,-5.5555555555555558e-03,8.2304526748971200e-05);

	createClothoid(-6.7269896520425938e+00, 6.7269896522231525e+00, 5.4977871437736381e+00, 3.1746031746031744e+00, -0.0000000000000000e+00, -1.2698412698412698e-01);
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
	var roads = [];

	for ( var i=0 ; i < roadNodes.length; i++ )
	{
		var roadNode = roadNodes[i];

		roads[i] = {};
		roads[i].id = roadNode.id;	// road id type string
		roads[i].geometry = [];
		roads[i].laneSection = [];
		
		var geometryNodes = roadNode.getElementsByTagName('geometry');
		for (var j=0; j < geometryNodes.length; j++) {
		
			var geometryNode = geometryNodes[j];

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

		var laneSectionNodes = roadNode.getElementsByTagName('laneSection');
		for (var j=0; j < laneSectionNodes.length; j++) {

			var laneSectionNode = laneSectionNodes[j];

			roads[i].laneSection[j] = {};
			roads[i].laneSection[j].singleSide = laneSectionNode.getAttribute('singleSide');
			roads[i].laneSection[j].lane = [];

			var laneNodes = laneSectionNode.getElementsByTagName('lane');
			for (var k=0; k < laneNodes.length; k++) {

				var laneNode = laneNodes[k];
				var lane = roads[i].laneSection[j].lane[k];

				roads[i].laneSection[j].lane[k] = {};
				roads[i].laneSection[j].lane[k].id = parseInt(laneNode.getAttribute('id'));
				roads[i].laneSection[j].lane[k].type = laneNode.getAttribute('type');

				// 1+ if no <border> entry is present - not allowed for center lane
				var widthNodes = laneNode.getElementsByTagName('width');
				if (widthNodes.length) roads[i].laneSection[j].lane[k].width = [];

				// 1+ if no <width> entry is present - not allowed for center lane
				var borderNodes = laneNode.getElementsByTagName('border');
				if (borderNodes.width) roads[i].laneSection[j].lane[k].border = [];

				// 0+
				var roadMakrNodes = laneNode.getElementsByTagName('roadMark');
				roads[i].laneSection[j].lane[k].roadMark = [];		

				// 0+ not allowed for center lane
				var materialNodes = laneNode.getElementsByTagName('material');
				if (materialNodes.length) roads[i].laneSection[j].lane[k].material = [];		
				
				// 0+ not allowed for center lane
				var visibilityNodes = laneNode.getElementsByTagName('visibility');
				if (visibilityNodes.length) roads[i].laneSection[j].lane[k].visibility = [];

				// 0+ not allowed for center lane
				var speedNodes = laneNode.getElementsByTagName('speed');
				if (speedNodes.length) roads[i].laneSection[j].lane[k].speed = [];
				
				// 0+ not allowed for center lane
				var accessNodes = laneNode.getElementsByTagName('access');
				if (accessNodes.length) roads[i].laneSection[j].lane[k].access = [];

				// 0+ not allowed for center lane
				var heightNodes = laneNode.getElementsByTagName('height');
				if (heightNodes.length) roads[i].laneSection[j].lane[k].height = [];

				// 0+ not allowed for center lane
				var ruleNodes = laneNode.getElementsByTagName('rule');
				if (ruleNodes.length) roads[i].laneSection[j].lane[k].rule = [];

				// get Lane Width Record 1+ - not allowed for center lane (laneId=0)
				for (var l=0; l < widthNodes.length; l++) {

					var widthNode = widthNodes[l];

					roads[i].laneSection[j].lane[k].width[l] = {};
					roads[i].laneSection[j].lane[k].width[l].sOffset = parseFloat(widthNode.getAttribute('sOffset'));
					roads[i].laneSection[j].lane[k].width[l].a = parseFloat(widthNode.getAttribute('a'));
					roads[i].laneSection[j].lane[k].width[l].b = parseFloat(widthNode.getAttribute('b'));
					roads[i].laneSection[j].lane[k].width[l].c = parseFloat(widthNode.getAttribute('c'));
					roads[i].laneSection[j].lane[k].width[l].d = parseFloat(widthNode.getAttribute('d'));
				}

				// get Lane Border Record 1+ - if both <width> and <border> is defined, <width> prevails
				for (var l=0; l < borderNodes.length; l++) {

					var borderNode = borderNodes[l];

					roads[i].laneSection[j].lane[k].border[l] = {};
					roads[i].laneSection[j].lane[k].border[l].sOffset = parseFloat(borderNode.getAttribute('sOffset'));
					roads[i].laneSection[j].lane[k].border[l].a = parseFloat(borderNode.getAttribute('a'));
					roads[i].laneSection[j].lane[k].border[l].b = parseFloat(borderNode.getAttribute('b'));
					roads[i].laneSection[j].lane[k].border[l].c = parseFloat(borderNode.getAttribute('c'));
					roads[i].laneSection[j].lane[k].border[l].d = parseFloat(borderNode.getAttribute('d'));
				}

				// get Lane Roadmark 0+
				// road mark's centerline is always positioned on the respective lane's outer border line
				for (var l=0; l < roadMakrNodes.length; l++) {

					var roadMarkNode = roadMakrNodes[l];

					roads[i].laneSection[j].lane[k].roadMark[l] = {};
					roads[i].laneSection[j].lane[k].roadMark[l].sOffset = parseFloat(roadMarkNode.getAttribute('sOffset'));
					roads[i].laneSection[j].lane[k].roadMark[l].type = roadMarkNode.getAttribute('type');
					roads[i].laneSection[j].lane[k].roadMark[l].weight = roadMarkNode.getAttribute('weight');
					roads[i].laneSection[j].lane[k].roadMark[l].color = roadMarkNode.getAttribute('color');
					roads[i].laneSection[j].lane[k].roadMark[l].material = roadMarkNode.getAttribute('material');
					roads[i].laneSection[j].lane[k].roadMark[l].width = parseFloat(roadMarkNode.getAttribute('width'));
					roads[i].laneSection[j].lane[k].roadMark[l].laneChange = roadMarkNode.getAttribute('laneChange') ? roadMarkNode.getAttribute('laneChange') : "both";
					roads[i].laneSection[j].lane[k].roadMark[l].height = parseFloat(roadMarkNode.getAttribute('height') ? roadMarkNode.getAttribute('height') : "0");
				}

				// get Lane Material Record 0+ - not allowed for center lane (laneId=0)
				for (var l=0; l < materialNodes.length; l++) {
					
					var materialNode = materialNodes[l];

					roads[i].laneSection[j].lane[k].material[l] = {};
					roads[i].laneSection[j].lane[k].material[l].sOffset = parseFloat(materialNode.getAttribute('sOffset'));
					roads[i].laneSection[j].lane[k].material[l].surface = materialNode.getAttribute('surface');
					roads[i].laneSection[j].lane[k].material[l].friction = parseFloat(materialNode.getAttribute('friction'));
					roads[i].laneSection[j].lane[k].material[l].roughness = parseFloat(materialNode.getAttribute('roughness'));
				}

				// get Lane Visibility Record - not allowed for center lane (laneId=0)
				for (var l=0; l < visibilityNodes.length; l++) {

					var visibilityNode = visibilityNodes[l];

					roads[i].laneSection[j].lane[k].visibility[l] = {};
					roads[i].laneSection[j].lane[k].visibility[l].sOffset = parseFloat(visibilityNode.getAttribute('sOffset'));
					roads[i].laneSection[j].lane[k].visibility[l].forward = parseFloat(visibilityNode.getAttribute('forward'));
					roads[i].laneSection[j].lane[k].visibility[l].back = parseFloat(visibilityNode.getAttribute('back'));
					roads[i].laneSection[j].lane[k].visibility[l].left = parseFloat(visibilityNode.getAttribute('left'));
					roads[i].laneSection[j].lane[k].visibility[l].right = parseFloat(visibilityNode.getAttribute('right'));
				}

				// get Lane Speed Record - not allowed for center lane (laneId=0)
				for (var l=0; l < speedNodes.length; l++) {

					var speedNode = speedNodes[l];

					roads[i].laneSection[j].lane[k].speed[l] = {};
					roads[i].laneSection[j].lane[k].speed[l].sOffset = parseFloat(speedNode.getAttribute('sOffset'));
					roads[i].laneSection[j].lane[k].speed[l].max = parseFloat(speedNode.getAttribute('max'));
					roads[i].laneSection[j].lane[k].speed[l].unit = speedNode.getAttribute('unit') ? speedNode.getAttribute('unit') : 'm/s';
				}

				// get Lane Access Record - not allowed for center lane (laneId=0)
				for (var l=0; l < accessNodes.length; l++) {

					var accessNode = accessNodes[l];

					roads[i].laneSection[j].lane[k].access[l] = {};
					roads[i].laneSection[j].lane[k].access[l].sOffset = parseFloat(accessNode.getAttribute('sOffset'));
					roads[i].laneSection[j].lane[k].access[l].restriction = accessNode.getAttribute('restriction');
				}

				// get Lane Height Record 0+ - not allowed for center lane (laneId=0)
				for (var l=0; l < heightNodes.length; l++) {

					var heightNode = heightNodes[l];

					roads[i].laneSection[j].lane[k].height[l] = {};
					roads[i].laneSection[j].lane[k].height[l].sOffset = heightNode.getAttribute('sOffset');
					roads[i].laneSection[j].lane[k].height[l].inner = heightNode.getAttribute('inner');
					roads[i].laneSection[j].lane[k].height[l].outer = heightNode.getAttribute('outer');
				}

				// get Lane Rule Record 0+ - not allowed for center lane (laneId=0)
				for (var l=0; l < ruleNodes.length; l++) {

					var ruleNode = ruleNodes[l];

					roads[i].laneSection[j].lane[k].rule[l] = {};
					roads[i].laneSection[j].lane[k].rule[l].sOffset = parseFloat(ruleNode.getAttribute('sOffset'));
					roads[i].laneSection[j].lane[k].rule[l].value = ruleNode.getAttribute('value');
				}
			}
		}
		// test
		//if (i == 0) console.log(roads[i])
	}
	return roads;
}

function createLine(length, height, sx, sy, hdg) {

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
* Create an Eular-Spiral connecting points (sx, sy) to (ex, ey), with a starting curvature
*
* NOTE: Cannot be sure that THREE's QuadraticBezierCurve is the same as Colothoids. If it is,
* Not sure if the starting curvature -> control point is handled correctly here. Need Double Check.
* For Roundabout8Course.xdor, error happens for undefined nextGeometry when passing arguments. See Line 267.
*
* @Param height the height of the road
* @Param sx, sy the starting point of the spiral
* @Param hdg heading direction (rotation of z axis) at start of the road
* @Param curvStart the curvature at the starting point - obslete (can delete)
* @Param ex, ey the ending point of the spiral
*/
function createSpiral(height, sx, sy, hdg, curvStart, ex, ey) {

	var material = new THREE.MeshBasicMaterial({color: 0xFFC125});
	var z = 0;

	var controlPoint = new THREE.Vector3(sx + Math.cos(hdg), sy + Math.sin(hdg), z);

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
}

function createClothoid(sx, sy, hdg, length, curvStart, curvEnd) {

	//var scalar = length / (curvEnd - curvStart);
	//scalar = 1;
	var step = 100;
	var scalar = Math.PI;
	var t = 0, Rt, At, x, y;
	var points = [];
	
	for (var i = 0; i <= step; i++) {
		t =  length / step * i;
		Rt = (0.506 * t + 1) / (1.79 * Math.pow(t, 2) + 2.054 * t + Math.sqrt(2));
		At = 1 / (0.803 * Math.pow(t, 3) + 1.886 * Math.pow(t,2) + 2.524 * t + 2);
		x = 0.5 - Rt * Math.sin(Math.PI / 2 * (At - Math.pow(t, 2)));
		y = 0.5 - Rt * Math.cos(Math.PI / 2 * (At - Math.pow(t, 2)));
		points.push(new THREE.Vector2(x * scalar, y * scalar));
	}

	var path = new THREE.Path(points);
	var geometry = path.createPointsGeometry(points.length);
	var material = new THREE.MeshBasicMaterial({color: 0x00FF00});	//0xFFC125
	var clothoid = new THREE.Line(geometry, material);
	scene.add(clothoid);

	return;
}

/*
* Create an arc with constant curvature from a starting point with fixed length
*
* @Param length the length of the arc
* @Param height the height of the road
* @Param sx, sy the start of the road
* @Param hdg headding direction at start of the road (roation of of z axis)
* @Param curvature curvature of the arc
*/
function createArc(length, height, sx, sy, hdg, curvature) {

	var material = new THREE.MeshBasicMaterial({color: 0x3A5FCD});

	var radius = 1 / Math.abs(curvature);
	var rotation = hdg - Math.sign(curvature) * Math.PI / 2;

	var curve = new THREE.EllipseCurve(
		//0, 0,							// ax, ay
		sx - radius * Math.cos(rotation), sy - radius * Math.sin(rotation),
		radius, radius,					// xRadius, yRadius
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
* Create a cubic line (a ploynomial funciton of third order) with
* y = a + b*s + c*x^2 + d*x^3
*/
function createCubic(a, b, c, d) {

	var points = [];
	for (var i = 0; i < 10; i = i + 0.1) {
		points.push(new THREE.Vector2(i, a + b*i + c * Math.pow(i, 2) + d*Math.pow(i, 3)));
	}
	
	var path = new THREE.Path(points);
	var geometry = path.createPointsGeometry(100);
	var material = new THREE.MeshBasicMaterial({color: 0xFF0000});
	var cubic = new THREE.Line(geometry, material);
	scene.add(cubic);
}

/*
* Draw the reference line of a given geometry
* @Param geometry
* @Param nextGeometry reference line of the proceeding one
*/
function drawRefrenceLine(geometry, nextGeometry) {

	var height = 1;

	switch(geometry.type) {
		case 'line':
			scene.add(createLine(geometry.length, height, geometry.x, geometry.y, geometry.hdg));
			break;
		case 'spiral':
			try {
				scene.add(createSpiral(height, geometry.x, geometry.y, geometry.hdg, geometry.spiral.curvStart, nextGeometry.x, nextGeometry.y));
			} catch(e) {
				console.info('reference line error: spiral as end of road. ')
			}
			break;
		case 'arc':
			scene.add(createArc(geometry.length, height, geometry.x, geometry.y, geometry.hdg, geometry.arc.curvature));
			break;
	}
}

/*
* Draw the reference line of a road
* @Param road road parsed from .xodr
*/
function drawRoad(road) {

	var geometries = road.geometry;

	for (var i = 0; i < geometries.length; i++) {
		
		var geometry = geometries[i];
		var nextGeometry = geometries[i + 1];
	
		drawRefrenceLine(geometry, nextGeometry);
	}
}

/*
* Draw the reference line for all roads
* @Param roads roads info parsed from .xodr
*/
function drawRoads(roads) {
	for (var i = 0; i < roads.length; i++) {
		drawRoad(roads[i]);
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
* Create an arc ring shape given arc center, inner border curvature, length, outer border radius, v1, and v3
*
* @Param center 2D Vector the center of the arc
* @Param v1, v3 2D Vector two of the vertices
* @Param iRadius the radius of the innder border arc
* @Param oRadius the radius of the outer border arc
* @Param rotation the rotation direction of the 
* @Param theta the angel swept by the arc
* @Param isClockwise true if innder border arc is clockwise, false if not
*
* ----- v1---- inner border ---v2 ----			v4---------------------v3
*		|						|		or		|						|
*		|						|				|						|
*		v4---------------------v3		  ----- v1---- inner border ---v2 ----	 
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

function createSpiralShape(v1, cpt1, v2, v3, cpt2, v4) {

	var shape = new THREE.Shape();
	shape.moveTo(v1.x, v1.y);
	shape.quadraticCurveTo(cpt1.x, cpt1.y, v2.x, v2.y);
	shape.lineTo(v3.x, v3.y);
	shape.quadraticCurveTo(cpt2.x, cpt2.y, v4.x, v4.y);
	shape.lineTo(v1.x, v1.y);

	return shape;
}

/*
* Draw road mark given the reference line geometry
*
* @Param oBorder the outer border line geometry of the lane, it's modified from geometry reference line
* @Param roadMark roadMark to draw
* @Param oNextBorder the outer border line of the succeeding road, only for spiral
* 	v1---------------------v2	 t
*	|						|	/|\
*	----- reference line ----	 |
*	|						|	 |______ s 
*	v4---------------------v3			
*/
function drawRoadMark(oBorder, roadMark, oNextBorder) {

	if (!roadMark) return;

	if (roadMark.type == 'none') return;

	// raod mark color info
	var colorMaterial = {};
	colorMaterial.standard = new THREE.MeshBasicMaterial({color: 0xFFFFFF});
	colorMaterial.blue = new THREE.MeshBasicMaterial({color: 0x0000FF});
	colorMaterial.green = new THREE.MeshBasicMaterial({color: 0x00FF00});
	colorMaterial.red = new THREE.MeshBasicMaterial({color: 0xFF0000});
	colorMaterial.white = new THREE.MeshBasicMaterial({color: 0xFFFFFF});
	colorMaterial.yellow = new THREE.MeshBasicMaterial({color: 0xFFFF00});

	var x = oBorder.x;
	var y = oBorder.y;
	var hdg = oBorder.hdg;
	var length = oBorder.length;
	var type = oBorder.type;
	var width = roadMark.width;
	//var mType = roadMark.type;
	
	var v1 = new THREE.Vector2(x + width / 2 * Math.cos(hdg + Math.PI / 2), y + width / 2 * Math.sin(hdg + Math.PI / 2));
	var v2, v3, v4;
	var shape, mesh;

	// need to know the border geometry (shift of x, y) on which the roadMark is on
	switch(type) {

		case 'line':
			v2 = new THREE.Vector2(v1.x + length * Math.cos(hdg), v1.y + length * Math.sin(hdg));
			v3 = new THREE.Vector2(v2.x + width * Math.cos(hdg - Math.PI / 2), v2.y + width * Math.sin(hdg - Math.PI / 2));
			v4 = new THREE.Vector2(v1.x + width * Math.cos(hdg - Math.PI / 2), v1.y + width * Math.sin(hdg - Math.PI / 2));

			shape = createRectShape(v1, v2, v3, v4);
			
			break;

		case 'spiral':

			var curvStart = oBorder.spiral.curvStart;
			
			v2 = new THREE.Vector2(oNextBorder.x + width / 2 * Math.cos(oNextBorder.hdg + Math.PI / 2), oNextBorder.y + width / 2 * Math.sin(oNextBorder.hdg + Math.PI / 2));
			v3 = new THREE.Vector2(v2.x + width * Math.cos(oNextBorder.hdg - Math.PI / 2), v2.y + width * Math.sin(oNextBorder.hdg - Math.PI / 2));
			v4 = new THREE.Vector2(v1.x + width * Math.cos(hdg - Math.PI / 2), v1.y + width * Math.sin(hdg - Math.PI / 2));

			var cpt1 = new THREE.Vector2(x + Math.cos(hdg), y + Math.sin(hdg));
			var cpt2 = new THREE.Vector2(v4.x + Math.cos(hdg), v4.y + Math.sin(hdg));
			
			shape = createSpiralShape(v1, cpt1, v2, v3, cpt2, v4);
			
			break;

		case 'arc':
			var curvature = oBorder.arc.curvature;
			var radius = 1 / Math.abs(curvature);
			var theta = length * curvature;
			var rotation = hdg - Math.sign(curvature) * Math.PI / 2;
			var center = new THREE.Vector2(x - radius * Math.cos(rotation), y - radius * Math.sin(rotation));

			v3 = new THREE.Vector2(x - radius * Math.cos(rotation) + (radius + Math.sign(curvature) * width / 2) * Math.cos(rotation + theta),
									y - radius * Math.sin(rotation) + (radius + Math.sign(curvature) * width /2) * Math.sin(rotation + theta));

			shape = createArcShape(center, v1, v3, radius - Math.sign(curvature) * width / 2, radius + Math.sign(curvature) * width / 2, rotation, theta, Math.sign(curvature) > 0 ? false : true);

			break;
	}

	try {
		var mesh = new THREE.Mesh(new THREE.ShapeBufferGeometry(shape), colorMaterial[roadMark.color]);
		scene.add(mesh);
	} catch(e) {
		console.info(type)
		console.info(oBorder, roadMark, shape)
	}
}

/*
* Pave a Lane given the reference line geometry of the inner border of the lane
*
* @Param geometry the reference line geometry of the inner border of the lane
* @Param lane lane to pave
* @Param nextGeometry the reference line geometry of the succeeding inner border of the lane - for spiral only
*
* ----- v1---- inner border ---v2 ----			v4---------------------v3
*		|						|		or		|						|
*		|						|				|						|
*		v4---------------------v3		  ----- v1---- inner border ---v2 ----	 
*/
function paveLane(geometry, lane, nextGeometry) {

	if (!geometry || !lane || (lane.type == 'spiral' && !nextGeometry)) {
		console.info('pave: invalid lane. skipped')
		return;
	}

	if (lane.type == 'none') {
		return;
	}

	var x = geometry.x;
	var y = geometry.y;
	var hdg = geometry.hdg;
	var length = geometry.length;
	var type = geometry.type;
	
	if (lane.id == 0) {
		// width and border is not allowed for center lane. center lane only needs to draw the mark and set offset
		drawRoadMark(geometry, lane.roadMark[0], nextGeometry);
		return;
	} else {
		var width = lane.width[0].a;
	}

	if (lane.type != 'border') {

		var v1 = new THREE.Vector2(x, y);
		var v2, v3, v4;
		var shape, mesh;

		// need to pre-generate inner border for each lane during parsing lanes
		switch(type) {
			
			case 'line':
				v2 = new THREE.Vector2(x + length * Math.cos(hdg), y + length * Math.sin(hdg));
				v3 = new THREE.Vector2(x + length * Math.cos(hdg) + width * Math.cos(hdg + Math.sign(lane.id) * Math.PI / 2),
										y + length * Math.sin(hdg) + width * Math.sin(hdg + Math.sign(lane.id) * Math.PI / 2));
				v4 = new THREE.Vector2(x + width * Math.cos(hdg + Math.sign(lane.id) * Math.PI / 2),
										y + width * Math.sin(hdg + Math.sign(lane.id) * Math.PI / 2));
				shape = createRectShape(v1, v2, v3, v4);
				break;
			case 'spiral':
				v2 = new THREE.Vector2(nextGeometry.x, nextGeometry.y);
				v3 = new THREE.Vector2(v2.x + width * Math.cos(nextGeometry.hdg + Math.sign(lane.id) * Math.PI / 2),
										v2.y + width * Math.sin(nextGeometry.hdg + Math.sign(lane.id) * Math.PI / 2));
				v4 = new THREE.Vector2(x + width * Math.cos(hdg + Math.sign(lane.id) * Math.PI / 2),
										y + width * Math.sin(hdg + Math.sign(lane.id) * Math.PI / 2));
				var cpt1 = new THREE.Vector2(x + Math.cos(hdg), y + Math.sin(hdg));
				var oCurvStart = geometry.spiral.curvStart / (1 - width * Math.abs(geometry.spiral.curvStart) * Math.sign(lane.id) * Math.sign(geometry.spiral.curvStart));
				var cpt2 = new THREE.Vector2(v4.x + Math.cos(hdg), v4.y + Math.sin(hdg));
				shape = createSpiralShape(v1, cpt1, v2, v3, cpt2, v4);
				break;
			case 'arc':
				var curvature = geometry.arc.curvature;
				var radius = 1 / Math.abs(curvature);
				var theta = length * curvature;
				var rotation = hdg - Math.sign(curvature) * Math.PI / 2;
				var center = new THREE.Vector2(x - radius * Math.cos(rotation), y - radius * Math.sin(rotation));
				v2 = new THREE.Vector2(x - radius * Math.cos(rotation) + radius * Math.cos(rotation + theta),
										y - radius * Math.sin(rotation) + radius * Math.sin(rotation + theta));
				v3 = new THREE.Vector2(x - radius * Math.cos(rotation) + (radius - Math.sign(lane.id) * Math.sign(curvature) * width) * Math.cos(rotation + theta),
										y - radius * Math.sin(rotation) + (radius - Math.sign(lane.id) * Math.sign(curvature) * width) * Math.sin(rotation + theta));
				v4 = new THREE.Vector2(x - Math.sign(lane.id) * Math.sign(curvature) * width * Math.cos(rotation),
										y - Math.sign(lane.id) * Math.sign(curvature) * width * Math.sin(rotation));
				shape = createArcShape(center, v1, v3, radius, radius - Math.sign(lane.id) * Math.sign(curvature) * width, rotation, theta, Math.sign(curvature) > 0 ? false : true);
				break;
		}

//		try {
			mesh = new THREE.Mesh(new THREE.ShapeBufferGeometry(shape), new THREE.MeshBasicMaterial({color: 0xCFCFCF}));
			scene.add(mesh);
//		} catch(e) {
//			console.error(e)
//			console.info(type)
//			console.info(geometry)
//		}
	}

	// get the outer border of this lane for RoadMark
	var oBorder = {};
	oBorder.x = x + width * Math.cos(hdg + Math.sign(lane.id) * Math.PI / 2);
	oBorder.y = y + width * Math.sin(hdg + Math.sign(lane.id) * Math.PI / 2);
	oBorder.hdg = geometry.hdg;
	oBorder.length = geometry.length;
	oBorder.type = geometry.type;
	if (geometry.spiral) {
		oBorder.spiral = {};
		if (geometry.spiral.curvStart > 0) {
			var r = 1 / Math.abs(geometry.spiral.curvStart);
			oBorder.spiral.curvStart = Math.sign(geometry.spiral.curvStart) / (r - width * Math.sign(lane.id) * Math.sign(geometry.spiral.curvStart));
		} else {
			oBorder.spiral.curvStart = 0;
		}

		var oNextBorder = {};
		oNextBorder.x = nextGeometry.x + width * Math.cos(nextGeometry.hdg + Math.sign(lane.id) * Math.PI / 2);
		oNextBorder.y = nextGeometry.y + width * Math.sin(nextGeometry.hdg + Math.sign(lane.id) * Math.PI / 2);
		oNextBorder.hdg = nextGeometry.hdg;
	}
	if (geometry.arc) {
		oBorder.arc = {};
		var r = 1 / Math.abs(geometry.arc.curvature);
		oBorder.length *= 1 - width / r * Math.sign(lane.id) * Math.sign(geometry.arc.curvature);
		oBorder.arc.curvature = Math.sign(geometry.arc.curvature) / (r - width * Math.sign(lane.id) * Math.sign(geometry.arc.curvature));
	}
	
	drawRoadMark(oBorder, lane.roadMark[0], oNextBorder);
}

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
* NOTE: Won't work if any lane offset exists, the whole mapping will be messed up between geometries of all roads 
* need to change the datastructure!
*/
function paveLaneSection(road, laneSectionId) {

	// split lanes into two (or three?) groups: left, rightm, sorted by absoluate value of lane.id in ascending order (-1 -> -n) (1->m)
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

	var geometries = road.geometry;
	var leftLaneInnerGeometries = [];
	var rightLaneInnerGeometries = [];

	// generate inner geometries for each lane per geometry - start paving after all geometries info is ready
	for (var i = 0; i < geometries.length; i++) {

		// get inner border geometry for each lane per geometry
		/* NOTE: need to find the relation between laneSection and road geometry! PLUS lane.width's array corresponds to laneSetion?
		*  Assume only one lane section per road (geometry) for INITIAL IMPLEMENTATION and only one width segments provided uniform width throughout the roads
		*  Question? when multiple lane sections are defined?
		*/
		var geometry = geometries[i];
		leftLaneInnerGeometries[i] = [];
		rightLaneInnerGeometries[i] = [];
		var leftLaneInnerGeometry = leftLaneInnerGeometries[i];
		var rightLaneInnerGeometry = rightLaneInnerGeometries[i];
		
		// inner borders for left lanes
		for (var j = 0; j < leftLanes.length; j++) {

			leftLaneInnerGeometry[j] = {};
			var innerGeometry = leftLaneInnerGeometry[j];

			// CONST geometry attributes throughtout lanes along the reference line
			innerGeometry.hdg = geometry.hdg;
			innerGeometry.type = geometry.type;

			// lane.id = 1
			if (j == 0) {
				innerGeometry.x  = geometry.x;
				innerGeometry.y = geometry.y;
				innerGeometry.length = geometry.length;

				if (geometry.spiral) {
					innerGeometry.spiral = {};
					innerGeometry.spiral.curvStart = geometry.spiral.curvStart;
				}
				if (geometry.arc) {
					innerGeometry.arc = {};
					innerGeometry.arc.curvature = geometry.arc.curvature;
				}
			}

			// lane.id > 1
			if (j > 0) {
				var preInnerGeometry = leftLaneInnerGeometry[j - 1];
				var width = leftLanes[j - 1].width[laneSectionId].a;
				
				innerGeometry.x = preInnerGeometry.x + width * Math.cos(innerGeometry.hdg + Math.PI / 2);
				innerGeometry.y = preInnerGeometry.y + width * Math.sin(innerGeometry.hdg + Math.PI / 2);
				innerGeometry.length = preInnerGeometry.length;

				if (geometry.spiral) {
					innerGeometry.spiral = {};

					// if curvStart != 0, re-calculate curvStart as to re-calculate new radius at the point
					var curvStart = preInnerGeometry.spiral.curvStart;

					if (curvStart != 0) {
						var radius = 1 / Math.abs(curvStart);
						var newRadius = radius - Math.sign(curvStart) * width;
						innerGeometry.spiral.curvStart = Math.sign(curvStart) / newRadius;
					} else {
						innerGeometry.spiral.curvStart = preInnerGeometry.spiral.curvStart;
					}

					innerGeometry.length = null;
					
				}
				if (geometry.arc) {
					innerGeometry.arc = {};

					// re-calculate cuvature and update length
					var curvature = preInnerGeometry.arc.curvature;
					var radius = 1 / Math.abs(curvature);
					var newRadius = radius - Math.sign(curvature) * width;

					innerGeometry.arc.curvature = Math.sign(curvature) / newRadius;
					innerGeometry.length *= 1 - width / radius * Math.sign(curvature);
				}
			}
		}

		// inner borders for right lanes
		for (var j = 0; j < rightLanes.length; j++) {

			rightLaneInnerGeometry[j] = {};
			var innerGeometry = rightLaneInnerGeometry[j];

			// CONST geometry attributes throughtout lanes along the reference line
			innerGeometry.hdg = geometry.hdg;
			innerGeometry.type = geometry.type;

			// lane.id = -1
			if (j == 0) {
				innerGeometry.x  = geometry.x;
				innerGeometry.y = geometry.y;
				innerGeometry.length = geometry.length;

				if (geometry.spiral) {
					innerGeometry.spiral = {};
					innerGeometry.spiral.curvStart = geometry.spiral.curvStart;
				}
				if (geometry.arc) {
					innerGeometry.arc = {};
					innerGeometry.arc.curvature = geometry.arc.curvature;
				}
			}

			// lane.id < -1
			if (j > 0) {
				var preInnerGeometry = rightLaneInnerGeometry[j - 1];
				var width = rightLanes[j - 1].width[laneSectionId].a;

				innerGeometry.x = preInnerGeometry.x + width * Math.cos(innerGeometry.hdg - Math.PI / 2);
				innerGeometry.y = preInnerGeometry.y + width * Math.sin(innerGeometry.hdg - Math.PI / 2);
				innerGeometry.length = preInnerGeometry.length;

				if (geometry.spiral) {
					innerGeometry.spiral = {};

					// if curvStart != 0, re-calculate curvStart as to re-calculate new radius at the point
					var curvStart = preInnerGeometry.spiral.curvStart;

					if (curvStart != 0) {
						var radius = 1 / Math.abs(curvStart);
						var newRadius = radius + Math.sign(curvStart) * width;
						innerGeometry.spiral.curvStart = Math.sign(curvStart) / newRadius;
					} else {
						innerGeometry.spiral.curvStart = preInnerGeometry.spiral.curvStart;
					}

					innerGeometry.length = null;
				}
				if (geometry.arc) {
					innerGeometry.arc = {};

					// re-calculate cuvature and update length
					var curvature = preInnerGeometry.arc.curvature;
					var radius = 1 / Math.abs(curvature);
					var newRadius = radius + Math.sign(curvature) * width;
					innerGeometry.arc.curvature = Math.sign(curvature) / newRadius;
					innerGeometry.length *= 1 + width / radius * Math.sign(curvature);
				}
			}
		}

		// ~got inner border for each lanes (excluding centrial lane), leftLanes <-> leftLaneInnerGeometry, rightLanes <-> rightLaneInnerGeometry
	}
	
	// pave lanes for each geometry seg
	for (var i = 0; i < geometries.length; i++ ) {

		var geometry = geometries[i];
		var left = leftLaneInnerGeometries[i];
		var right = rightLaneInnerGeometries[i];
		var nextleft = leftLaneInnerGeometries[i + 1];
		var nextright = rightLaneInnerGeometries[i + 1];

		// left Lanes
		for (var j = 0; j < leftLanes.length; j++) {
//if (i == 0 && j == 1) {
			try {
				if (geometry.type == 'spiral') {
					paveLane(left[j], leftLanes[j], nextleft[j]);
				} else {
					paveLane(left[j], leftLanes[j]);
				}	
			} catch(e) {
				console.info('paving error: road#' + road.id + ' laneSection#' + laneSectionId + ' geometry#' + i + ' lane#' + leftLanes[j].id);
			}
//}
		}

		// right Lanes
		for (var j = 0; j < rightLanes.length; j++) {
			try {
				if (geometry.type == 'spiral') {
					paveLane(right[j], rightLanes[j], nextright[j]);
				} else {
					paveLane(right[j], rightLanes[j]);
				}	
			} catch(e) {
				console.info('paving error: road#' + road.id + ' laneSection#' + laneSectionId + ' geometry#' + i + ' lane#' + rightLanes[j].id);
			}
		}

		// central lanes - draw on top of right/left lanes to be seen
		try {
			paveLane(geometry, centralLane, geometries[i + 1]);
		} catch(e) {
			console.info('paving error: road#' + road.id + ' laneSection#' + laneSectionId + ' geometry#' + i + ' lane#' + centralLane.id);
			console.info(e.message)
		}
	}
}

function paveRoad(road) {

	for (var i  = 0; i < road.laneSection.length; i++) {
		try {
			paveLaneSection(road, i);
		} catch(e) {
			console.info('paving error: road#' + road.id + ' laneSection#' + i);
			//console.error(e.message + '\n');
		}
	}

	drawRoad(road);
}

/*
* Pave roads with lanes
* @Param roads array of road parsed from .xodr.
*/
function paveRoads(roads) {

	for (var i = 0; i < roads.length; i++) {
		if (roads[i].id == '500')
		paveRoad(roads[i]);
	}
}

function createShape() {

	var v1 = new THREE.Vector2(-2.273817737823467, -7.770521445709069);
	var v2 = new THREE.Vector2(2.2738183376964645, -7.77052144574286);
	var v3 = new THREE.Vector2(2.0808883223692067, -8.06254543308949);
	var v4 = new THREE.Vector2(-2.080887722500549, -8.062545433058565);

	var hdg = 0.5838360570660069;
	var length = 4.816647470855858;
	var curvature = -0.24242424242424243;
	var radius = 1 / Math.abs(curvature);
	var theta = length * curvature;
	var rotation = hdg - Math.sign(curvature) * Math.PI / 2;
	var center = new THREE.Vector2(v1.x - radius * Math.cos(rotation), v1.y - radius * Math.sin(rotation));
	var width = 0.35;
	var isClockwise =  Math.sign(curvature) > 0 ? false : true;

	var arcShape = new THREE.Shape();
	arcShape.absarc(center.x, center.y, radius, rotation, rotation + theta, isClockwise);

	var rectShape = new THREE.Shape();
	rectShape.moveTo(v1.x, v1.y);
	rectShape.lineTo(v2.x, v2.y);
	rectShape.lineTo(v3.x, v3.y);
	rectShape.lineTo(v4.x, v4.y);

	//var shape = craeteArcShape(center.x, center.y, v1, v3, radius, radius + Math.sign(curvature) * width, rotation, theta, isClockwise)
	var shape = new THREE.Shape();
	shape.moveTo(v1.x, v1.y);
	shape.absarc(center.x, center.y, radius, rotation, rotation + theta, isClockwise);
	shape.lineTo(v3.x, v3.y);
	shape.absarc(center.x, center.y, radius + Math.sign(curvature) * width, rotation + theta, rotation, !isClockwise)
//	shape.lineTo(v1.x, v1.y)
//	shape = new THREE.Shape();
//	shape.absarc(center.x, center.y, radius + Math.sign(curvature) * width, rotation, rotation + theta, isClockwise)

	var geometry = new THREE.ShapeBufferGeometry(arcShape);
	var mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({color: 0xFF0000}));
	scene.add(mesh)

	geometry = new THREE.ShapeBufferGeometry(rectShape)
	mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({color: 0x00FF00}));
	scene.add(mesh)

	geometry = new THREE.ShapeBufferGeometry(shape)
	mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({color: 0x0000FF}));
	scene.add(mesh)
}