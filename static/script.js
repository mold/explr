var geocoder = new google.maps.Geocoder();
var country;

// This is run when we've got artists from last.fm
var cb = function(error, responseData) {
	console.log(responseData);
	var text = "";

	// Get country for each artist
	responseData.artists.artist.forEach(function(el, i) {
		// Get country from lastfm
		api.getCountry(el.name, function(data) {

		});
	})
}

var

// user = prompt("Input your user name, get top 20 artists")
user = SESSION.name;
api.lastfm.send("library.getartists", [["user", user], ["limit", 20]], cb);