var geocoder = new google.maps.Geocoder();
var user;

// user = prompt("Input your user name, get top 20 artists")
user = SESSION.name;
api.lastfm.send("library.getartists", [["user", user], ["limit", 20]], function(
    error, responseData) {

    // Get country for each artist
    responseData.artists.artist.forEach(function(el, i) {
        // Get country from lastfm
        api.getCountry(el.name, function(data) {

        });
    })
});