var geocoder = new google.maps.Geocoder();
var user;

// user = prompt("Input your user name, get top 20 artists")
user = SESSION.name;
api.lastfm.send("library.getartists", [["user", user], ["limit", 200]],
    function(
        error, responseData) {

        console.log("Artists done, getting tags")
        var artistNames = responseData.artists.artist.map(function(el) {
            return el.name;
        });

        // Get country for all artists
        api.getCountries(artistNames,
            function(data) {
                // Count plays for each country?
                var countryCount = d3.nest()
                    .key(function(d) {
                        return d.name;
                    })
                    .rollup(function(leaves) {
                        return leaves.length;
                    })
                    .map(data);

                console.log("Number of artists per country ", countryCount);
            });
    });