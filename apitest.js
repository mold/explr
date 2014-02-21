var LASTFM_KEY = "865b1653dbe200905a5b75d9d839467a",
	LASTFM_URL = "http://ws.audioscrobbler.com/2.0/";

var method = "library.getartists";
var formatJSON = true;
var user = prompt("Input your user name, get top 200 artists")

var requestUrl = LASTFM_URL + "?" + "method=" + method + "&api_key=" +
	LASTFM_KEY +
	"&user=" + user + (formatJSON ? "&format=json" : "") + "&limit=200";

var request = new XMLHttpRequest();
request.open("GET", requestUrl);
request.onreadystatechange = function() {
	if (request.readyState === 4) { // DONE
		var responseData = JSON.parse(request.response);
		console.log(responseData);
		var text = "";
		responseData.artists.artist.forEach(function(el, i) {
			text += el.name + ", ";
		})
		document.body.innerHTML = text;
	}
};

request.send();