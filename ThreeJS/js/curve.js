function parseSampleVertices(filename) {

	// Chrome
	xmlHttp = new window.XMLHttpRequest();
	xmlHttp.open("GET", filename, false);
	xmlHttp.overrideMimeType('application/text');
	xmlHttp.send(null);
	text = xmlHttp.responseText;

	var samples = [];

	lines = text.split(/\r\n|\n/);
	lines.splice(0, 1);
	lines.splice(-1, 1);

	for (var i = 0; i < lines.length; i++) {

		line = lines[i].split(',');
		samples[i] = {
			co: new THREE.Vector3(parseFloat(line[0]), parseFloat(line[1]), parseFloat(line[2])),
			curvature: parseFloat(line[3]),
			tangent: new THREE.Vector3(parseFloat(line[4]), parseFloat(line[5]), parseFloat(line[6])),
			binormal: new THREE.Vector3(parseFloat(line[7]), parseFloat(line[8]), parseFloat(line[9])),
			normal: null,
		}

		samples[i].normal = samples[i].binormal.clone().cross(samples[i].tangent)

		drawCustomLine([samples[i].co, samples[i].co.clone().add(samples[i].tangent)], 0x0000FF)
		drawCustomLine([samples[i].co, samples[i].co.clone().add(samples[i].binormal)], 0x000000)
		drawCustomLine([samples[i].co, samples[i].co.clone().add(samples[i].normal)], 0xFF0000)
	}

	console.log(samples)
	return samples;
}

// parseSampleVertices('../data/samples.csv')
