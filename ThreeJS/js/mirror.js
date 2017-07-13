function init() {
	var roadEditor = CodeMirror(document.getElementById('road-container'), {
		mode: "application/xml",
		lineNumbers: true,
		smartIndent: true,
		indentWithTabs: true,
	});

	var parser = new DOMParser();
	roadEditor.on('change', function() {
		var text = roadEditor.getValue();
		if (text) {

			var xmlDoc = parser.parseFromString(text, "text/xml");

			if (xmlDoc.getElementsByTagName('parsererror').length != 0) 
				console.log("not xml");
			else
				console.log(xmlDoc);
		}
	});
}

document.onload = init();