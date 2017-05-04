var scene, camera, renderer;
var container;

var roads = parseXML("../data/Crossing8Course.xodr");
//var roads = parseXML("../data/CrossingComplex8Course.xodr");	// lane lateral shift cause incontinious
//var roads = parseXML("../data/Roundabout8Course.xodr");		// error - taken as a rare case when spiral ends a geometry
//var roads = parseXML("../data/CulDeSac.xodr");
//var roads = parseXML("../data/Country.xodr");	// move towards upper right to see the roads
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
	camera.position.set(0, 0, 20);
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
	//paveRoads(roads);

	/** draw reference line */
	//drawRoads(roads);

	//scene.add(createClothoid(3.1746031746031744e+00, 0, 0, 0, 0, -1.2698412698412698e-01, 0))
	scene.add(createClothoid(3.1746031746031744e+00, 0, 0, 0, 0, -1.2698412698412698e-01, 2.5))
	scene.add(createClothoid(3.1746031746031744e+00, 0, 0, 0, 0, -1.2698412698412698e-01, 5))
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
			roads[i].geometry[j].s = parseFloat(geometryNode.getAttribute('s'));
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
					roads[i].geometry[j][geometryType].curvEnd = parseFloat(geometryTypeNode.getAttribute('curvEnd'));
					break;
				case 'arc':
					roads[i].geometry[j][geometryType] = {};
					roads[i].geometry[j][geometryType].curvature = parseFloat(geometryTypeNode.getAttribute('curvature'));
					break;
				default:
					throw new Error('invalid geometry type!')
			}
		}

		var laneOffsetNodes = roadNode.getElementsByTagName('laneOffset');
		if (laneOffsetNodes.length) {

			roads[i].laneOffset = [];
			
			for (var j=0; j < laneOffsetNodes.length; j++) {

				var laneOffsetNode = laneOffsetNodes[j];

				roads[i].laneOffset[j] = {};
				roads[i].laneOffset[j].s = parseFloat(laneOffsetNode.getAttribute('s'));
				roads[i].laneOffset[j].a = parseFloat(laneOffsetNode.getAttribute('a'));
				roads[i].laneOffset[j].b = parseFloat(laneOffsetNode.getAttribute('b'));
				roads[i].laneOffset[j].c = parseFloat(laneOffsetNode.getAttribute('c'));
				roads[i].laneOffset[j].d = parseFloat(laneOffsetNode.getAttribute('d'));
			}
		}

		var laneSectionNodes = roadNode.getElementsByTagName('laneSection');
		for (var j=0; j < laneSectionNodes.length; j++) {

			var laneSectionNode = laneSectionNodes[j];

			roads[i].laneSection[j] = {};
			roads[i].laneSection[j].s = parseFloat(laneSectionNode.getAttribute('s'));
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
				var roadMarkNodes = laneNode.getElementsByTagName('roadMark');
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
				for (var l=0; l < roadMarkNodes.length; l++) {

					var roadMarkNode = roadMarkNodes[l];

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

/*
* Sub-Diveide a road's geomtries based on road laneOffset record
*
* NOTE: POTENTIAL BUG EXITS! (only works when laneOffset happens only on 'line' geometry)
*
* @Param road
* @Return geometries array of sub-divided geomtries of the road
*/
function subDivideRoadGeomtry(road) {

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
	for (var i = 0; i < roads.length; i++) {
		var road = roads[i];
		road.geometry = subDivideRoadGeomtry(road);
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

/*
* Genereate sample points for a clothoid spiral
*
* @Param length the arc length trhoughtou the curve
* @Param sx, sy the start position of the curve
* @Param hdg the heading direction of the starting point
* @Param curvStart curvature of the starting point
* @Param curvEnd curvature of the ending point
* @Param tOffset the costant offset from clothoid (used to draw paralell curve to clothoid)
* @Return smaple points
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
		/** BUG: points[0] is alwasy (0, 0)! WHY */
		var curv = s / length * Math.abs(curvEnd - curvStart);
		var theta = s / 2 * curv;
		if (Math.sign(curvStart + curvEnd) <0) theta *= -1;		
		point.x += Math.abs(tOffset) * Math.cos(theta + Math.PI / 2 * Math.sign(tOffset));
		point.y += Math.abs(tOffset) * Math.sin(theta + Math.PI / 2 * Math.sign(tOffset));
		if (point.x < 1e-10) point.x = 0;

		points.push(point);
	}

	// transform
	if (reverse) {
		var tmp;
		var len = points.length;
		for (var i = 0; i < len / 2; i++) {
			var tmp = points[i].y;
			points[i].y = points[len - 1 - i].y;
			points[len - 1 - i].y = tmp;
		}
		hdg -= - Math.sign(curvStart + curvEnd) * (startArcLength + length) * Math.max(Math.abs(curvStart), Math.abs(curvEnd)) / 2;
	}
	if (points[0].x != 0 || points[0].y != 0) {
		for (var i = 1; i < len; i++) {
			points[i].x -= points[0].x;
			points[i].y -= points[0].y;
		}
		points[0].x = 0;
		points[0].y = 0;
	}
	for (var i = 0; i < points.length; i++) {
		var point = points[i];
		// rotate
		var tmpx = point.x;
		var tmpy = point.y;
		point.x = tmpx * Math.cos(hdg) - tmpy * Math.sin(hdg);
		point.y = tmpx * Math.sin(hdg) + tmpy * Math.cos(hdg);
		// translate
		point.x += sx;
		point.y += sy;
	}
/*	
	// calculate length and error
	var s = 0;
	for (var i = 1; i < points.length; i++) {
		s += Math.sqrt(Math.pow(points[i].x - points[i-1].x, 2) + Math.pow(points[i].y - points[i-1].y, 2));
	}
	console.log(s, length, s - length)
*/	console.log(points)
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
* Create an arc with constant curvature from a starting point with fixed length
*
* @Param length the length of the arc
* @Param sx, sy the start of the arc
* @Param hdg headding direction at start of the arc (roation of of z axis)
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
* Generate smaple points for a cubic polynomial
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
* t = a + b*ds + c*ds^2 + d*ds^3, ds is the distance along teh reference line between the start of the entry (laneSection) and the actual position
*
* @Param length the length of the original reference line (now assume geometry is of only type 'line')
* @Param height the height of the road (not used yet for all reference lines)
* @Param sx, sy the start of the curve
* @Param hdg heading direction at start of the curve
* @Param a, b, c, d parameters of the cubic polynomial
*/
function createCubic(length, height, sx, sy, hdg, a, b, c, d) {

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
* Draw the reference line of a given geometry
* @Param geometry
* @Param nextGeometry reference line of the proceeding one
*/
function drawRefrenceLine(geometry) {

	switch(geometry.type) {
		case 'line':
			if (!geometry.offset) scene.add(createLine(geometry.length, geometry.x, geometry.y, geometry.hdg));
			// if lane has offset, geometry also has an entry of offset after parsed from subDivideRoadGeometry, now assume laneoffset only exists on line geometry
			if (geometry.offset) {
				// original geometry line without lane offset in green
				drawCustomLine([new THREE.Vector2(geometry.x, geometry.y), new THREE.Vector2(geometry.x + geometry.length * Math.cos(geometry.hdg), geometry.y + geometry.length * Math.sin(geometry.hdg))]);
				// if offset only contians a constant, still draw a line
				if (geometry.offset.b == 0 && geometry.offset.c == 0 && geometry.offset.d == 0) {
					var x = geometry.x + Math.abs(geometry.offset.a) * Math.cos(geometry.hdg + Math.PI / 2 * Math.sign(geometry.offset.a));
					var y = geometry.y + Math.abs(geometry.offset.a) * Math.sin(geometry.hdg + Math.PI / 2 * Math.sign(geometry.offset.a));
					scene.add(createLine(geometry.length, x, y, geometry.hdg));
				} else {
					// need to draw a cubic curve
					scene.add(createCubic(geometry.length, height, geometry.x, geometry.y, geometry.hdg, geometry.offset.a, geometry.offset.b, geometry.offset.c, geometry.offset.d));
				}
			}
			break;
		case 'spiral':
			if (geometry.offset.a || geometry.offset.b || geometry.offset.c || geometry.offset.d) {
				console.warn('reference line error (spiral): not surpport laneOffset on spiral or arc yet');
				return;
			}
			try {
				scene.add(createClothoid(geometry.length, geometry.x, geometry.y, geometry.hdg, geometry.spiral.curvStart, geometry.spiral.curvEnd));
			} catch(e) {
				console.error(e.stack)
			}
			break;
		case 'arc':
			if (geometry.offset.a || geometry.offset.b || geometry.offset.c || geometry.offset.d) {
				console.warn('reference line error (arc): not surpport laneOffset on spiral or arc yet');
				return;
			}
			scene.add(createArc(geometry.length, geometry.x, geometry.y, geometry.hdg, geometry.arc.curvature));
			break;
	}
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
	
		drawRefrenceLine(geometry);
	}
}

/*
* Draw the reference line for all roads
* @Param roads roads info parsed from .xodr
*/
function drawRoads(roads) {
	for (var i = 0; i < roads.length; i++) {
		//if (roads[i].id == '88' || roads[i].id == '79' || roads[i].id == '73' || roads[i].id == '72')
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
* Create a custom shape defined by innerBorder points and outerBorder points
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
* @Param isClockwise true if innder border arc is clockwise, false if not
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
* Helper function for paving - test iBorder or oBorder
*/
function drawCustomLine(points, color) {

	var path = new THREE.Path(points);
	var geometry = path.createPointsGeometry(points.length);
	var material = new THREE.MeshBasicMaterial({color: color != undefined ? color : 0x00FF00});
	var mesh = new THREE.Line(geometry, material);
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

/*]
* Draw road mark given the reference line geometry
*
* @Param oBorder the outer border line geometry of the lane, it's modified from geometry reference line
* @Param roadMark roadMark array of lane to draw
* @Param oNextBorder the outer border line of the succeeding road, only for spiral
* 	v1---------------------v2	 t
*	|						|	/|\
*	----- reference line ----	 |
*	|						|	 |______ s 
*	v4---------------------v3			
*/
function drawRoadMark(oBorder, roadMarks, oNextBorder) {

	if (roadMarks.length == 0) return;

	// road mark color info
	var colorMaterial = {};
	colorMaterial.standard = new THREE.MeshBasicMaterial({color: 0xFFFFFF});
	colorMaterial.blue = new THREE.MeshBasicMaterial({color: 0x0000FF});
	colorMaterial.green = new THREE.MeshBasicMaterial({color: 0x00FF00});
	colorMaterial.red = new THREE.MeshBasicMaterial({color: 0xFF0000});
	colorMaterial.white = new THREE.MeshBasicMaterial({color: 0xFFFFFF});
	colorMaterial.yellow = new THREE.MeshBasicMaterial({color: 0xFFFF00});
/*
	for (var i = 0; i < roadMarks.length; i++) {
		
		var roadMark = roadMarks[i];

		if (roadMark.type == 'none') return;

		var width = roadMark.width;
		//var height = roadMark.height;	// not used yet
		var sOffset = roadMark.sOffset;
		
		var length = oBorder.length - sOffset;
		var x, y, hdg;
		var v1, v2, v3, v4;
		var shape, mesh;

		// get the corresponding oBorder's geometry start according to sOffset
		switch(oBorder.type) {
			
			case 'line':
				hdg = oBorder.hdg;
				x = oBorder.x + sOffset * Math.cos(hdg);
				y = oBorder.y + sOffset * Math.sin(hdg);
				
				v1 = new THREE.Vector2(x + width / 2 * Math.cos(hdg + Math.PI / 2), y + width / 2 * Math.sin(hdg + Math.PI / 2));
				v2 = new THREE.Vector2(v1.x + length * Math.cos(hdg), v1.y + length * Math.sin(hdg));
				v3 = new THREE.Vector2(v2.x + width * Math.cos(hdg - Math.PI / 2), v2.y + width * Math.sin(hdg - Math.PI / 2));
				v4 = new THREE.Vector2(v1.x + width * Math.cos(hdg - Math.PI / 2), v1.y + width * Math.sin(hdg - Math.PI / 2));

				shape = createRectShape(v1, v2, v3, v4);
				
				break;
			
			case 'spiral':
				//if (sOffset > 0) { throw Error(); console.warn('roadMark error: Unable to handle offset at spiral yet'); return; }

				var curvStart = oBorder.spiral.curvStart;
				x = oBorder.x;
				y = oBorder.y;
				hdg = oBorder.hdg;

				v1 = new THREE.Vector2(x + width / 2 * Math.cos(hdg + Math.PI / 2), y + width / 2 * Math.sin(hdg + Math.PI / 2));
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
				var theta = sOffset * curvature;
				var rotation = oBorder.hdg - Math.sign(curvature) * Math.PI / 2;
				hdg = oBorder.hdg + theta;

				// get the start point first
				x = oBorder.x - radius * Math.cos(rotation) + radius * Math.cos(rotation + theta);
				y = oBorder.y - radius * Math.sin(rotation) + radius * Math.sin(rotation + theta);

				theta = length * curvature;
				rotation = hdg - Math.sign(curvature) * Math.PI / 2;

				// calculate v1, v3, and center for the arc shape
				v1 = new THREE.Vector2(x + width / 2 * Math.cos(hdg + Math.PI / 2), y + width / 2 * Math.sin(hdg + Math.PI / 2));
				v3 = new THREE.Vector2(x - radius * Math.cos(rotation) + (radius + Math.sign(curvature) * width / 2) * Math.cos(rotation + theta),
										y - radius * Math.sin(rotation) + (radius + Math.sign(curvature) * width /2) * Math.sin(rotation + theta));
				var center = new THREE.Vector2(x - radius * Math.cos(rotation), y - radius * Math.sin(rotation));

				shape = createArcShape(center, v1, v3, radius - Math.sign(curvature) * width / 2, radius + Math.sign(curvature) * width / 2, rotation, theta, Math.sign(curvature) > 0 ? false : true);
				
				break;
		}

		try {
			var mesh = new THREE.Mesh(new THREE.ShapeBufferGeometry(shape), colorMaterial[roadMark.color]);
			scene.add(mesh);
		} catch(e) {
			console.info(oBorder.type)
			console.error(e.stack)
		}
	}
*/
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
		// width and border is not allowed for center lane. center lane only needs to draw the mark and set offset
		drawRoadMark(geometry, lane.roadMark);
		return;
	}

	// lane color based on lane type
	var color = {};
	color.default = 0xCFCFCF;
	//color.restricted = 0xB3834C;

	var x = geometry.x;
	var y = geometry.y;
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

			switch(type) {
				case 'line':
					/** NOTE: Lack of condition! make sure innder border's geometry is not shifted! */
					if (geometry.offset.b == 0 && geometry.offset.c == 0 && geometry.offset.d == 0 && width.b ==0 && width.c == 0 && width.d == 0) {
						v1 = new THREE.Vector2(x, y);
						v2 = new THREE.Vector2(x + length * Math.cos(hdg), y + length * Math.sin(hdg));
						v3 = new THREE.Vector2(x + length * Math.cos(hdg) + width.a * Math.cos(hdg + Math.PI / 2 * Math.sign(lane.id)), y + length * Math.sin(hdg) + width.a * Math.sin(hdg + Math.PI / 2 * Math.sign(lane.id)));
						v4 = new THREE.Vector2(x + width.a * Math.cos(hdg + Math.PI / 2 * Math.sign(lane.id)), y + width.a * Math.sin(hdg + Math.PI / 2 * Math.sign(lane.id)));
						shape = createRectShape(v1, v2, v3, v4);

						oGeometry.x = v4.x;
						oGeometry.y = v4.y;
					} else if (geometry.offset.b == 0 && geometry.offset.c == 0 && geometry.offset.d == 0) {
						v1 = new THREE.Vector2(x, y);
						v2 = new THREE.Vector2(x + length * Math.cos(hdg), y + length * Math.sin(hdg));
						var iBorderPoints = [v1, v2];
						/** NOTE: BUG! the following works if only inner borders are all straight! re set a,b,c,d*/
						var oBorderPoints = generateCubicPoints(0, length, x, y, hdg, width.a, width.b, width.c, width.d);
						reversePoints(oBorderPoints);
						shape = createCustomShape(iBorderPoints, oBorderPoints);

						oGeometry.x = x + width.a * Math.cos(hdg + Math.PI / 2 * Math.sign(lane.id));
						oGeometry.y = y + width.a * Math.sin(hdg + Math.PI / 2 * Math.sign(lane.id));
					}

					oGeometry.offset = {};
					oGeometry.offset.sOffset = geometry.s - laneSectionStart;
					/** NOTE: POTENTIAL BUG! when add offset coefficients, make sure their ds starts at the same start **/
					var offset =  Math.max(width.sOffset + laneSectionStart - geometry.s, 0);
					oGeometry.offset.a = geometry.offset.a + Math.sign(lane.id) * (width.a + width.b * offset + width.c * Math.pow(offset, 2) + width.d * Math.pow(offset, 3));
					oGeometry.offset.b = geometry.offset.b + Math.sign(lane.id) * (width.b + 2 * width.c * offset + 2 * width.d * Math.pow(offset, 2));
					oGeometry.offset.c = geometry.offset.c + Math.sign(lane.id) * (width.c + 2 * width.d * offset);
					oGeometry.offset.d = geometry.offset.d + Math.sign(lane.id) * width.d;
			
					break;
				case 'spiral':
					if (currentWidth.length > 1) throw Error('spiral: lane width change happens');
					if (geometry.offset.b || geometry.offset.c || geometry.offset.d) throw Error('spiral: central geometry offset exists');

					/* ALWAYS use the central clothoid and shift by tOffset to find the border when paving along sprial line */
					var w = currentWidth[0].a;
					var curvStart = geometry.spiral.curvStart;
					var curvEnd = geometry.spiral.curvEnd;
					var tOffsetIBorder = geometry.offset.a;
					var iBorderPoints = generateClothoidPoints(length, centralX, centralY, hdg, curvStart, curvEnd, tOffsetIBorder);
					
					/* shifted line from clothoid with a constan width is not clothoid any more! the oLength is shorter than expected
					var oCurvStart = iCurvStart / (1 - w * Math.abs(iCurvStart) * Math.sign(iCurvStart) * Math.sign(lane.id));
					var oCurvEnd = iCurvEnd / (1 - w * Math.abs(iCurvEnd) * Math.sign(iCurvEnd) * Math.sign(lane.id));
					var oLength = length * Math.max(Math.abs(iCurvStart), Math.abs(iCurvEnd)) / Math.max(Math.abs(oCurvStart), Math.abs(oCurvEnd));
					*/
					var ox = x + w * Math.cos(hdg + Math.PI / 2 * Math.sign(lane.id));
					var oy = y + w * Math.sin(hdg + Math.PI / 2 * Math.sign(lane.id));
					
					var tOffsetOBorder = geometry.offset.a + Math.sign(lane.id) * width.a;
					var oBorderPoints = generateClothoidPoints(length, centralX, centralY, hdg, curvStart, curvEnd, tOffsetOBorder);
					reversePoints(oBorderPoints);
					shape = createCustomShape(iBorderPoints, oBorderPoints);

					oGeometry.x = ox;
					oGeometry.y = oy;
					oGeometry.spiral = {curvStart: curvStart, curvEnd: curvEnd};
					//oGeometry.length = ????
					oGeometry.offset = {sOffset: 0, a: geometry.a + Math.sign(lane.id) * width.a, b: 0, c: 0, d: 0};

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
					oGeometry.length *= 1 - w / radius * Math.sign(curvature) * Math.sign(lane.id);
					oGeometry.arc = {curvature: oCurvature};
					oGeometry.offset = {sOffset: 0, a: geometry.a + Math.sign(lane.id) * width.a, b: 0, c: 0, d: 0};
					break;
			}
		oGeometries.push(oGeometry);
		// ~ end of paving only one width seg
		}
	} else {

		for (var i = 0; i < currentWidth.length; i++) {

			var oGeometry = {};
			oGeometry.type = type;
			oGeometry.hdg = hdg;
			oGeometry.centralX = geometry.centralX;
			oGeometry.centralY = geometry.centralY;


			// offset distance along central geometry (line) from start of the geometry to start of the current width seg
			var width = currentWidth[i];
			var gOffset = width.sOffset + laneSectionStart - geometry.s;
			var nextWidthSOffset = currentWidth[i + 1] ? currentWidth[i + 1].sOffset : geometry.s + geometry.centralLength - laneSectionStart;

			var sx = centralX + gOffset * Math.cos(hdg);
			var sy = centralY + gOffset * Math.sin(hdg);

			var ds = gOffset;
			var tOffset = geometry.offset.a + geometry.offset.b * ds + geometry.offset.c * Math.pow(ds, 2) + geometry.offset.d * Math.pow(ds, 3);
			drawCustomLine([new THREE.Vector2(sx + Math.abs(tOffset) * Math.cos(hdg + Math.PI / 2 * Math.sign(tOffset)), sy + Math.abs(tOffset) * Math.sin(hdg + Math.PI / 2 * Math.sign(tOffset))), new THREE.Vector2(sx + Math.abs(tOffset) * Math.cos(hdg + Math.PI / 2 * Math.sign(tOffset)) + 10, sy + Math.abs(tOffset) * Math.sin(hdg + Math.PI / 2 * Math.sign(tOffset)))], 0x000001);

			// generate spline points
			length = Math.min(nextWidthSOffset + laneSectionStart, geometry.s + geometry.centralLength) - Math.max(width.sOffset + laneSectionStart, geometry.s);

			var ds = gOffset + length;
			var tOffset = geometry.offset.a + geometry.offset.b * ds + geometry.offset.c * Math.pow(ds, 2) + geometry.offset.d * Math.pow(ds, 3);
			drawCustomLine([new THREE.Vector2(sx + length * Math.cos(hdg) + Math.abs(tOffset) * Math.cos(hdg + Math.PI / 2 * Math.sign(tOffset)), sy + length * Math.sin(hdg) + Math.abs(tOffset) * Math.sin(hdg + Math.PI / 2 * Math.sign(tOffset))), new THREE.Vector2(sx + length * Math.cos(hdg) + Math.abs(tOffset) * Math.cos(hdg + Math.PI / 2 * Math.sign(tOffset)) + 10, sy + length * Math.sin(hdg) + Math.abs(tOffset) * Math.sin(hdg + Math.PI / 2 * Math.sign(tOffset)))], 0x000001);

			// get inner border spline points
			var iBorderPoints = generateCubicPoints(gOffset, length, sx, sy, hdg, geometry.offset.a, geometry.offset.b, geometry.offset.c, geometry.offset.d);
			drawCustomLine(iBorderPoints, 0xFF6666);

			// get outer border spline points
			/** NOTE: make sure WHICH geometry is used here to generate shifted inner border's coefficients! */
			var innerA = geometry.offset.a + geometry.offset.b * gOffset + geometry.offset.c * Math.pow(gOffset, 2) + geometry.offset.d * Math.pow(gOffset, 3);
			var innerB = geometry.offset.b + 2 * geometry.offset.c * gOffset + 2 * geometry.offset.d * Math.pow(gOffset, 2);
			var innerC = geometry.offset.c + 2 * geometry.offset.d * gOffset;
			var innerD = geometry.offset.d;

			var oBorderPoints = generateCubicPoints(Math.max(geometry.s - width.sOffset - laneSectionStart, 0), length, sx, sy, hdg, innerA + Math.sign(lane.id) * width.a, innerB + Math.sign(lane.id) * width.b, innerC + Math.sign(lane.id) * width.c, innerD + Math.sign(lane.id) * width.d);
			drawCustomLine(oBorderPoints, 0x6666FF);
			// reverse oBorder points
			reversePoints(oBorderPoints);

			shape = createCustomShape(iBorderPoints, oBorderPoints);
	
			oGeometry.length = length;
			oGeometry.s = Math.max(width.sOffset + laneSectionStart, geometry.s);
			oGeometry.offset = {};
			oGeometry.offset.sOffset = Math.max(geometry.s - width.sOffset - laneSectionStart, 0);
			oGeometry.offset.a = innerA + Math.sign(lane.id) * width.a;
			oGeometry.offset.b = innerB + Math.sign(lane.id) * width.b;
			oGeometry.offset.c = innerC + Math.sign(lane.id) * width.c;
			oGeometry.offset.d = innerD + Math.sign(lane.id) * width.d;
			oGeometry.x = sx + Math.abs(oGeometry.offset.a) * Math.cos(hdg + Math.PI / 2 * Math.sign(oGeometry.offset.a));
			oGeometry.y = sy + Math.abs(oGeometry.offset.a) * Math.sin(hdg + Math.PI / 2 * Math.sign(oGeometry.offset.a));

			oGeometries.push(oGeometry);

		}
	}

	try {
		if (lane.type != 'border' && lane.type != 'none') {
			mesh = new THREE.Mesh(new THREE.ShapeBufferGeometry(shape), new THREE.MeshBasicMaterial({color: color[lane.type]? color[lane.type] : color.default}));
			scene.add(mesh);
		}
	} catch(e) {
		console.error(e.stack)
		console.info(type)
		console.info(geometry)
	}

	//drawRoadMark(oBorder, lane.roadMark);

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
function findGeometry(road, laneSectionId) {

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
* NOTE: Won't work if any lane offset exists, the whole mapping will be messed up between geometries of all roads 
* need to change the datastructure!
*
* Per lane section, the number of lanes is constant. However, the properties of each lane (e.g. width,
* road marks, friction etc.) may change
*/
function paveLaneSection(road, laneSectionId) {

	// split lanes into two (or three?) groups: left, right, sorted by absoluate value of lane.id in ascending order (-1 -> -n) (1->m)
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
	var geometries = findGeometry(road, laneSectionId);
	
	// pave lanes for each geometry seg
	for (var i = 0; i < geometries.length; i++ ) {

		var geometry = geometries[i];
		
		var innerGeometries = [geometry];
		innerGeometries[0].centralX = geometry.x;
		innerGeometries[0].centralY = geometry.y;
		innerGeometries[0].centralLength = geometry.length;
		if (!innerGeometries[0].offset) innerGeometries[0].offset = {sOffset: 0, a: 0, b: 0, c: 0, d: 0};
	
		// left Lanes
		for (var j = 0; j < leftLanes.length; j++) {

			try {
				for (var k = 0; k < innerGeometries.length; k++) {
					innerGeometries = paveLane(start, innerGeometries[k], leftLanes[j]);
				}
			} catch(e) {
				console.info('paving error: road#' + road.id + ' laneSection#' + laneSectionId + ' geometry#' + i + ' lane#' + leftLanes[j].id);
				console.error(e.stack)
			}
		}

		innerGeometry = geometry;
		// right Lanes
		for (var j = 0; j < rightLanes.length; j++) {

			try {
				for (var k = 0; k < innerGeometries.length; k++) {
					innerGeometries = paveLane(start, innerGeometries[k], rightLanes[j]);
				}
			} catch(e) {
				console.info('paving error: road#' + road.id + ' laneSection#' + laneSectionId + ' geometry#' + i + ' lane#' + rightLanes[j].id);
				console.error(e.stack);
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

	for (var i = 0; i < roads.length; i++) {
		if (roads[i].id == '88' || roads[i].id == '1' || roads[i].id == '500')
		paveRoad(roads[i]);
	}
}
