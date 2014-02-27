var geocoder = new google.maps.Geocoder();

// This is run when we've got artists from last.fm
var cb = function(error, responseData) {
    console.log(responseData);
    var text = "";

    // Get country for each artist
    responseData.artists.artist.forEach(function(el, i) {
        // Get coutry from musicbrainz
        api.musicbrainz.lookup("artist", el.mbid, function(err,
            responseData2) {
            // Return if something failed
            if (err || !responseData2.area) {
                console.error("Couldn't get country from Musicbrainz",
                    err, responseData2);
                return;
            }

            // Get coordinates from googlgle
            geocoder.geocode({
                "address": responseData2.area.name
            }, function(geoResults, status) {
                // Add all info to a string
                text += el.name + " (" + responseData2.area.name +
                    ", " + el.playcount + " plays)";

                // Return on error
                if (geoResults) {
                    text +=
                        " <a href=http://www.openstreetmap.org/#map=7/" +
                        geoResults[0].geometry.location.d + "/" +
                        geoResults[0].geometry.location.e +
                        " target='_blank'>map</a>";
                } else {
                    console.error("Couldn't get coordinates for " +
                        el.name + ", " + responseData2.area.name +
                        " / Status: " + status);
                }

                // Show on page
                text += ", ";
                document.body.innerHTML = text;
            });
        });
    })
}

// user = prompt("Input your user name, get top 20 artists")
user = SESSION.name;
api.lastfm.send("library.getartists", [["user", user], ["limit", 20]], cb);