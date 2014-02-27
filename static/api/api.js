var api = api || {};
var ls;

if (!window.localStorage.artists) {
	window.localStorage.artists = {};
}

api.getCountry = function(artist, callback) {
	var ls = window.localStorage;
	if (ls.artists[artist]) {
		return ls.artists[artist].country_code;
	} else {
		// Get artists country code here, from last.fm or whatever
	}
}

api.getTags = function(artist, callback) {
	var ls = window.localStorage;
	if (ls.artists[artist]) {
		return ls.artists[artist].tags;
	} else {
		// Get artists tags here, from last.fm or whatever
	}
}