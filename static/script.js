var geocoder = new google.maps.Geocoder();
var user;

// user = prompt("Input your user name, get top 20 artists")
user = SESSION.name;
api.lastfm.send("library.getartists", [["user", user], ["limit", 200]],
    function(
        error, responseData) {

        console.log("Artists done, getting tags")
        // Get country for each artist
        // responseData.artists.artist.forEach(function(el, i) {
        //     // Get country from lastfm
        //     api.getCountry(el.name, function(data) {
        //         console.log(data.artist, data.id, data.tag)
        //     });
        // })
        var artistNames = responseData.artists.artist.map(function(el) {
            return el.name;
        });

        // Get country for all artists
        api.getCountries(artistNames,
            function(data) {
                console.log(data);
            })
    });