var LASTFM_KEY = "865b1653dbe200905a5b75d9d839467a",
	LASTFM_URL = "http://ws.audioscrobbler.com/2.0/";

var lastfm = {};

lastfm.library = {};
lastfm.library.getartists = function(user, limit, page) {

}

lastfm.send = function(method, options, callback) {

}

var method = "library.getartists";
var formatJSON = true;
var user = prompt("Input your user name, get top 20 artists")

var requestUrl = LASTFM_URL + "?" + "method=" + method + "&api_key=" +
	LASTFM_KEY +
	"&user=" + user + (formatJSON ? "&format=json" : "") + "&limit=20";

var request = new XMLHttpRequest();
request.open("GET", requestUrl);
request.onreadystatechange = function() {
	if (request.readyState === 4) { // DONE
		var responseData = JSON.parse(request.response);
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
};

request.send();