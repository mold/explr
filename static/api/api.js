var api = api || {};

if (!window.localStorage.artists) {
	window.localStorage.artists = "{}";
}

d3.csv("../static/countries.csv", function(err, data) {
	alias = d3.nest()
		.key(function(d) {
			return d.tag.toLowerCase();
		})
		.map(data);

	cname = d3.nest()
		.key(function(d) {
			return d.name.toLowerCase();
		})
		.map(data);

	api.getCountry = function(artist, callback) {
		var running = true;
		// Get artists country code here, from last.fm or whatever
		api.lastfm.send("artist.gettoptags", [["artist", artist]], function(err,
			responseData2) {
			// Return if something failed
			if (err || !responseData2.toptags || !responseData2.toptags.tag || !
				responseData2.toptags.tag.length) {
				// console.error("No or too few tags from last.fm. Err: " + err +
				// 	" Response: ", responseData2);
				callback({
					"artist": artist
				});
				return;
			}
			responseData2.toptags.tag.forEach(function(t, i) {
				if (running) {
					var tname = t.name.toLowerCase();
					try {
						if (alias[tname][0].id) {
							cid = alias[tname][0].id;
							cname = alias[tname][0].name;
						} else if (cname[tname][0].id) {
							cid = cname[tname][0].id;
							cname = cname[tname][0].name;
						}
						if (cid) {
							callback({
								"artist": artist,
								"id": cid,
								"tag": t.name,
								"name": cname,
							});
							running = false;
						}
					} catch (e) {
						// console.log(artist, tname)
					}

				}

			})

			if (running) { // We got no country :(
				callback({
					"artist": artist
				})
			}
		});
	}

	/**
	 * Returns a list of country objects for a list of artist names.
	 * @param  {Array}   artists  Array of artist names (String)
	 * @param  {Function} callback Callback function. Argument is a list of country objects,
	 *                             containing only those artists that have a country
	 *                             associated with them.
	 */
	api.getCountries = function(artists, callback) {
		var returnList = [],
			count = 0;
		var storedArtists = JSON.parse(window.localStorage.artists);
		var checkCount = function() {
			count++;
			if (count === artists.length) {
				window.localStorage.artists = JSON.stringify(storedArtists);
				callback(returnList);
			}
		}

		artists.forEach(function(el, i) {
			if (storedArtists[el] && storedArtists[el].country) {
				var returnObject = storedArtists[el].country;
				returnObject.artist = el;
				returnList.push(returnObject);
				checkCount();
			} else {
				var start = new Date().getTime();
				api.getCountry(el, function(data) {
					storedArtists[el] = storedArtists[el] || {};

					if (data.name) {
						storedArtists[el].country = {
							"id": data.id,
							"name": data.name,
						};
						returnList.push(data);
					}
					console.log("apicall " + (new Date().getTime() - start) + " ms");

					checkCount();
				})
			}

		})
	}
})

api.getTags = function(artist, callback) {
	var artists = JSON.parse(window.localStorage.artists);
	// Check if artist tags are already saved, if so return them
	if (artists[artist] && artists[artist].tags) {
		// console.log("Had in store, no api call");
		callback(artists[artist].tags);
	} else {
		// Create object in localstorage
		artists[artist] = artists[artist] || {};
		artists[artist].tags = [];
		window.localStorage.artists = JSON.stringify(artists); // Gotta save because lastfm.sen takes time

		// Get from lastfm
		api.lastfm.send("artist.gettoptags", [["artist", artist]],
			function(err, responseData2) {
				artists = JSON.parse(window.localStorage.artists);
				artists[artist].tags = responseData2.toptags.tag;
				window.localStorage.artists = JSON.stringify(artists);
				callback(artists[artist].tags);
			});
	}
}