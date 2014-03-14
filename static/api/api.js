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
					var cid;
					try {

						if (cname[tname] && cname[tname][0].id) { // sweden->sweden
							cid = cname[tname][0].id;
							countryName = cname[tname][0].name;
						} else if (alias[tname] && alias[tname][0].id) { // swedish->sweden
							cid = alias[tname][0].id;
							countryName = alias[tname][0].name;
						}
						if (cid) { // We found a country!
							callback({ // Call callback method
								"artist": artist,
								"id": cid,
								"tag": t.name,
								"name": countryName,
							});
							running = false; // Stop searching for country-tags
						}
					} catch (e) {
						//console.log(artist, tname)
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

					// if (data.name) {
					STORED_ARTISTS[el].country = {
						"id": data.id,
						"name": data.name,
					};
					returnList.push(data);
					// }
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

api.getArtistInfo = function(artist, callback) {
	var artistInfo = [];

	api.lastfm.send("artist.getinfo", [["artist", artist]], function(err, data1) {
		artistInfo.push({
			name: artist,
			url: data1.artist.url,
			image: data1.artist.image[3]["#text"]
		})
		callback(artistInfo);
	})



}

/**
 * Gets a list of artists with tags similar to the user's top tags, sorted in descending order.
 * Also included are which tags matched.
 * @param  {String}   country  Name of country or country alias (sweden, swedish, your choice)
 * @param  {Function} callback Callback function. Argument is a list of artists.
 */
api.getRecommendations = function(country, callback) {
	var recommendations = [];

	// get top tags for user
	var toptags = USER_TAGS.slice(0, 50);
	// make tag list to an object (back n forthss)
	var userTagObj = d3.nest().key(function(d) {
		return d.tag;
	}).rollup(function(d) {
		return d[0].count;
	}).map(toptags);

	console.log("Got top tags for user!")

	// Get top artists for tag country
	api.lastfm.send("tag.topartists", [["tag", country], ["limit", 25]], function(err, data1) {
		// Gotta count matching tags to then sort
		var tagCounts = {};

		// Get the tags for these artists
		console.log(data1, err)
		if (err || data1.error || !data1.topartists.artist){
			callback([]);
			return;
		}
		var artists = data1.topartists.artist;

		artists.forEach(function(a, num) {
			tagCounts[a.name] = [];
			api.lastfm.send("artist.gettoptags", [["artist", a.name]], function(err, data2) {
				var hasTags = (data2.toptags.tag ? true:false);

				if(hasTags){
								// Compare top 10 tags to user tags
								var tags = d3.nest().key(function(d) {
									return d.name;
								}).map(data2.toptags.tag);

				// Get rid of justin bieber
				//if (tags[country]) {
					for (var i = data2.toptags.tag.length - 1; i >= 0; i--) {
						if (userTagObj[data2.toptags.tag[i].name] && data2.toptags.tag[i].count > 5) {
							tagCounts[a.name].push(data2.toptags.tag[i].name);
						}
					};
				}
				//}

				if (num === artists.length - 1) {
					console.log("We've gotten tag counts for all artists, make a list!")
					if(hasTags){
										d3.keys(tagCounts).forEach(function(d) {
											recommendations.push({
												name: d,
												count: tagCounts[d].length,
												tags: tagCounts[d]
											})
										});
					}
					
					recommendations.sort(function(a, b) {
						return b.count < a.count ? -1 : b.count > a.count ? 1 : 0;
					})
					callback(recommendations);
				}

			})
		})
	})
}