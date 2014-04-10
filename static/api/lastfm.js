var api = api || {};

api.lastfm = {};
api.lastfm.key = "865b1653dbe200905a5b75d9d839467a";
api.lastfm.url = "http://ws.audioscrobbler.com/2.0/";

/**
* Send an API call to last.fm
* @param {String} method    The method name (e.g. "library.getartists")
* @param {Array} options    An array of tuples (arrays with two elements)
                            with options for the request: ["key", "value"]
* @param {Function} callback    The callback function to call with the data
                                returned from the request. Takes two arguments,
                                error and data (callback(error, data))
*/
api.lastfm.send = function(method, options, callback) {
	var url = api.lastfm.url + "?" + "method=" + method + "&api_key=" +
		api.lastfm.key + "&format=json";
	var xhr, gotResponse;

	options.forEach(function(el) {
		url += "&" + el[0] + "=" +
			(el[1] + "")
			.replace("&", "%26")
			.replace("/", "%2F")
			.replace("+", "%2B")
			.replace("\\", "%5C");
	});

	xhr = d3.json(url, function(e, d) {
		gotResponse = true;
		callback(e, d);
	});


	// Abort if the request takes too long - it sometimes ballar ur and fails after a minute :(
	setTimeout(function() {
		if (!gotResponse) {
			console.log("GET " + url + " took to long, aborting");
			xhr.abort();
			callback("ERROR", {
				error: "Took to long to respond"
			});
		}
	}, 10000);

}