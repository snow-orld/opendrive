/*
* Class Map
*/
var Map = function (scene, file) {
	
	this.scene = scene;
	this.roads = {};
	this.mesh = {};

	if (file) {
		this.generateFrom(file);
	}

	if (this.isValidate()) {
		this.generateMesh();
	} else {
		throw Error('Map construct error: invalid openDrive data');
	}
}

/*
* @Parameter xmlFile
* @Return {roads, controllers, junctions, junctionGroups} only roads must be present
*/
Map.prototype.parseFromXML = function(xmlFile) {

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

	// road records 1+
	var roadNodes = xmlDoc.getElementsByTagName('road');
	var roads = {};

	for ( var i=0 ; i < roadNodes.length; i++ )
	{
		var roadNode = roadNodes[i];
		var id = roadNode.id;	// road id type string

		roads[id] = {};
		roads[id].id = id;
		roads[id].name = roadNode.getAttribute('name');
		roads[id].length = parseFloat(roadNode.getAttribute('length'));
		roads[id].junction =roadNode.getAttribute('junction');	// belonging junction id, =-1 for none

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

		// elevationPorfile 0...1
		var elevationProfileNodes = roadNode.getElementsByTagName('elevationProfile');
		if (elevationProfileNodes.length) {
		
			// elevation nodes 1+
			var elevationNodes = roadNode.getElementsByTagName('elevation');
			if (elevationNodes.length) roads[id].elevation = [];
			for (var j=0; j < elevationNodes.length; j++) {

				var elevationNode = elevationNodes[j];
				roads[id].elevation[j] = {};
				roads[id].elevation[j].s = parseFloat(elevationNode.getAttribute('s'));
				roads[id].elevation[j].a = parseFloat(elevationNode.getAttribute('a'));
				roads[id].elevation[j].b = parseFloat(elevationNode.getAttribute('b'));
				roads[id].elevation[j].c = parseFloat(elevationNode.getAttribute('c'));
				roads[id].elevation[j].d = parseFloat(elevationNode.getAttribute('d'));
			}
		}

		// superelevation 0+
		var superelevationNodes = roadNode.getElementsByTagName('superelevation');
		if (superelevationNodes.length) roads[id].superelevation = [];

		for (var j=0; j < superelevationNodes.length; j++) {

			var superelevationNode = superelevationNodes[j];

			roads[id].superelevation[j] = {};
			roads[id].superelevation[j].s = parseFloat(superelevationNode.getAttribute('s'));
			roads[id].superelevation[j].a = parseFloat(superelevationNode.getAttribute('a'));
			roads[id].superelevation[j].b = parseFloat(superelevationNode.getAttribute('b'));
			roads[id].superelevation[j].c = parseFloat(superelevationNode.getAttribute('c'));
			roads[id].superelevation[j].d = parseFloat(superelevationNode.getAttribute('d'));
		}

		// crossfall 0+ (available xdor shows no examples)
		var crossfallNodes = roadNode.getElementsByTagName('crossfall');
		if (crossfallNodes.length) roads[id].crossfall = [];

		for (var j=0; j < crossfallNodes.length; j++) {

			var crossfallNode = crossfallNodes[j];

			roads[id].crossfall[j] = {};
			roads[id].crossfall[j].side = crossfallNode.getAttribute('side');
			roads[id].crossfall[j].s = parseFloat(crossfallNode.getAttribute('s'));
			roads[id].crossfall[j].a = parseFloat(crossfallNode.getAttribute('a'));
			roads[id].crossfall[j].b = parseFloat(crossfallNode.getAttribute('b'));
			roads[id].crossfall[j].c = parseFloat(crossfallNode.getAttribute('c'));
			roads[id].crossfall[j].d = parseFloat(crossfallNode.getAttribute('d'));
		}

		// shape 0+ (available xdor shows no examples)
		var shapeNodes = roadNode.getElementsByTagName('shape');
		if (shapeNodes.length) roads[id].shape = [];

		for (var j=0; j < shapeNodes.length; j++) {

			var shapeNode = shapeNodes[j];

			roads[id].shape[j] = {};
			roads[id].shape[j].s = parseFloat(shapeNode.getAttribute('s'));
			roads[id].shape[j].t = parseFloat(shapeNode.getAttribute('t'));
			roads[id].shape[j].a = parseFloat(shapeNode.getAttribute('a'));
			roads[id].shape[j].b = parseFloat(shapeNode.getAttribute('b'));
			roads[id].shape[j].c = parseFloat(shapeNode.getAttribute('c'));
			roads[id].shape[j].d = parseFloat(shapeNode.getAttribute('d'));
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

				roads[id].laneSection[j].lane[k] = {};
				roads[id].laneSection[j].lane[k].id = parseInt(laneNode.getAttribute('id'));
				roads[id].laneSection[j].lane[k].type = laneNode.getAttribute('type');
				roads[id].laneSection[j].lane[k].level = laneNode.getAttribute('level');

				// 0..1 lane predecessor
				var lanePredecessorNodes = laneNode.getElementsByTagName('predecessor');
				if (lanePredecessorNodes.length == 1) {
					roads[id].laneSection[j].lane[k].predecessor = parseInt(lanePredecessorNodes[0].getAttribute('id'));
				}

				// 0..1 lane successor
				var laneSuccessorNodes = laneNode.getElementsByTagName('successor');
				if (laneSuccessorNodes.length == 1) {
					roads[id].laneSection[j].lane[k].successor = parseInt(laneSuccessorNodes[0].getAttribute('id'));
				}

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
		//if (id == '500') console.log(roads[id])
	}

	// controller records 0+
	var controllerNodes = [];
	for (var i=0; i < xmlDoc.firstElementChild.children.length; i++) 
	{
		if (xmlDoc.firstElementChild.children[i].nodeName == 'controller') {
			controllerNodes.push(xmlDoc.firstElementChild.children[i]);
		}
	}
	
	if (controllerNodes.length) 
	{
		var controllers = {};
		
		for (var i=0; i < controllerNodes.length; i++) 
		{

			var controllerNode = controllerNodes[i];
			var id = controllerNode.id;		// controller id type string

			controllers[id] = {};
			controllers[id].id = id;
			controllers[id].name = controllerNode.getAttribute('name');
			controllers[id].sequence = parseInt(controllerNode.getAttribute('sequence') || -1);	// uint32_t [0, +oo], -1 for none
			controllers[id].control = [];

			var controlNodes = controllerNode.getElementsByTagName('control');
			for (var j=0; j < controlNodes.length; j++) {

				var controlNode = controlNodes[j];
				var singalId = controlNode.getAttribute('signalId');
				
				controllers[id].control[singalId] = {};
				controllers[id].control[singalId].singalId = singalId;
				controllers[id].control[singalId].type = controlNode.getAttribute('type');
			}
		}
	}

	// junction records 0+
	var junctionNodes = xmlDoc.getElementsByTagName('junction');

	if (junctionNodes.length) 
	{
		var junctions = {};

		for (var i=0; i < junctionNodes.length; i++) 
		{
			var junctionNode = junctionNodes[i];
			var id = junctionNode.id;	// junction id type string

			junctions[id] = {};
			junctions[id].id = id;
			junctions[id].name = junctionNode.getAttribute('name');
			junctions[id].connection = {};

			var connectionNodes = junctionNode.getElementsByTagName('connection');
			for (var j=0; j < connectionNodes.length; j++) {

				var connectionNode = connectionNodes[j];
				var connectionId = connectionNode.id;

				junctions[id].connection[connectionId] = {};
				junctions[id].connection[connectionId].id = connectionId;
				junctions[id].connection[connectionId].incomingRoad = connectionNode.getAttribute('incomingRoad');
				junctions[id].connection[connectionId].connectingRoad = connectionNode.getAttribute('connectingRoad');
				junctions[id].connection[connectionId].contactPoint = connectionNode.getAttribute('contactPoint');

				var laneLinkNodes = connectionNode.getElementsByTagName('laneLink');
				if (laneLinkNodes.length) junctions[id].connection[j].laneLink = [];
				
				// laneLink 0+ 'from' is incoming lane Id, 'to' is connection lane
				for (var k=0; k < laneLinkNodes.length; k++) {

					var laneLinkNode = laneLinkNodes[k];

					junctions[id].connection[j].laneLink[k] = {};
					junctions[id].connection[j].laneLink[k].from = parseInt(laneLinkNode.getAttribute('from'));
					junctions[id].connection[j].laneLink[k].to = parseInt(laneLinkNode.getAttribute('to'));
				}
			}

			var priorityNodes = junctionNode.getElementsByTagName('priority');
			if (priorityNodes.length) junctions[id].priority = [];
			for (var j=0; j < priorityNodes.length; j++) {

				var priorityNode = priorityNodes[j];
				
				junctions[id].priority[j] = {};
				junctions[id].priority[j].high = priorityNode.getAttribute('high');
				junctions[id].priority[j].low = priorityNode.getAttribute('low');
			}

			var controllerNodes = junctionNode.getElementsByTagName('controller');
			if (controllerNodes.length) junctions[id].controller = [];
			for (var j=0; j < controllerNodes.length; j++) {

				var controllerNode = controllerNodes[j];

				junctions[id].controller[j] = {};
				junctions[id].controller[j].id = controllerNode.getAttribute('id');
				junctions[id].controller[j].type = controllerNode.getAttribute('type');
				junctions[id].controller[j].sequence = parseInt(controllerNode.getAttribute('sequence') || -1);	// uint32_t [0, +oo], -1 for none
			}
		}
	}

	// junction group records 0+
	var junctionGroupNodes = xmlDoc.getElementsByTagName('junctionGroup');
	
	if (junctionGroupNodes.length) {
	
		var junctionGroups = {};

		for (var i=0; i < junctionGroupNodes.length; i++) 
		{

			var junctionGroupNode = junctionGroupNodes[i];

			var id = junctionGroupNode.id;
			junctionGroups[id] = {};
			junctionGroups[id].id = id;
			junctionGroups[id].name = junctionGroupNode.getAttribute('name');
			junctionGroups[id].type = junctionGroupNode.getAttribute('type');
			junctionGroups[id].junctionReference = [];

			var junctionReferenceNodes = junctionGroupNode.getElementsByTagName('junctionReference');
			for (var j=0; j < junctionReferenceNodes.length; j++) {

				var junctionReferenceNode = junctionReferenceNodes[j];
				junctionGroups[id].junctionReference[j] = {};
				junctionGroups[id].junctionReference[j].junction = junctionReferenceNode.getAttribute('junction');	// ID of the junction
			}
		}
	}

	return {roads, controllers, junctions, junctionGroups};
}

/*
* @Parameter jsonFile
* @Return {roads, controllers, junctions, junctionGroups} only roads must be present
*/
Map.prototype.parseFromJSON = function(jsonFile) {

	// Chrome
	xmlHttp = new window.XMLHttpRequest();
	xmlHttp.open("GET", jsonFile, false);
	xmlHttp.overrideMimeType('application/json');
	xmlHttp.send(null);
	jsonDoc = xmlHttp.responseText;

	return JSON.parse(jsonDoc);
}

Map.prototype.generateFrom = function(file) {

	if (file.split('.').pop() == 'xodr') {
		var map = this.parseFromXML(file);
		this.roads = map.roads;
		if (map.controllers) this.controllers = map.controllers;
		if (map.junctions) this.junctions = map.junctions;
		if (map.junctionGroups) this.junctionGroups = map.junctionGroups;
	} else if (file.split('.').pop() == 'json') {
		var map = this.parseFromJSON(file);
		this.roads = map.roads;
		if (map.controllers) this.controllers = map.controllers;
		if (map.junctions) this.junctions = map.junctions;
		if (map.junctionGroups) this.junctionGroups = map.junctionGroups;
	}
}

Map.prototype.generateMesh = function() {
	
	preProcessing(this.roads);

	for (var id in this.roads) {
		this.mesh[id] = generateRoadMesh(this.roads[id]);
	}
}

Map.prototype.isValidate = function() {

	var isValidate = true;

	if (this.roads.length == 0) isValidate = false;

	for (var id in this.roads) {
		isValidate = isValidateRoad(this.roads[id])
	}

	return isValidate;
}

Map.prototype.getRoadsCnt = function() {
	var cnt = 0;
	for (var id in this.roads) {
		cnt++;
	}
	return cnt;
}

Map.prototype.getRoadIds = function() {
	var ids = [];
	for (var id in this.roads) {
		ids.push(id);
	}
	return ids;
}

Map.prototype.hasRoad = function(roadId) {
	var doHave;
	if (roadId in this.roads) {
		doHave = true;
	} else {
		doHave = false;
	}
	return doHave;
}

Map.prototype.getRoad = function(roadId) {

	if (!this.hasRoad(roadId)) {
		throw Error('Map.getRoad error: invalid roadId');
	}

	var road = new Road(this.roads[roadId]);
	return road;
}

// laneSectionId can be omitted
Map.prototype.paveRoadById = function(roadId, laneSectionId) {
	
	if (!this.hasRoad(roadId)) {
		throw Error('Map.paveRoadById error: invalid roadId');
		return;
	}

	// laneSectionId can be omitted, if so, pave the whole road
	if (!laneSectionId) {
		for (var laneSectionId = 0; laneSectionId < this.mesh[roadId].length; laneSectionId++) {
			for (var i =0; i < this.mesh[roadId][laneSectionId].pavement.length; i++) {
				this.scene.add(this.mesh[roadId][laneSectionId].pavement[i]);
			}
		}
	} else {
		if (laneSectionId < 0 || laneSectionId > this.roads[roadId].laneSection.length - 1) {
			throw Error('paveRoadById error: invalid laneSectionId#', laneSectionId);
		} else {
			for (var i = 0; i < this.mesh[roadId][laneSectionId].pavement.length; i++) {
				this.scene.add(this.mesh[roadId][laneSectionId].pavement[i]);
			}
		}
	}
}

Map.prototype.paveAllRoads = function() {

	for (var id in this.roads) {
		this.paveRoadById(id)
	}
}

Map.prototype.paveRoadsByIds = function(roadIds) {

	for (var i = 0; i < roadIds.length; i++) {

		var id = roadIds[i];
		if (!this.hasRoad(id)) {
			throw Error('Map.paveRoadsByIds error: invalid roadIds, roadId#', id, 'does not exist in Map');
			return;
		}

		this.paveRoadById(id);
	}
}

// laneSectionId can be omitted
Map.prototype.showReferenceLineById = function(roadId, laneSectionId) {
	
	if (!this.hasRoad(roadId)) {
		throw Error('Map.showReferenceLineById error: invalid roadId#', id, 'does not exist in Map');
	}

	// laneSectionId can be omitted, if so, pave the whole road
	if (!laneSectionId) {
		for (var laneSectionId = 0; laneSectionId < this.mesh[roadId].length; laneSectionId++) {
			for (var i =0; i < this.mesh[roadId][laneSectionId].referenceLine.length; i++) {
				this.scene.add(this.mesh[roadId][laneSectionId].referenceLine[i]);
			}
		}
	} else {
		if (laneSectionId < 0 || laneSectionId > this.roads[roadId].laneSection.length - 1) {
			throw Error('paveRoadById error: invalid laneSectionId#', laneSectionId);
		} else {
			for (var i = 0; i < this.mesh[roadId][laneSectionId].referenceLine.length; i++) {
				this.scene.add(this.mesh[roadId][laneSectionId].referenceLine[i]);
			}
		}
	}
}

// roadIds can be ommited
Map.prototype.showReferenceLine = function(roadIds) {

	if (roadIds) {
		for (var i=0; i < roadIds.length; i++) {
			var id = roadIds[i];
			if (!this.hasRoad(id)) {
				throw Error('Map.showReferenceLine error: invalid roadIds, Map does not have roadId#', roadId);
				return;
			}
			this.showReferenceLineById(id);
		}	
	} 
	// if roadIds are not speicified, show all roads' reference line
	else {
		for (var id in this.roads) {
			this.showReferenceLineById(id);
		}
	}
}

Map.prototype.saveAsMap = function(filename) {

	var map = {};
	map.roads = this.roads;
	if (this.controllers) map.controllers = this.controllers;
	if (this.junctions) map.junctions = this.junctions;
	if (this.junctionGroups) map.junctionGroups = this.junctionGroups;
	saveFile(map, filename);
}

Map.prototype.getConnectingRoadIds = function(roadId) {

	if (!map.roads[roadId]) return [];

	var roadIds = [];
	var junctionId = map.roads[roadId].junction;
	var predecessor = map.roads[roadId].predecessor;
	var successor = map.roads[roadId].successor;
	var addedself = false;	// flag if need to push roadId to roadIds at the end

	if (junctionId == '-1') {
		// the road is not in a junction, get its predecessor and successor if any
		if (predecessor) {
			roadIds = roadIds.concat(getLinkedRoadId(predecessor));
			if (predecessor.elementType == 'junction') addedself = true;
		}
		if (successor) {
			roadIds = roadIds.concat(getLinkedRoadId(successor));
			if (successor.elementType == 'junction') addedself = true;
		}
		
		// if neither predecessor not successor is of element type junction, meaning target roadId is not in the roadIds yet
		if (!addedself) {
			roadIds.push(roadId);
		}
	} else {
		// the road is in a junction, get all roads (incoming and connection roads) in the junction
		roadIds = getRoadIdsInJunction(junctionId);
	}

	/* POTENTIAL PROBLEM!
	* if the connecting roads of junction is very short, the returned roads do not cover enough area to show.
	* may need to specify a radius (forward or backward distance in all posible directions) given a s-position on a roadId
	*/
	return roadIds;
}

Map.prototype.track2Inertial = function(roadId, s, t, h) {

	var road = map.roads[roadId];

	if (!road) {
		console.warn('track2Inertial: no road of roadId#', roadId, 'found');
		return;
	}

	if (s < 0 || s > road.length) {
		throw Error('converting from track system to inertial system error: invalid s', s, 'for road#', roadId, 'total length', road.length);
	}

	/*
	* Helper for track2Inertial
	*/
	function getGeometryAtS(road, s) {
		var result = null;
		
		for (var i = 0; i < road.geometry.length; i++) {
			var geometry = road.geometry[i];

			if (geometry.s + geometry.length <= s) continue;
			else if (geometry.s <= s) result = geometry; //console.log(geometry.s, s, geometry.s <= s)}
			else break;
		}

		// must be s == road.length if result == null
		return result;
	}

	function getElevationAtS(road, s) {
		var result = null;

		if (!road.elevation || !road.elevation.length) return -1;

		for (var i = 0; i < road.elevation.length; i++) {
			var elevation = road.elevation[i];
			var nextElevationS = road.elevation[i + 1] ? road.elevation[i + 1].s : road.geometry[road.geometry.length - 1].s + road.geometry[road.geometry.length - 1].length;

			if (nextElevationS <= s) continue;
			else if (elevation.s > s) break;
			else {
				if (!(elevation.s <= s)) throw Error('condition needs changing')
				result = elevation;
			}
		}

		// must be s == road.length if result == null
		return result;
	}

	function getSupserelevationAtS(road, s) {
		var result = null;

		if (!road.superelevation) return -1;

		for (var i = 0; i < road.superelevation.length; i++) {
			var superelevation = road.superelevation[i];
			var nextSupserElevationS = road.superelevation[i + 1] ? road.superelevation[i + 1].s : road.geometry[road.geometry.length - 1].s + road.geometry[road.geometry.length - 1].length;

			if (nextSupserElevationS <= s) continue;
			else if (superelevation.s > s) break;
			else {
				if (!(superelevation.s <= s)) throw Error('condition needs changing');
				result = superelevation;
			}
		}

		// must be s == road.length if result == null
		return result;
	}

	function getCrossfallAtS(road, s) {
		var result = null;

		if (!road.crossfall) return -1;

		for (var i = 0; i < road.crossfall.length; i++) {
			var crossfall = road.corssfall[i];
			var nextCrossfallS = road.crossfall[i + 1] ? road.crossfall[i + 1].s : road.geometry[road.geometry.length - 1].s + road.geometry[road.geometry.length - 1].length;

			if (nextCrossfallS <= s) continue;
			else if (crossfall.s > s) break;
			else {
				if (!(crossfall.s <= s)) throw Error('condition needs changing');
				result = crossfall;
			}
		}

		// must be s == road.length if result == null
		return result;
	}

	function getLaneOffsetAtS(road, s) {
		var result = null;

		if (!road.laneOffset) return -1;

		for (var i = 0; i < road.laneOffset.length; i++) {
			var laneOffset = road.laneOffset[i];
			var nextLaneOffsetS = road.laneOffset[i + 1] ? road.laneOffset[i + 1].s : road.geometry[road.geometry.length - 1].s + road.geometry[road.geometry.length - 1].length;

			if (nextLaneOffsetS <= s) continue;
			else if (nextLaneOffsetS > s) break;
			else {
				if (!(nextLaneOffsetS <= s)) throw Error('condition needs changing')
				result = laneOffset;
			}
		}

		// must be s == road.length if result == null
		return result;
	}

	function getLaneSectionAtS(road, s) {
		var result;

		for (var i = 0; i < road.laneSection.length; i++) {
			var laneSection = road.laneSection[i];
			var nextLaneSectionS = road.laneSection[i + 1] ? road.laneSection[i + 1].s : road.geometry[road.geometry.length - 1].s + road.geometry[road.geometry.length - 1].length;

			if (laneSection.s <= s) continue;
			else if (nextLaneSectionS > s) break;
			else {
				if (!(nextLaneSectionS <= s)) throw Error('condition needs changing');
				result = laneSection;
			}
		}

		// must be s == road.length if result == null
		return result;
	}

	var geometry = getGeometryAtS(road, s);
	var elevation = getElevationAtS(road, s);
	var superelevation = getElevationAtS(road, s);
	var crossfall = getCrossfallAtS(road, s);
	var laneOffset = getLaneOffsetAtS(road, s);
	var laneSection = getLaneSectionAtS(road, s);

	if (elevation == -1) elevation = {s: 0, a: 0, b: 0, c: 0, d: 0};
	if (laneOffset == -1) laneOffset = {s: 0, a: 0, b: 0, d: 0};
	if (superelevation == -1) superelevation = {s: 0, a: 0, b: 0, c: 0, d: 0};
	if (crossfall == -1) crossfall = {side: 'both', s: 0, a: 0, b: 0, c: 0, d: 0};

	if (geometry == null) {
		
		// s == road.length
		geometry = road.geometry[road.geometry.length - 1];
		laneSection = road.laneSection[road.geometry.length - 1];
		
		if (elevation == null) elevation = road.elevation[road.elevation.length - 1];
		if (laneOffset == null) laneOffset = road.laneOffset[road.laneOffset.length - 1];
		if (superelevation == null) superelevation = road.superelevation[road.superelevation.length - 1];
		if (crossfall == null) crossfall = road.crossfall[road.crossfall.length - 1];	
	}
	
	var sOffset, hdg, roll, pitch, centralTOffset;
	var svector, tvector;
	var x, y, z;

	// xy-plane
	sOffset = s - geometry.s;
	switch(geometry.type) {
		case 'line':
			svector = new THREE.Vector3(1, 0, 0);
			svector.applyAxisAngle(new THREE.Vector3(0, 0, 1), geometry.hdg);

			tvector = svector.clone();
			tvector.cross(new THREE.Vector3(0, 0, -1));	//? cross svector.x, svector.y, -1 or 0,0,-1?
			
			hvector = svector.clone();
			hvector.cross(tvector);

			hdg = geometry.hdg;
			x = geometry.x + sOffset * Math.cos(geometry.hdg);
			y = geometry.y + sOffset * Math.sin(geometry.hdg);

			break;
		case 'spiral':
			//generateSpiralPoints(length, sx, sy, hdg, curvStart, curvEnd, ex, ey, tOffset, subOffset, subLength)
			var sample = generateSpiralPoints(geometry.length, geometry.x, geometry.y, geometry.hdg, geometry.spiral.curvStart, geometry.spiral.curvEnd, geometry.ex, geometry.ey, t, sOffset, geometry.length + geometry.s - s);
			hdg = sample.heading[0];
			x = sample.points[0].x;
			y = sample.points[0].y;

			break;
		case 'arc':
			var curvature = geometry.arc.curvature;
			var radius = 1 / Math.abs(curvature);
			var rotation = geometry.hdg - Math.sign(curvature) * Math.PI / 2;
			var theta = sOffset * curvature;
			hdg = geometry.hdg + theta;
			x = geometry.x - radius * Math.cos(rotation) + radius * Math.cos(rotation + theta);
			y = geometry.y - radius * Math.sin(rotation) + radius * Math.sin(rotation + theta);
	}

	// z when calcuating pitch of s-t, need to consider at connection pointn of elevation curve
	sOffset = s - elevation.s;
	z = elevation.a + elevation.b * sOffset + elevation.c * Math.pow(sOffset, 2) + elevation.d * Math.pow(sOffset, 3);

	var prez = elevation.a + elevation.b * (sOffset - 0.1) + elevation.c * Math.pow(sOffset - 0.1, 2) + elevation.d * Math.pow(sOffset - 0.1, 3);
	pitch = Math.atan((z - prez) / 0.1);

	// superElevation
	sOffset = s - superelevation.s;
	roll = superelevation.a + superelevation.b * sOffset + superelevation.c * Math.pow(sOffset, 2) + superelevation.d * Math.pow(sOffset, 3);
	
	return {
		position: new THREE.Vector3(x, y, z),
		rotation: new THREE.Euler(roll, pitch, hdg, 'XYZ')
	}
}

/*
* Class Road
*/
var Road = function(road) {
	
	if (road && road instanceof Object && isValidateRoad(road)) {
		
		this.id = road.id;
		this.name = road.name;
		this.length = road.length;
		this.junction = road.junction;

		this.geometry = JSON.parse(JSON.stringify(road.geometry));
		this.laneSection = JSON.parse(JSON.stringify(road.laneSection));

		if (road.predecessor) {
			this.predecessor = JSON.parse(JSON.stringify(road.predecessor));
		}
		if (road.successor) {
			this.successor = JSON.parse(JSON.stringify(road.successor));
		}
		if (road.elevation) {
			this.elevation = JSON.parse(JSON.stringify(road.elevation));
		}
		if (road.superelevation) {
			this.superelevation = JSON.parse(JSON.stringify(road.superelevation));
		}
		if (road.crossfall) {
			this.crossfall = JSON.parse(JSON.stringify(road.crossfall));
		}
		if (road.shape) {
			this.shape = JSON.parse(JSON.stringify(road.shape));
		}
		if (road.laneOffset) {
			this.laneOffset = JSON.parse(JSON.stringify(road.laneOffset));
		}
	} else {
		throw Error('Road construct error: invalid argument road');
	}
}

Road.prototype.isValidate = function() {

	return isValidateRoad(this);
}

Road.prototype.getGeometriesCnt = function() {

	return road.geometry.length;
}

Road.prototype.getLaneSectionsCnt = function() {

	return this.laneSection.length;
}

Road.prototype.saveAsMap = function() {
	var road = JSON.parse(JSON.stringify(this));
	var filename = 'road#' + road.id + '.json';
	saveFile([road], filename);
}

/*
* Private functions
*/
var step = 1; // generate point in step 1m for spiral curve, later apply to arc generation

function isValidateRoad(road) {

	var isValidate = true;

	if (!(road instanceof Object)) {
		return false;
	}

	if (!road.hasOwnProperty('id') || typeof road.id != "string") {
		console.info('invalid road id: road id is not of type string')
		return false;
	} else if (typeof parseInt(road.id) != "number") {
		console.info('invalid road id: not number string')
		return false;
	} else if (typeof parseInt(road.id) < 0) {
		console.info('invalid road id: negative number string')
		return false;
	}

	if (!road.hasOwnProperty('name') || typeof road.name != "string") {
		return false;
	}

	if (!road.hasOwnProperty('length') || typeof road.length != "number") {
		return false;
	} else if (road.length <= 0) {
		console.info('invalid road length: road length <= 0')
		return false;
	}

	if (!road.hasOwnProperty('junction') || typeof road.junction != "string") {
		console.info('invalid road junction: road junction if not of type string')
		return false;
	}

	if (road.geometry.length == 0) {
		console.info('invalid road.geometry: road.geometry.length is 0')
		return false;
	}

	if (road.laneSection.length == 0) {
		console.info('invalid road.laneSection: road.laneSection.length is 0')
		return false;
	}

	if (Math.abs(road.length - road.geometry[road.geometry.length - 1].s - road.geometry[road.geometry.length - 1].length) > 1E-4) {
		console.info('invalid road.length: road.length does not match geometry total length')
		return false;
	}

	for (var i = 0; i < road.geometry.length; i++) {

		var geometry = road.geometry[i];
		//console.log('road#', road.id, 'geometry#', i, geometry)

		if (!geometry.hasOwnProperty('s') || typeof geometry.s != "number") {
			console.info('invalid road.geometry#', i, 'geometry.s is not of type number')
			isValidate = false; break;
		}

		if (!geometry.hasOwnProperty('x') || typeof geometry.x != "number") {
			console.info('invalid road.geometry#', i, 'geometry.x is not of type number')
			isValidate = false; break;
		}

		if (!geometry.hasOwnProperty('y') || typeof geometry.y != "number") {
			console.info('invalid road.geometry#', i, 'geometry.y is not of type number')
			isValidate = false; break;
		}

		if (!geometry.hasOwnProperty('hdg') || typeof geometry.hdg != "number") {
			console.info('invalid road.geometry#', i, 'geometry.hdg is not of type number')
			isValidate = false; break;
		}

		if (!geometry.hasOwnProperty('length') || typeof geometry.length != "number") {
			console.info('invalid road.geometry#', i, 'geometry.length is not of type number')
			isValidate = false; break;
		} else {
			if (geometry.length < 0) {
				console.info('invalid road.geometry#', i, 'geometry.length is < 0')
				isValidate = false; break;
			}
		}

		if (!geometry.hasOwnProperty('type') || typeof geometry.type != "string") {
			console.info('invalid road.geometry#', i, 'geometry.type is not of string')
			isValidate = false; break;
		} else if (geometry.type == 'spiral') {
			if (!geometry.hasOwnProperty('spiral') || !(geometry.spiral instanceof Object)) {
				console.info('invalid road.geometry#', i, 'geometry.spiral missing')
				isValidate = false; break;
			} else if (!geometry.spiral.hasOwnProperty('curvStart') || !geometry.spiral.hasOwnProperty('curvEnd')) {
				console.info('invalid road.geometry#', i, 'geometry.spiral.curvStart or curvEnd missing')
				isValidate = false; break;
			} else if (typeof geometry.spiral.curvStart != "number" || typeof geometry.spiral.curvEnd != "number") {
				console.info('invalid road.geometry#', i, 'geometry.spiral.curvStart or curvEnd is not of type number')
				isValidate = false; break;
			}
		} else if (geometry.type == 'arc') {
			if (!geometry.hasOwnProperty('arc') || !(geometry.arc instanceof Object)) {
				console.info('invalid road.geometry#', i, 'geometry.arc missing')
				isValidate = false; break;
			} else if (!geometry.arc.hasOwnProperty('curvature')) {
				console.info('invalid road.geometry#', i, 'geometry.arc.curvature missing')
				isValidate = false; break;
			} else if (typeof geometry.arc.curvature != "number") {
				console.info('invalid road.geometry#', i, 'geometry.arc.curvature is not of type number')
				isValidate = false; break;
			}
		}
	}

	if (!isValidate) {
		return false;
	}

	for (var i = 0; i < road.laneSection.length; i++) {
		var laneSection = road.laneSection[i];
		if (!laneSection.hasOwnProperty('s') || typeof laneSection.s != "number") {
			console.info('invalid road.laneSection#', i, 'laneSection.s is not of type number')
			isValidate = false; break;
		} else if (Math.abs(laneSection.s - road.length) < 1E-4){
			console.info('invalid road.laneSection#', i, 'laneSection.s is the same as road.length')
			isValidate = false; break;
		} else if (laneSection.lane.length == 0) {
			console.info('invalid road.laneSection#', i, 'laneSection.lane.length == 0')
			isValidate = false; break;
		}
	}

	if (!isValidate) {
		return false;
	}

	return isValidate;
}

function saveFile(data, filename){
    if(!data) {
        console.error('No data')
        return;
    }

    if(!filename) filename = 'console.json'

    if(typeof data === "object"){
        data = JSON.stringify(data, undefined, 4)
    }

    var blob = new Blob([data], {type: 'text/json'}),
        e    = document.createEvent('MouseEvents'),
        a    = document.createElement('a')

    a.download = filename
    a.href = window.URL.createObjectURL(blob)
    a.dataset.downloadurl =  ['text/json', a.download, a.href].join(':')
    e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
    a.dispatchEvent(e)
}

/*
* Pre-process each road's geometry entries based on laneOffset, making sure in each geometry, there is only one kind of laneOffset
*/
function preProcessing(roads) {
	for (var id in roads) {
		var road = roads[id];
		road.geometry = subDivideRoadGeometry(road);

		// assign central reference line's position 
		// and end position for each sub-devided geometry
		for (var j=0; j < road.geometry.length; j++) {
			var geometry = road.geometry[j];
			var endPosition = getGeoemtryEndPosition(roads, id, j);
			geometry.ex = endPosition.x;
			geometry.ey = endPosition.y;
			geometry.centralX = geometry.x;
			geometry.centralY = geometry.y;
		}
	}
}

/*
* Find the successor geometry's start, as the actual end point of current geometry
*
* @Param road the road that possess current geometry
* @Param geometryId the index of current geometry in the road.geometry array
* @Return {ex, ey} the actual end position in x-y plane
*/
function getGeoemtryEndPosition(roads, roadId, geometryId) {

	var ex = null;
	var ey = null;
	var road = roads[roadId];

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
			if (road.successor.contactPoint == 'start') {
				ex = nextGeometry.x;
				ey = nextGeometry.y;	
			} else if (road.successor.contactPoint == 'end') {
				
			} else {
				throwError('invalid road successor contactPoint');
			}
			
		}
	}

	return {ex: ex, ey: ey};
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

function generateRoadMesh(road) {

	var mesh = [];
	for (var i  = 0; i < road.laneSection.length; i++) {

		try {
			mesh[i] = {};
			mesh[i].pavement = generateLaneSectionMesh(road, i);
			mesh[i].referenceLine = generateLaneSectionReferenceLineMesh(road, i);
		} catch(e) {
			console.info('paving error: road#' + road.id + ' laneSection#' + i);
			console.error(e.message + '\n' + e.stack);
		}
	}
	return mesh;
}

function generateLaneSectionMesh(road, laneSectionId) {

	var mesh = [];

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
	var end = road.laneSection[laneSectionId + 1] ? road.laneSection[laneSectionId + 1].s : road.geometry[road.geometry.length - 1].s + road.geometry[road.geometry.length - 1].length;
	var geometries = getGeometry(road, start, end);

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

		// elevation and lateral profile
		var elevationLateralProfile = {};
		elevationLateralProfile.elevations = getElevation(road, start, end);
		elevationLateralProfile.superelevations = getSuperElevation(road, start, end);
		elevationLateralProfile.crossfalls = getCrossfall(road, start, end);

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
					var oGeometries = generateLaneMesh(start, innerGeometry, elevationLateralProfile, leftLanes[j], mesh);
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
					var oGeometries = generateLaneMesh(start, innerGeometry, elevationLateralProfile, rightLanes[j], mesh);
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
			generateLaneMesh(start, geometry, elevationLateralProfile, centralLane, mesh);
		} catch(e) {
			console.info('paving error: road#' + road.id + ' laneSection#' + laneSectionId + ' geometry#' + i + ' lane#' + centralLane.id);
			console.error(e.stack)
		}
	}

	return mesh;
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

function getCrossfall(road, s, es) {

	if (s >= es + 1E-4) {
		throw Error('getCrossfall error: start-s >= endS + 1E-4');
	}

	var crossfalls = [];
	var found = false;

	if (!road.crossfall) {
		return crossfalls;
	}

	for (var i = 0; i < road.crossfall.length; i++) {

		var crossfall = road.crossfall[i];
		var nextCrossfallS = road.crossfall[i + 1] ? road.crossfall[i + 1].s :  road.geometry[road.geometry.length - 1].s + road.geometry[road.geometry.length - 1].length;

		// if already fount the start of the returning supserelevation, copy the rest supserelevations as the succeeding ones until es
		if (found) {
			if (crossfall.s < es) {
				crossfalls.push(crossfall);
			} else {
				break;
			}
		}

		if (!found) {
			if (crossfall.s == s) {
				crossfalls.push(crossfall);
			} else if (crossfall.s < s && nextCrossfallS > s) {
				var sOffset = s - crossfall.s;
				var newCrossfall = {};
				newCrossfall.s = s;
				newCrossfall.side = crossfall.side;
				newCrossfall.a = crossfall.a + crossfall.b * sOffset + crossfall.c * Math.pow(sOffset, 2) + crossfall.d * Math.pow(sOffset, 3);
				newCrossfall.b = crossfall.b + 2 * crossfall.c * sOffset + 3 * crossfall.d * Math.pow(sOffset, 2);
				newCrossfall.c = crossfall.c + 3 * crossfall.d * sOffset;
				newCrossfall.d = crossfall.d;
				crossfalls.push(newCrossfall);
			}
			found = true;
		}
	}

	return crossfalls;
}

function getSuperElevation(road, s, es) {

	if (s >= es + 1E-4) {
		throw Error('getSuperElevation error: start-s >= endS + 1E-4');
	}

	var superelevations = [];
	var found = false;

	if (!road.superelevation) {
		return superelevations;
	}

	for (var i = 0; i < road.superelevation.length; i++) {

		var superelevation = road.superelevation[i];
		var nextSupserElevationS = road.superelevation[i + 1] ? road.superelevation[i + 1].s :  road.geometry[road.geometry.length - 1].s + road.geometry[road.geometry.length - 1].length;

		// if already fount the start of the returning supserelevation, copy the rest supserelevations as the succeeding ones until es
		if (found) {
			if (superelevation.s < es) {
				superelevations.push(superelevation);
			} else {
				break;
			}
		}

		if (!found) {
			if (superelevation.s == s) {
				superelevations.push(superelevation);
			} else if (superelevation.s < s && nextSupserElevationS > s) {
				var sOffset = s - superelevation.s;
				var newSuperelevation = {};
				newSuperelevation.s = s;
				newSuperelevation.a = superelevation.a + superelevation.b * sOffset + superelevation.c * Math.pow(sOffset, 2) + superelevation.d * Math.pow(sOffset, 3);
				newSuperelevation.b = superelevation.b + 2 * superelevation.c * sOffset + 3 * superelevation.d * Math.pow(sOffset, 2);
				newSuperelevation.c = superelevation.c + 3 * superelevation.d * sOffset;
				newSuperelevation.d = superelevation.d;
				superelevations.push(newSuperelevation);
			}
			found = true;
		}
	}

	return superelevations;
}

function getElevation(road, s, es) {

	if (s >= es + 1E-4) {
		throw Error('getElevation error: start-s >= endS + 1E-4');
	}

	var elevations = [];
	var found = false;
	
	if (!road.elevation) {
		return elevations;
	}

	for (var i = 0; i < road.elevation.length; i++) {
		var elevation = road.elevation[i];
		var nextElevationS = road.elevation[i + 1] ? road.elevation[i + 1].s :  road.geometry[road.geometry.length - 1].s + road.geometry[road.geometry.length - 1].length
		
		// if already found the start of the returning elevation, copy the rest of the elevations as the succeeding ones until es
		if (found) {
			if (elevation.s < es) {
				elevations.push(elevation);
			} else {
				break;
			}
		}

		if (!found) {
			if (elevation.s == s) {
				elevations.push(elevation);
			} else if (elevation.s < s && nextElevationS > s) {
				var sOffset = s - elevation.s;
				var newElevation = {};
				newElevation.s = s;
				newElevation.a = elevation.a + elevation.b * sOffset + elevation.c * Math.pow(sOffset, 2) + elevation.d * Math.pow(sOffset, 3);
				newElevation.b = elevation.b + 2 * elevation.c * sOffset + 3 * elevation.d * Math.pow(sOffset, 2);
				newElevation.c = elevation.c + 3 * elevation.d * sOffset;
				newElevation.d = elevation.d;
				elevations.push(newElevation);
			}
			found = true;
		}
	}

	return elevations;
}

function getGeometry(road, s, es) {

	if (s >= es + 1E-4) {
		throw Error('getGeometry error: start-s >= endS + 1E-4');
	}

	var geometries  = [];
	var found = false;
	//if (maxLength) es = Math.min(es, s + maxLength);

	for (var i = 0; i < road.geometry.length; i++) {
		var geometry = road.geometry[i];
		
		// if already found the start of the returning geometry, copy the rest of the geometries as the suceeding ones until the next lane section starts
		if (found) {
			if (geometry.s + geometry.length <= es) {
				//console.log(found, 'push the whole geometry')				
				geometries.push(road.geometry[i]);
			}
			// Assume delta < 1mm is at the same position
			else if (geometry.s < es && Math.abs(geometry.s - es) > 1E-4) {
				//console.log(found, 'push part of the geometry')
				var newGeometry = {};
				newGeometry.s = geometry.s;
				newGeometry.x = geometry.x;
				newGeometry.y = geometry.y;
				newGeometry.hdg = geometry.hdg;
				newGeometry.type = geometry.type;
				newGeometry.length = es - geometry.s;

				newGeometry.centralX = newGeometry.x;
				newGeometry.centralY = newGeometry.y;
				newGeometry.centralLength = newGeometry.length;

				if (geometry.offset) {
					console.log(geometry.offset)
					newGeometry.offset = geometry.offset;
				}

				// get ex, ey
				switch(geometry.type) {
					case 'line':
						newGeometry.ex = newGeometry.x + newGeometry.length * Math.cos(newGeometry.hdg);
						newGeometry.ey = newGeometry.y + newGeometry.length * Math.sin(newGeometry.hdg);

						break;
					case 'spiral':
						console.error('getGeometry error: not surpport extract part of the geometry of type spiral yet')
						var points = generateSpiralPoints(geometry.length, geometry.x, geometry.y, geometry.hdg, geometry.spiral.curvStart, geoemtry.spiral, geometry.ex, geometry.ey, null, s - geometry.s, newGeometry.length).points;
						console.log(points);
						newGeometry.ex = points[points.length - 1].x;
						newGeometry.ey = points[points.length - 1].y;
						break;
					case 'arc':
						newGeometry.arc = {curvature: geometry.arc.curvature};
						var curvature = newGeometry.arc.curvature;
						var radius = 1 / Math.abs(curvature);
						var rotation = newGeometry.hdg - Math.sign(curvature) * Math.PI / 2;
						var theta = newGeometry.length * curvature;
						newGeometry.ex = newGeometry.x - radius*Math.cos(rotation) + radius * Math.cos(rotation + theta);
						newGeometry.ey = newGeometry.y - radius*Math.sin(rotation) + radius * Math.sin(rotation + theta);
				}

				geometries.push(newGeometry);
			} else {
				break;
			}
		}

		// found the geometry segment which contains the starting position
		if (!found) {
			if (geometry.s == s) {
				// s is the start of a geometry segment of the road, push the whole geometry seg if nextS is not covered by the same geometry
				if (geometry.s + geometry.length <= es) {
					//console.log(found, 'geometry.s == sectionS, push the whole geometry')
					geometries.push(geometry);
				} else {
					//console.log(found, 'geometry.s == sectionS, push part of the geometry')

					var newGeometry = {};
					newGeometry.s = s;
					newGeometry.x = geometry.x;
					newGeometry.y = geometry.y;
					newGeometry.hdg = geometry.hdg;
					newGeometry.type = geometry.type;
					newGeometry.length = es - geometry.s;

					// customely added attributes to geometry specified in .xdor file
					newGeometry.centralX = geometry.centralX;
					newGeometry.centralY = geometry.centralY;
					newGeometry.centralLength = newGeometry.length;
					if (geometry.offset) {
						console.log(geometry.offset)
						newGeometry.offset = geometry.offset;
					}

					// get ex, ey
					switch(geometry.type) {
						case 'line':
							newGeometry.ex = newGeometry.x + newGeometry.length * Math.cos(newGeometry.hdg);
							newGeometry.ey = newGeometry.y + newGeometry.length * Math.sin(newGeometry.hdg);
							break;
						case 'spiral':
							console.error('getGeometry error: not surpport extract part of the geometry of type spiral yet')
							var points = generateSpiralPoints(geometry.length, geometry.x, geometry.y, geometry.hdg, geometry.spiral.curvStart, geoemtry.spiral, geometry.ex, geometry.ey, null, s - geometry.s, newGeometry.length).points
							console.log(points)
							newGeometry.ex = points[points.length - 1].x;
							newGeometry.ey = points[points.length - 1].y;
							break;
						case 'arc':
							newGeometry.arc = {curvature: geometry.arc.curvature};
							var curvature = newGeometry.arc.curvature;
							var radius = 1 / Math.abs(curvature);
							var rotation = newGeometry.hdg - Math.sign(curvature) * Math.PI / 2;
							var theta = newGeometry.length * curvature;
							newGeometry.ex = newGeometry.x - radius*Math.cos(rotation) + radius * Math.cos(rotation + theta);
							newGeometry.ey = newGeometry.y - radius*Math.sin(rotation) + radius * Math.sin(rotation + theta);
					}

					geometries.push(newGeometry);
				}
				found = true;
			} else if (geometry.s < s && geometry.s + geometry.length > s) {
				//console.log(found, 'section is in the middle of the geometry')				
				
				// calcuate the first geometry element for the returning geometries
				var ds = s - geometry.s;
				var partialGeometry = {};
				partialGeometry.s = s;
				partialGeometry.type = geometry.type;
				partialGeometry.length = Math.min(es, geometry.s + geometry.length) - s;

				partialGeometry.centralLength = partialGeometry.length;
				if (geometry.offset) {
					console.log('section is in the middle of the geometry with offset <- offset should start along laneSection! error!')
				}

				switch(geometry.type) {
					case 'line':
						partialGeometry.x = geometry.x + ds * Math.cos(geometry.hdg);
						partialGeometry.y = geometry.y + ds * Math.sin(geometry.hdg);
						partialGeometry.hdg = geometry.hdg;

						partialGeometry.centralX = partialGeometry.x;
						partialGeometry.centralY = partialGeometry.y;
						partialGeometry.ex = geometry.x + (ds + partialGeometry.length) * Math.cos(geometry.hdg);
						partialGeometry.ey = geometry.y + (ds + partialGeometry.length) * Math.sin(geometry.hdg);
						
						geometries.push(partialGeometry);
						break;
					case 'spiral':
						// need the equation presentation for clothoid
						console.error('getGeometry error: not surpport extract part of the geometry of type spiral yet')
						var sample = generateSpiralPoints(geometry.length, geometry.x, geometry.y, geometry.hdg, geometry.spiral.curvStart, geoemtry.spiral, geometry.ex, geometry.ey, null, ds, partialGeometry.length);
						var points = sample.points;
						var heading = sample.heading;
						partialGeometry.x = points[0].x;
						partialGeometry.y = points[0].y;

						// USE Continous or Discreate HDG ? - discreate!(continous needs smaller curv as start)
						partialGeometry.hdg = heading[0];

						partialGeometry.centralX = partialGeometry.x;
						partialGeometry.centralY = partialGeometry.y;
						partialGeometry.ex = points[points.length - 1].x;
						partialGeometry.ey = points[points.length - 1].y;
						geometries.push(partialGeometry);
						break;
					case 'arc':
						var curvature = geometry.arc.curvature;
						var radius = 1 / Math.abs(curvature);
						var theta = ds * curvature;
						var rotation = geometry.hdg - Math.sign(curvature) * Math.PI / 2;
						partialGeometry.x = geometry.x - radius * Math.cos(rotation) + radius * Math.cos(rotation + theta);
						partialGeometry.y = geometry.y - radius * Math.sin(rotation) + radius * Math.sin(rotation + theta);
						partialGeometry.hdg = geometry.hdg + theta;
						partialGeometry.arc = {curvature: geometry.arc.curvature};

						partialGeometry.centralX = partialGeometry.x;
						partialGeometry.centralY = partialGeometry.y;
						theta += partialGeometry.length * curvature;
						/* NOTE: road#5 laneSection#3 geometry#0 ends as the geometry, caculated ex,ey is not the same as geometry's ex,ey*/
						partialGeometry.ex = geometry.x - radius * Math.cos(rotation) + radius * Math.cos(rotation + theta);
						partialGeometry.ey = geometry.y - radius * Math.sin(rotation) + radius * Math.sin(rotation + theta);

						geometries.push(partialGeometry);
						break;
				}
				found = true;
			}
		}
	}

	return geometries;
}

function generateLaneMesh(laneSectionStart, geometry, elevationLateralProfile, lane, mesh) {

	if (!geometry || !lane) {
		console.info('pave: invalid lane. skipped')
		return;
	}

	if (lane.id == 0) {
		// width and border is not allowed for center lane. center lane only needs to draw the mark
		drawRoadMark(laneSectionStart, geometry, lane.roadMark, mesh);
		return;
	}

	// lane color based on lane type
	var color = {};
	color.default = 0xCFCFCF;
	color.restricted = 0xB3834C;
	color.shoulder = 0x32CD32;
	color.parking = 0x9999FF;

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

	var v1, v2, v3, v4;
	var shape;

	for (var i = 0; i < currentWidth.length; i++) {

		var oGeometry = {};
		oGeometry.hdg = hdg;
		oGeometry.type = type;
		
		// offset distance along central geometry (line) from start of the geometry to start of the current width seg
		var width = currentWidth[i];
		var gOffset = Math.max(width.sOffset + laneSectionStart - geometry.s, 0);
		var nextWidthSOffset = currentWidth[i + 1] ? currentWidth[i + 1].sOffset : geometry.s + geometry.centralLength - laneSectionStart;
		
		length = Math.min(nextWidthSOffset + laneSectionStart, geometry.s + geometry.centralLength) - Math.max(width.sOffset + laneSectionStart, geometry.s);
		
		// generate data for oGeometry
		oGeometry.s = Math.max(width.sOffset + laneSectionStart, geometry.s);
		oGeometry.length = length;
		oGeometry.centralLength = length;

		// width offset distance along central geometry (line) from start of the width entry to start of the current geometry.s
		var wOffset = Math.max(geometry.s - width.sOffset - laneSectionStart, 0);

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
		oGeometry.offset.a = innerA + Math.sign(lane.id) * widthA;
		oGeometry.offset.b = innerB + Math.sign(lane.id) * widthB;
		oGeometry.offset.c = innerC + Math.sign(lane.id) * widthC;
		oGeometry.offset.d = innerD + Math.sign(lane.id) * widthD;

		switch(type) {
			
			case 'line':
				var sx = centralX + gOffset * Math.cos(hdg);
				var sy = centralY + gOffset * Math.sin(hdg);

				// tOffset of centralLane at start of the current width seg
				var ds = gOffset;
				var tOffset = geometry.offset.a + geometry.offset.b * ds + geometry.offset.c * Math.pow(ds, 2) + geometry.offset.d * Math.pow(ds, 3);
				//drawCustomLine([new THREE.Vector2(sx + Math.abs(tOffset) * Math.cos(hdg + Math.PI / 2 * Math.sign(tOffset)), sy + Math.abs(tOffset) * Math.sin(hdg + Math.PI / 2 * Math.sign(tOffset))), new THREE.Vector2(sx + Math.abs(tOffset) * Math.cos(hdg + Math.PI / 2 * Math.sign(tOffset)) + 10, sy + Math.abs(tOffset) * Math.sin(hdg + Math.PI / 2 * Math.sign(tOffset)))], 0x000001);

				// tOffset of centralLane at the end of the current width seg
				var ds = gOffset + length;
				var tOffset = geometry.offset.a + geometry.offset.b * ds + geometry.offset.c * Math.pow(ds, 2) + geometry.offset.d * Math.pow(ds, 3);

				ex = sx + length * Math.cos(hdg) + Math.abs(tOffset) * Math.cos(hdg + Math.PI / 2 * Math.sign(tOffset));
				ey = sy + length * Math.sin(hdg) + Math.abs(tOffset) * Math.sin(hdg + Math.PI / 2 * Math.sign(tOffset));
				//drawCustomLine([new THREE.Vector2(ex, ey), new THREE.Vector2(ex + 10, ey)], 0x000001);		
				
				oGeometry.x = sx + Math.abs(oGeometry.offset.a) * Math.cos(hdg + Math.PI / 2 * Math.sign(oGeometry.offset.a));
				oGeometry.y = sy + Math.abs(oGeometry.offset.a) * Math.sin(hdg + Math.PI / 2 * Math.sign(oGeometry.offset.a));
				
				tOffset = oGeometry.offset.a + oGeometry.offset.b * length  + oGeometry.offset.c * Math.pow(length, 2) + oGeometry.offset.d * Math.pow(length, 3);
				oGeometry.ex = ex + Math.abs(tOffset) * Math.cos(hdg + Math.PI / 2 * Math.sign(tOffset));
				oGeometry.ey = ey + Math.abs(tOffset) * Math.sin(hdg + Math.PI / 2 * Math.sign(tOffset));

				oGeometry.centralX = sx;
				oGeometry.centralY = sy;

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
					
					if (iBorderPoints[0].distanceTo(iBorderPoints[iBorderPoints.length - 1]) > 1E-10) {
						shape = createCustomShape(iBorderPoints, oBorderPoints);
					}
				}

				break;
			case 'spiral':

				//* ALWAYS use the central clothoid and shift by tOffset to find the border when paving along spiral line

				var centralSample = generateSpiralPoints(geometry.centralLength, geometry.centralX, geometry.centralY, geometry.hdg, geometry.spiral.curvStart, geometry.spiral.curvEnd, geometry.ex, geometry.ey, null, gOffset, length);
				var sx = centralSample.points[0].x;
				var sy = centralSample.points[0].y;
				hdg = centralSample.heading[0];
				ex = centralSample.points[centralSample.points.length - 1].x;
				ey = centralSample.points[centralSample.points.length - 1].y;

				//* NOTE: for spiral only, all its x,y, ex,ey, curvStart, curvEnd are the same as central reference line, i.e. keeps the same as original geometry when paving across lanes
				oGeometry.x = sx;
				oGeometry.y = sy;
				oGeometry.centralX = sx;
				oGeometry.centralY = sy;
				oGeometry.ex = ex;
				oGeometry.ey = ey;
				oGeometry.hdg = hdg;

				var curvStart = geometry.spiral.curvStart + gOffset * (geometry.spiral.curvEnd - geometry.spiral.curvStart) / geometry.centralLength;
				var curvEnd = geometry.spiral.curvStart + (gOffset + length) * (geometry.spiral.curvEnd - geometry.spiral.curvStart) / geometry.centralLength;

				oGeometry.spiral = {curvStart: curvStart, curvEnd: curvEnd};

				// generate spline points
				if (!(width.a == 0 && width.b == 0 && width.c == 0 && width.d == 0)) {

					// get inner border spline points
					//generateSpiralPoints(length, sx, sy, hdg, curvStart, curvEnd, ex, ey, tOffset, subOffset, subLength)
					var iBorderPoints = generateSpiralPoints(geometry.length, geometry.x, geometry.y, geometry.hdg, geometry.spiral.curvStart, geometry.spiral.curvEnd, geometry.ex, geometry.ey, geometry.offset, gOffset, length).points;
					//drawCustomLine(iBorderPoints, 0xFF6666);

					// get outer border spline points
					var oBorderPoints = generateSpiralPoints(oGeometry.length, oGeometry.x, oGeometry.y, oGeometry.hdg, oGeometry.spiral.curvStart, oGeometry.spiral.curvEnd, oGeometry.ex, oGeometry.ey, oGeometry.offset).points;
					//drawCustomLine(oBorderPoints, 0x6666FF);
					// reverse oBorder points
					reversePoints(oBorderPoints);
					
					if (iBorderPoints[0].distanceTo(iBorderPoints[iBorderPoints.length - 1]) > 1E-10) {
						shape = createCustomShape(iBorderPoints, oBorderPoints);
					}
				}

				break;
			case 'arc':

				//* ALWAYS use the central arc and shift by tOffset to find the border when paving along arc line
				
				var curvature = geometry.arc.curvature;
				var radius = 1 / Math.abs(curvature);
				var rotation = geometry.hdg - Math.sign(curvature) * Math.PI / 2;
				var theta = gOffset * curvature;

				//* NOTE: for arc only, all its x,y, ex,ey, curvStart, curvEnd are the same as central reference line, i.e. keeps the same as original geometry when paving across lanes
				var sx = geometry.x - radius * Math.cos(rotation) + radius * Math.cos(rotation + theta);
				var sy = geometry.y - radius * Math.sin(rotation) + radius * Math.sin(rotation + theta);
				hdg = geometry.hdg + theta;
				theta = (gOffset + length) * curvature;
				ex = geometry.x - radius * Math.cos(rotation) + radius * Math.cos(rotation + theta);
				ey = geometry.y - radius * Math.sin(rotation) + radius * Math.sin(rotation + theta);

				oGeometry.x = sx;
				oGeometry.y = sy;
				oGeometry.centralX = sx;
				oGeometry.centralY = sy;
				oGeometry.hdg = hdg;
				oGeometry.arc = {curvature: curvature};

				// generate spline points
				if (!(width.a == 0 && width.b == 0 && width.c == 0 && width.d == 0)) {

					// get inner border spline points
					var iBorderPoints = generateArcPoints(length, sx, sy, hdg, curvature, ex, ey, {a: innerA, b: innerB, c: innerC, d: innerD});
					//drawCustomLine(iBorderPoints, 0xFF6666);

					// get outer border spline points
					var oBorderPoints = generateArcPoints(length, sx, sy, hdg, curvature, ex, ey, oGeometry.offset);
					//drawCustomLine(oBorderPoints, 0x6666FF);
					// reverse oBorder points
					reversePoints(oBorderPoints);

					if (iBorderPoints[0].distanceTo(iBorderPoints[iBorderPoints.length - 1]) > 1E-10) {
						shape = createCustomShape(iBorderPoints, oBorderPoints);
					}
				}

				break;
		}

		oGeometries.push(oGeometry);

		try {
			if (shape && lane.type != 'border' && lane.type != 'none') {
				mesh.push(new THREE.Mesh(new THREE.ShapeBufferGeometry(shape), new THREE.MeshBasicMaterial({color: color[lane.type]? color[lane.type] : color.default})));
			}
		} catch(e) {
			console.error(type, e.stack)
		}
	}

	// draw road marks
	for (var i = 0; i < oGeometries.length; i++) {
		var oGeometry = oGeometries[i];
		try {
			if (oGeometry.length > 1E-10)
				drawRoadMark(laneSectionStart, oGeometries[i], lane.roadMark, mesh);	
		} catch(e) {
			console.error(e);
		}
	}

	return oGeometries;
}

function createRectShape(v1, v2, v3, v4) {

	var shape = new THREE.Shape();
	shape.moveTo(v1.x, v1.y);
	shape.lineTo(v2.x, v2.y);
	shape.lineTo(v3.x, v3.y);
	shape.lineTo(v4.x, v4.y);

	return shape;
}

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

function createArcShape(center, v1, v3, iRadius, oRadius, rotation, theta, isClockwise) {

	var shape = new THREE.Shape();
	shape.moveTo(v1.x, v1.y);
	shape.absarc(center.x, center.y, iRadius, rotation, rotation + theta, isClockwise);
	shape.lineTo(v3.x, v3.y);
	shape.absarc(center.x, center.y, oRadius, rotation + theta, rotation, !isClockwise);
	//shape.lineTo(v1.x, v1.y);		// if add this line, road#515 geometry#2 lane#-2 won't draw, same error happens to road#517 do not know why
	
	return shape;
}

function drawCustomLine(points, color, zOffset) {

	var path = new THREE.Path(points);
	var geometry = path.createPointsGeometry(points.length);
	var material = new THREE.MeshBasicMaterial({color: color != undefined ? color : 0x00FF00});
	var mesh = new THREE.Line(geometry, material);
	mesh.position.set(0, 0, zOffset || 0)
	scene.add(mesh);
}

function drawLineAtPoint(x, y, hdg, color, zOffset) {

	var points = [new THREE.Vector2(x, y), new THREE.Vector2(x + 10 * Math.cos(hdg), y + 10 * Math.sin(hdg))];
	drawCustomLine(points, color, zOffset);
}

function reversePoints(points) {

	for (var i = 0; i < points.length / 2; i++) {
		var tmp = points[i];
		points[i] = points[points.length - 1 - i];
		points[points.length - i - 1] = tmp;
	}
}

function drawRoadMark(laneSectionStart, oBorder, roadMarks, mesh) {

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

		var sOffset = Math.max(roadMark.sOffset + laneSectionStart - oBorder.s, 0);
		var width = roadMark.width;
		var length = Math.min(nextRoadMarkSOffset + laneSectionStart, oBorder.s + oBorder.centralLength) - Math.max(roadMark.sOffset + laneSectionStart, oBorder.s);

		var offsetA = oBorder.offset.a + oBorder.offset.b * sOffset + oBorder.offset.c * Math.pow(sOffset, 2) + oBorder.offset.d * Math.pow(sOffset, 3);
		var offsetB = oBorder.offset.b + 2 * oBorder.offset.c * sOffset + 3 * oBorder.offset.d * Math.pow(sOffset, 2);
		var offsetC = oBorder.offset.c + 3 * oBorder.offset.d * sOffset;
		var offsetD = oBorder.offset.d;

		var shape, roadMarkMesh;

		switch(oBorder.type) {

			case 'line':

				if (oBorder.offset.b == 0 && oBorder.offset.c == 0 && oBorder.offset.d == 0) {
					var sx = oBorder.x + sOffset * Math.cos(oBorder.hdg);
					var sy = oBorder.y + sOffset * Math.sin(oBorder.hdg);

					var v1 = new THREE.Vector2(sx + width / 2 * Math.cos(oBorder.hdg + Math.PI / 2), sy + width / 2 * Math.sin(oBorder.hdg + Math.PI / 2));
					var v2 = new THREE.Vector2(sx + length * Math.cos(oBorder.hdg) + width / 2 * Math.cos(oBorder.hdg + Math.PI / 2), sy + length * Math.sin(oBorder.hdg) + width / 2 * Math.sin(oBorder.hdg + Math.PI / 2));
					var v3 = new THREE.Vector2(sx + length * Math.cos(oBorder.hdg) + width / 2 * Math.cos(oBorder.hdg - Math.PI / 2), sy + length * Math.sin(oBorder.hdg) + width / 2 * Math.sin(oBorder.hdg - Math.PI / 2));
					var v4 = new THREE.Vector2(sx + width / 2 * Math.cos(oBorder.hdg - Math.PI / 2), sy + width / 2 * Math.sin(oBorder.hdg - Math.PI / 2));

					shape = createRectShape(v1, v2, v3, v4);

				} else {
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
					// for road#509 geometry#4/5, after altering last 2 very adjacent points of outerBorder, the folloowing still causes triangulate error. DO NOT KNOW WHY?
					shape = createCustomShape(rBorderPoints, lBorderPoints);	
				}
				
				break;
			case 'spiral':

				/* NOTE: multiple roadMarks may happen on geometries besides 'line', e.g. road#91 geometry#1*/
				/* NOTE: multiple roadMarks may happen on geometries besides 'line', e.g. road#91 geometry#1*/
				var lateralOffset;

				lateralOffset = {a: offsetA - width / 2, b: offsetB, c: offsetC, d: offsetD};
				var rBorderPoints = generateSpiralPoints(oBorder.length, oBorder.centralX, oBorder.centralY, oBorder.hdg, oBorder.spiral.curvStart, oBorder.spiral.curvEnd, oBorder.ex, oBorder.ey, lateralOffset, sOffset, length).points;

				lateralOffset = {a: offsetA + width / 2, b: offsetB, c: offsetC, d: offsetD};
				var lBorderPoints = generateSpiralPoints(oBorder.length, oBorder.centralX, oBorder.centralY, oBorder.hdg, oBorder.spiral.curvStart, oBorder.spiral.curvEnd, oBorder.ex, oBorder.ey, lateralOffset, sOffset, length).points;
				reversePoints(lBorderPoints);

				shape = createCustomShape(rBorderPoints, lBorderPoints);

				break;
			case 'arc':

				var curvature = oBorder.arc.curvature;
				var radius = 1 / Math.abs(curvature);
				var theta = sOffset * curvature;
				var rotation = oBorder.hdg - Math.sign(curvature) * Math.PI / 2;
				hdg = oBorder.hdg + theta;

				// get the central reference line start point first
				var sx = oBorder.x - radius * Math.cos(rotation) + radius * Math.cos(rotation + theta);
				var sy = oBorder.y - radius * Math.sin(rotation) + radius * Math.sin(rotation + theta);
				theta = (sOffset + length) * curvature;
				var ex = oBorder.x - radius * Math.cos(rotation) + radius * Math.cos(rotation + theta);
				var ey = oBorder.y - radius * Math.sin(rotation) + radius * Math.sin(rotation + theta);

				var lateralOffset;

				lateralOffset = {a: offsetA - width / 2, b: offsetB, c: offsetC, d: offsetD};
				var rBorderPoints = generateArcPoints(length, sx, sy, hdg, curvature, ex, ey, lateralOffset);
				lateralOffset = {a: offsetA + width / 2, b: offsetB, c: offsetC, d: offsetD};
				var lBorderPoints = generateArcPoints(length, sx, sy, hdg, curvature, ex, ey, lateralOffset);
				reversePoints(lBorderPoints);

				shape = createCustomShape(rBorderPoints, lBorderPoints);

				break;
		}

		try {
			if (shape) {
				roadMarkMesh = new THREE.Mesh(new THREE.ShapeBufferGeometry(shape), colorMaterial[roadMark.color]);
				roadMarkMesh.position.set(0,0,0.001);
				mesh.push(roadMarkMesh);
			}
		} catch(e) {
			console.info(oBorder.type)
			console.error(e.stack)
		}
	}
}

function generateLaneSectionReferenceLineMesh(road, laneSectionId) {

	// sub divide road's geometry if necessary, i.e when laneOffset record exists
	var start = road.laneSection[laneSectionId].s;
	var end = road.laneSection[laneSectionId + 1] ? road.laneSection[laneSectionId + 1].s : road.geometry[road.geometry.length - 1].s + road.geometry[road.geometry.length - 1].length; 
	var geometries = getGeometry(road, start, end);

	var mesh = [];
	for (var i = 0; i < geometries.length; i++) {

		var geometry = geometries[i];
		if (!geometry.offset) geometry.offset = {sOffset: 0, a: 0, b: 0, c: 0, d: 0};
	
		var referenceLineMesh = generateReferenceLineMesh(geometry);
		mesh.push(referenceLineMesh);
	}
	return mesh;
}

function generateReferenceLineMesh(geometry) {

	var mesh;
	switch(geometry.type) {
		case 'line':
			if (!geometry.offset) scene.add(createLine(geometry.length, geometry.x, geometry.y, geometry.hdg));
			
			// if lane has offset, geometry also has an entry of offset after parsed from subDivideRoadGeometry, now assume laneOffset only exists on line geometry
			if (geometry.offset) {
		
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
			}
			try {
				mesh = createSpiral(geometry.length, geometry.x, geometry.y, geometry.hdg, geometry.spiral.curvStart, geometry.spiral.curvEnd, geometry.ex, geometry.ey, geometry.offset);
			} catch(e) {
				console.error(e.stack)
			}
			break;
		case 'arc':
			if (geometry.offset.a || geometry.offset.b || geometry.offset.c || geometry.offset.d) {
				console.warn('reference line error (arc): not surpport laneOffset on spiral or arc yet');
			}
			mesh = createArc(geometry.length, geometry.x, geometry.y, geometry.hdg, geometry.arc.curvature, geometry.ex, geometry.ey, geometry.offset);
			break;
	}

	// referec line's horizontal positon sets to 0.001 (higher than lanes and same as roadMarks' 0.001 to be on top to avoid covering)
	mesh.position.set(0, 0, 0.001)
	return mesh;
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

function generateSpiralPoints(length, sx, sy, hdg, curvStart, curvEnd, ex, ey, lateralOffset, subOffset, subLength) {

	var points = [];
	var heading = [];
	var tOffset = [];
	var k = (curvEnd - curvStart) / length;
	
	var theta = hdg; 	// current heading direction
	var preS = 0;
	var s = 0;

	var reverse = false;

	var point, x, y;

	do {

		if (s == 0) {	
			points.push(new THREE.Vector3(sx, sy, 0));
			heading.push(theta);
			if (lateralOffset) tOffset.push(lateralOffset.a);
			s += step;
			continue;
		}

		if (s > length || Math.abs(s - length) < 1E-4) s = length;

		var curvature = (s + preS) * 0.5 * k + curvStart;
		var prePoint = points[points.length - 1];
		
		x = prePoint.x + (s - preS) * Math.cos(theta + curvature * (s - preS) / 2);
		y = prePoint.y + (s - preS) * Math.sin(theta + curvature * (s - preS) / 2);

		theta += curvature * (s - preS);
		preS = s;
		s += step;
		
		points.push(new THREE.Vector3(x, y, 0));
		heading.push(theta);
		if (lateralOffset) tOffset.push(cubicPolynomial(preS, lateralOffset.a, lateralOffset.b, lateralOffset.c, lateralOffset.d));
		
	} while (s < length + step);

	// fix the error by altering the end point to he connecting road's start
	if (typeof ex == 'number' && typeof ey == 'number') {

		var delta = new THREE.Vector3(ex - points[points.length - 1].x, ey - points[points.length - 1], 0);
		points[points.length - 1].x = ex;
		points[points.length - 1].y = ey;

		// distrubte error across sample points for central clothoid 		
		for (var i = points.length - 2; i > 0; i--) {
			points[i].x += delta.x * i / points.length;
			points[i].y += delta.y * i / points.length;
		}
	}

	// apply lateralOffset if any
	if (lateralOffset) {

		// shift points at central clothoid by tOffset to get the parallel curve points
		for (var i = 0; i < points.length; i++) {

			var point = points[i];
			var currentHeading = heading[i];
			var t = tOffset[i];

			// vector in s-t, then rotate to x-y by -currentHeading, then traslate to point.x, point.y
			point.x += Math.abs(t) * Math.cos(currentHeading + Math.PI / 2 * Math.sign(t));
			point.y += Math.abs(t) * Math.sin(currentHeading + Math.PI / 2 * Math.sign(t));
		}
	}

	// if  needs take only part of the segment
	if (typeof subOffset == 'number' && typeof subLength == 'number') {
		
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
		heading[startIndex] = heading[startIndex] + (heading[startIndex + 1] - heading[startIndex]) * startIndexDiff / step;

		if (endIndexDiff > 0) {
			p1 = points[endIndex];
			p2 = points[endIndex + 1] || new THREE.Vector2();
			endPoint = new THREE.Vector2(p1.x + endIndexDiff / step * (p2.x - p1.x), p1.y + endIndexDiff / step * (p2.y - p1.y));
			endIndex = endIndex + 1;
			points[endIndex] = endPoint;
			heading[endIndex] = heading[endIndex + 1] ? heading[endIndex] + (heading[endIndex + 1] - heading[endIndex]) * endIndexDiff / step : heading[endIndex];
		}

		points.splice(endIndex + 1);
		points.splice(0, startIndex);
		heading.splice(endIndex + 1);
		heading.splice(0, startIndex);
	}

	return {points: points, heading: heading};
}

function createSpiral(length, sx, sy, hdg, curvStart, curvEnd, ex, ey, tOffset, subOffset, subLength) {

	var material = new THREE.MeshBasicMaterial({color: 0xFFC125});
	var points = generateSpiralPoints(length, sx, sy, hdg, curvStart, curvEnd, ex, ey, tOffset, subOffset, subLength).points;
	var path = new THREE.Path(points);
	var geometry = path.createPointsGeometry(points.length);
	var spiral = new THREE.Line(geometry, material);

	return spiral;
}

function generateArcPoints(length, sx, sy, hdg, curvature, ex, ey, lateralOffset) {

	var points = [];
	var heading = [];
	var tOffset = [];
	var currentHeading = hdg;
	var preS = 0;
	var s = 0;
	var prePoint, x, y;

	do {

		if (s == 0) {
			points.push(new THREE.Vector2(sx, sy));
			heading.push(currentHeading);
			if (lateralOffset) tOffset.push(lateralOffset.a);
			s += step;
			continue;
		}
		
		if (s > length || Math.abs(s - length) < 1E-4) s = length;

		prePoint = points[points.length - 1];
		
		x = prePoint.x + (s - preS) * Math.cos(currentHeading + curvature * (s - preS) / 2);
		y = prePoint.y + (s - preS) * Math.sin(currentHeading + curvature * (s - preS) / 2);

		currentHeading += curvature * (s - preS);
		preS = s;
		s += step;

		points.push(new THREE.Vector2(x, y));
		heading.push(currentHeading);
		if (lateralOffset) tOffset.push(cubicPolynomial(preS, lateralOffset.a, lateralOffset.b, lateralOffset.c, lateralOffset.d));

	} while (s < length + step);

	// fix the error by altering the end point to he connecting road's start
	if (typeof ex == 'number' && typeof ey == 'number') {

		var delta = new THREE.Vector2(ex - points[points.length - 1].x, ey - points[points.length - 1].y);
		points[points.length - 1].x = ex;
		points[points.length - 1].y = ey;

		// distrubte error across sample points for central clothoid
		for (var i = points.length - 2; i  > -1; i--) {
			points[i].x += delta.x * i / points.length;
			points[i].y += delta.y * i / points.length;

		}
	}

	// apply lateral offset along t
	if (lateralOffset) {

		// shift points at central clothoid by tOffset to get the parallel curve points
		for (var i = 0; i < points.length; i++) {

			var point = points[i];
			currentHeading = heading[i];
			var t = tOffset[i];

			// vector in s-t, then rotate to x-y by -currentHeading, then traslate to point.x, point.y
			point.x += Math.abs(t) * Math.cos(currentHeading + Math.PI / 2 * Math.sign(t));
			point.y += Math.abs(t) * Math.sin(currentHeading + Math.PI / 2 * Math.sign(t));
		}
	}

	return points;
}

function createArc(length, sx, sy, hdg, curvature, ex, ey, lateralOffset) {
	
	var material = new THREE.MeshBasicMaterial({color: 0x3A5FCD});
	/*
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
	*/
	var points = generateArcPoints(length, sx, sy, hdg, curvature, ex, ey, lateralOffset);
	var path = new THREE.Path(points);
	var geometry = path.createPointsGeometry(points.length);
	var arc = new THREE.Line(geometry, material);
	
	return arc;
}

function generateCubicPoints(offset, length, sx, sy, hdg, a, b, c, d) {

	var points = [];

	var ds = offset;
	do {

		if (ds > offset + length || Math.abs(ds - offset - length) < 1E-4) ds = offset + length;

		var tmpx = ds - offset;
		var tmpy = cubicPolynomial(ds, a, b, c, d);

		// rotate about (0,0) by hdg, then translate by (sx, sy)
		var x = tmpx * Math.cos(hdg) - tmpy * Math.sin(hdg) + sx;
		var y = tmpx * Math.sin(hdg) + tmpy * Math.cos(hdg) + sy;
		points.push(new THREE.Vector2(x, y));

		ds += step;
	} while(ds < offset + length + step);

	return points;
}

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

function cubicPolynomial(ds, a, b, c, d) {

	return a + b * ds + c * Math.pow(ds, 2) + d * Math.pow(ds, 3);	
}

/*
* Helper for getConnectingRoadIds
*/
function getRoadIdsInJunction(junctionId) {

	if (junctionId == '-1') {
		throw Error('invalid junctionId', jucntionId);
	}

	var roadIds = [];
	var foundIds = {};
	var junction = map.junctions[junctionId];
	
	for (var connectionId in junction.connection) {
		var connection = junction.connection[connectionId];
		
		if (!(connection.incomingRoad in foundIds)) {
			roadIds.push(connection.incomingRoad);
			foundIds[connection.incomingRoad] = true;
		}
		if (!(connection.connectingRoad in foundIds)) {
			roadIds.push(connection.connectingRoad);
			foundIds[connection.connectionRoad] = true;
		}
	}

	return roadIds;
}

function getLinkedRoadId(linkedInfo) {

	var elementType = linkedInfo.elementType;
	var elementId = linkedInfo.elementId;
	var contactPoint = linkedInfo.contactPoint;

	var roadIds = [];

	if (elementType == 'road') {
		roadIds.push(elementId);
	} else if (elementType == 'junction') {
		roadIds = getRoadIdsInJunction(elementId);
	}

	return roadIds;
}


var scene, camera, renderer;
var container;

init();
animate();

function init() {

	container = document.createElement('div');
	document.body.appendChild(container);

	scene = new THREE.Scene();

	/** Setting up camera */
	camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.05, 10000);
	camera.position.set(0, 0, 200);
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

	test();
}

function animate() {
	requestAnimationFrame(animate);
	renderer.render(scene, camera);
}

function test() {
	var map;
	map = new Map(scene, "../data/Crossing8Course.xodr");
	//map = new Map(scene, "../data/CrossingComplex8Course.xodr");
	//map = new Map(scene, "../data/Roundabout8Course.xodr");
	//map = new Map(scene, "../data/CulDeSac.xodr");
	//map = new Map(scene, "../data/Country.xodr");	// multiple width on Arc
	//map = new Map(scene, "../data/test.xodr");

	map.paveAllRoads()
	//map.showReferenceLine();
}