var cb = function(error, responseData) {
	console.log(responseData);
	var text = "";

	responseData.artists.artist.forEach(function(el, i) {
        api.musicbrainz.lookup("artist", el.mbid, function(err, responseData2){
            console.log("Got country for " + responseData2.name);
		    text += el.name + " (" + responseData2.area.name + ", " + el.playcount +
			    " plays), ";
		    document.body.innerHTML = text;
        });
	})
}

user = prompt("Input your user name, get top 20 artists")
api.lastfm.send("library.getartists", [["user", user], ["limit", 20]], cb);
