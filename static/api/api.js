var api = api || {};
var superCount = 0;

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

	/**
	 * Tries to find out the country for a specified artist.
	 * @param  {String}   artist   Name of the artist to get country for
	 * @param  {Function} callback Callback function, called when the search is over (whether a country's been found or not)
	 *                             The callback function takes one argument, this object:
	 *
	 *                             {
	 *                             	"artist": <artist name>,
	 *                             	"country": <country name>,
	 *                             	"id": <country id>,
	 *                             	"tag": <the tag that decided the country (e.g. Swedish for Sweden)>
	 *                             }
	 *
	 * 								If no country could be found, "country", "tag" and "id" are undefined.
	 *
	 */
	api.getCountry = function(artist, callback) {
		// Get artists country code here, from last.fm or whatever
		api.lastfm.send("artist.gettoptags", [["artist", artist]], function(err,
			responseData2) {
			var running = true; // To stop searching when a country-tag has been found

			// Return if something failed
			if (err || !responseData2.toptags || !responseData2.toptags.tag || !
				responseData2.toptags.tag.length) {
				callback({
					"artist": artist
				});
				return;
			}
			// Else check for country-tags in the artist's tags
			responseData2.toptags.tag.forEach(function(t, i) {
				if (running) {
					var tname = t.name.toLowerCase();
					try {
						if (alias[tname][0].id) { // swedish->sweden
							cid = alias[tname][0].id;
							cname = alias[tname][0].name;
						} else if (cname[tname][0].id) { // sweden->sweden
							cid = cname[tname][0].id;
							cname = cname[tname][0].name;
						}
						if (cid) { // We found a country!
							callback({ // Call callback method
								"artist": artist,
								"id": cid,
								"tag": t.name,
								"name": cname,
							});
							running = false; // Stop searching for country-tags
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
	 *
	 * Beware!!! overwrites localstorage.artists when done!!! woaps!!!!!! dododod!!!
	 * @param  {Array}   artists  Array of artist names (String)
	 * @param  {Function} callback Callback function. Argument is a list of country objects,
	 *                             containing only those artists that have a country
	 *                             associated with them. For object structure, see api.getCountry
	 */
	api.getCountries = function(artists, callback) {
		var returnList = [],
			count = 0;
		/**
		 * Increases a count and checks if we've tried
		 * to get country for all artists
		 */
		var checkCount = function() {
			count++;
			superCount++;
			d3.select("#loading-text").html("Loading artists...<br>(" + superCount + "/" + SESSION.total_artists + ")");

			if (count === artists.length) {
				// We done, save artists and call back
				window.localStorage.artists = JSON.stringify(STORED_ARTISTS);
				callback(returnList);
			}
		}

		// Get countries for all artists
		artists.forEach(function(el, i) {

			// first check stored artists to see if we've already checked this artist
			if (STORED_ARTISTS[el] && STORED_ARTISTS[el].country) {
				var returnObject = STORED_ARTISTS[el].country;
				returnObject.artist = el;
				returnList.push(returnObject);
				checkCount();
			} else {
				var start = new Date().getTime();

				api.getCountry(el, function(data) {
					STORED_ARTISTS[el] = STORED_ARTISTS[el] || {};
					// console.error(data)

					if (data.name) {
						STORED_ARTISTS[el].country = {
							"id": data.id,
							"name": data.name,
						};
						returnList.push(data);
					}
					// console.log("apicall " + (new Date().getTime() - start) + " ms");

					// Update loading div, whoah ugly code yeah whaddayagonnado


					checkCount();
				})
			}

		})
	}
})

/**
 * Get all tags for an artist.
 * @param  {String}   artist   Artist name
 * @param  {Function} callback Callback function. Takes one argument which is an array
 *                             of tag objects (see the last.fm api doc for tag object structure)
 */
api.getTags = function(artist, callback) {
	// Check if artist tags are already saved, if so return them
	if (STORED_ARTISTS[artist] && STORED_ARTISTS[artist].tags) {
		// console.log("Had in store, no api call");
		callback(STORED_ARTISTS[artist].tags);
	} else {
		// Create object in localstorage
		STORED_ARTISTS[artist] = STORED_ARTISTS[artist] || {};
		STORED_ARTISTS[artist].tags = [];

		// Get from lastfm
		api.lastfm.send("artist.gettoptags", [["artist", artist]],
			function(err, responseData2) {
				STORED_ARTISTS[artist].tags = responseData2.toptags.tag;
				window.localStorage.artists = JSON.stringify(STORED_ARTISTS);
				callback(STORED_ARTISTS[artist].tags);
			});
	}
}