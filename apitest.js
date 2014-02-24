var LASTFM_KEY = "865b1653dbe200905a5b75d9d839467a",
	LASTFM_URL = "http://ws.audioscrobbler.com/2.0/";

var lastfm = {};

lastfm.library = {};
lastfm.library.getartists = function(user, limit, page, callback) {
	lastfm.send("library.getartists", [
		["user", user],
		["limit", limit || ""],
		["page", page || ""]
		], callback);
}

lastfm.send = function(method, options, callback) {
	var url = LASTFM_URL + "?" + "method=" + method + "&api_key=" +
		LASTFM_KEY + "&format=json";

	options.forEach(function(el) {
		url += "&" + el[0] + "=" + el[1];
	})

	d3.json(url, callback);
}

var user = prompt("Input your user name, get top 20 artists")

var cb = function(error, responseData) {
	console.log(responseData);
	var text = "";
	responseData.artists.artist.forEach(function(el, i) {
		var req2 = new XMLHttpRequest();
		req2.open("GET", "http://musicbrainz.org/ws/2/artist/" + el.mbid +
			"?fmt=json&inc=aliases");
		req2.onreadystatechange = function() {
			if (req2.readyState === 4) {
				console.log("Got country for " + el.name)
				var mbzdata = JSON.parse(req2.response);
				text += el.name + " (" + mbzdata.area.name + "), ";
				document.body.innerHTML = text;
			}
		}
		req2.send();

	})
}

lastfm.library.getartists(user, 20, undefined, cb);