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

	options.forEach(function(el) {
		url += "&" + el[0] + "=" + el[1];
	});

	d3.json(url, callback);
}