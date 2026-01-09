/*requires:
api/lastfm.js
api/musicbrainz.js
*/

var api = api || {};
var superCount = 0;

// Queue for artists that need MusicBrainz fallback lookup
var musicbrainzFallbackQueue = [];
var musicbrainzProcessingActive = false;
var musicbrainzProcessedCount = 0;
var musicbrainzFoundCount = 0;

(function (window, document) {
	let getHardcodedCountries = () => new Promise((res, rej) =>
		d3.json("assets/data/artist-countries.json", (err, data) =>
			err ? rej(err) : res(data)
		));

	api.getCountriesData = (() => {
		console.log("Loading countries data...")
		let promise;

		return () => {
			if (promise) { return promise; }

			return promise = new Promise((res, rej) => {
				d3.csv("assets/data/countries.csv", function (err, data) {
					data.forEach(d => {
						d.id = +d.id;
						d.names = d.names ? d.names.split("|") : [];
						d.tags = d.tags ? d.tags.split("|") : [];
						d.mainName = d.names[0];
						d.tag = d.tags[0];
						d.name = d.mainName;
						d.continent = d.continent || '';
					});

					res(data);
				});
			});
		}
	})();
	
	Promise.all([api.getCountriesData(), getHardcodedCountries()]).then(([countryData, hardcodedCountries]) => {
		countryData = countryData.map(d => {
			let splits = [];

			if (d.names.length === 1 && d.tags.length === 0) {
				splits = [d];
			}
			if (d.names.length > 1) {
				splits = splits.concat(d.names.map(name => ({ ...d, name })));
			}
			if (d.tags.length > 0) {
				splits = splits.concat(d.tags.map(tag => ({ ...d, tag }))); 
			}

			if(d.names.length > 1 &&d.tags.length > 0){ splits.splice(0,1); }
			
			return splits;
		}).flat();

		let alias = d3.nest()
			.key(function(d) {
				if (d && d.tag) {
					return d.tag.toLowerCase();
				} else {
					return "";
				}
			})
			.map(countryData);

		let cname = d3.nest()
			.key(function(d) {
				return d.name.toLowerCase();
			})
			.map(countryData);

	/**
	 * Convert country name to country data
	 * @param {String} countryName - Country name (e.g., "United States", "Sweden")
	 * @returns {Object|null} Country data object with id, name, etc., or null if not found
	 */
	api.convertCountryNameToCountry = function(countryName) {
		if (!countryName) return null;
		
		var countryNameLower = countryName.toLowerCase();
		var countryMatch = cname[countryNameLower];
		
		if (countryMatch && countryMatch.length > 0) {
			var country = countryMatch[0];
			return {
				id: country.id,
				name: country.mainName,
				country: country.mainName,
				tag: country.tag || country.mainName.toLowerCase(),
				mainName: country.mainName
			};
		}
		
		// Try to find by matching any of the names array
		var country = countryData.find(function(d) {
			return d.names.some(function(name) {
				return name.toLowerCase() === countryNameLower;
			});
		});
		
		if (country) {
			return {
				id: country.id,
				name: country.mainName,
				country: country.mainName,
				tag: country.tag || country.mainName.toLowerCase(),
				mainName: country.mainName
			};
		}
		
		console.warn("Unknown country name:", countryName);
		return null;
	};

	/**
	 * Tries to find out the country for a specified artist.
		 * @param  {String}   artist   Name of the artist to get country for
		 * @param  {Function} callback Callback function, called when the search is over (whether a country's been found or not)
		 *                             The callback function takes one argument, this object:
		 *
		 * 								```
		 *                             {
		 *                             	"artist": "", // <artist name>,
		 *                             	"country": "", // <country name>,
		 *                             	"id": "", // <country id>,
		 *                             	"tag": "", // <the tag that decided the country (e.g. Swedish for Sweden)>
		 *                             }
		 * 								```
		 *
		 * 								If no country could be found, "country", "tag" and "id" are undefined.
		 *
		 */
		api.getCountry = function(artist, callback) {
			if (hardcodedCountries[artist]) {
				let hardcodedTagName = hardcodedCountries[artist].toLowerCase();
				
				console.log(`Using hardcoded country tag "${hardcodedTagName}" for artist "${artist}"`)
				
				callback({
					artist,
					tag: hardcodedTagName,
					id: cname[hardcodedTagName][0].id,
					country: cname[hardcodedTagName][0].mainName
				});
				return;
			}
			
			// Get artists country code here, from last.fm or whatever
			api.lastfm.send("artist.gettoptags", [["artist", artist]], function(err, responseData2) {
				// Return if something failed
				if (err || !responseData2.toptags || !responseData2.toptags.tag || !
					responseData2.toptags.tag.length) {
					callback({
						"artist": artist
					});
					return;
				}

				// Lista med taggar vi vill dubbelkolla
				var troubleCountries = ["georgia", "ireland"];
				var troubleLanguages = ["spanish", "french", "english", "portuguese", "russian", "italian", "japanese", "korean", "indian", "swedish", "irish"];
				var theTroubles = [].concat(troubleCountries, troubleLanguages);

				// check for country-tags in the artist's tags
				let demonymTag = { tag: "", id: null, country: "", count: 0 };
				let countryTag = demonymTag;

				responseData2.toptags.tag.some(function (t, i) {
					var tname = t.name.toLowerCase();

					// no need to search anymore since we only care
					// about the créme de la creme i.e. the tag with the
					// highest count
					if (countryTag.id && demonymTag.id) { return true; }

					try {
						// sweden->sweden
						if (!countryTag.id && cname[tname] && cname[tname][0].id) {
							countryTag = { tag: tname, id: cname[tname][0].id, country: cname[tname][0].mainName, count: t.count };
						}

						// swedish -> sweden
						if (!demonymTag.id && alias[tname] && alias[tname][0].id) {
							demonymTag = { tag: tname, id: alias[tname][0].id, country: alias[tname][0].name, count: t.count };
						}
					} catch (e) {}
				});

				// country is best, demonym second
				var bestTag = (countryTag.id && demonymTag.count < 8 * countryTag.count) ?
					countryTag :
					(demonymTag.id 
						? demonymTag
						: {});

				if (countryTag.tag === "georgia" && responseData2.toptags.tag.some(function (t) {
						return ["american", "us", "usa"].includes(t.name.toLowerCase())
					})) {
					// it's not the country...
					bestTag = demonymTag;

					console.info("'" + artist + "' is tagged with 'georgia', but I'm gonna go ahead and guess they're really from the U.S.");
				}

				if (theTroubles.includes(bestTag.tag)) {
					console.info("Potentially incorrect country for '" + artist + "': " + bestTag.country + ", using the tag '" + bestTag.tag + "'");
				}

				// If no country found from Last.fm tags, queue for MusicBrainz fallback
				if (!bestTag.id && !bestTag.country) {
					// Last.fm succeeded but no country tag found - queue for MusicBrainz fallback
					var playcount = STORED_ARTISTS[artist] ? STORED_ARTISTS[artist].playcount : 0;
					musicbrainzFallbackQueue.push({
						artist: artist,
						url: STORED_ARTISTS[artist] ? STORED_ARTISTS[artist].url : null,
						playcount: playcount
					});
					
					// Sort queue by playcount (highest first) to prioritize artists with most scrobbles
					musicbrainzFallbackQueue.sort(function(a, b) {
						return (b.playcount || 0) - (a.playcount || 0);
					});
					
					// Start processing if not already active
					if (!musicbrainzProcessingActive) {
						api.startMusicBrainzProcessing();
					}
				}

				callback(Object.assign({ "artist": artist, }, bestTag));
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
				script.setLoadingStatus(`Loading artists, please wait... (${superCount} / ${SESSION.total_artists})`);
				d3.select("#loading-text").html("Loading artists...<br>(" + superCount + "/" + SESSION.total_artists + ")<br>You can start exploring,<br>but it might interfere<br>with loading your artists.");
				if (count === artists.length) {
					// We done, save artists and call back
					localforage.setItem("artists", STORED_ARTISTS, function (err) {
						if (err) { console.error("Failed saving artists to storage: ", err); }
						callback(returnList);
					});
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
					localforage.setItem("artists", STORED_ARTISTS, function (err) {
						if (err) { console.error("Failed saving artists to storage: ", err); }
						callback(STORED_ARTISTS[artist].tags);
					});
				});
		}
	}

	api.getArtistInfo = function(artist, callback) {
		var artistInfo = [];

		api.lastfm.send("artist.getinfo", [["artist", artist]], function(err, data1) {
			//Creating a list of tag names
			var tagnamelist = [];
			if (data1.artist.tags.tag) {
				data1.artist.tags.tag.forEach(function(t, i) {
					tagnamelist.push(t.name);
				})
			}

			artistInfo.push({
				name: artist,
				url: data1.artist.url,
				image: data1.artist.image[3]["#text"],
				description: data1.artist.bio.summary,
				tags: tagnamelist
			})
			callback(artistInfo);
		})



	}

	/**
	 * Gets a list of artists with tags similar to the user's top tags, sorted in descending order.
	 * Also included are which tags matched.
	 *
	 * Calling this function cancels previous requests initiated by this function.
	 * @param  {String}   country  Name of country or country alias (sweden, swedish, your choice)
	 * @param  {Function} callback Callback function. Argument is a list of artists.
	 */
	var recommendationRequests = [];
	api.cancelRecommendationRequests = function () {
		recommendationRequests.forEach(function (xhr) {
			xhr.abort();
		});

		recommendationRequests = [];
	}
	api.getRecommendations = function (country, callback) {
		api.cancelRecommendationRequests();

		var recommendations = [];

		// get top tags for user
		var toptags = USER_TAGS.slice(0, 15);
		// make tag list to an object (back n forthss)
		var userTagObj = d3.nest().key(function(d) {
			return d.tag;
		}).rollup(function(d) {
			return d[0].count;
		}).map(toptags);


		//console.log("Got top tags for user!")

		// Get top artists for tag country
		var xhr1 = api.lastfm.send("tag.gettopartists", [["tag", country], ["limit", 100]], function(err, data1) {
			// Gotta count matching tags to then sort
			var tagCounts = {};

			// Get the tags for these artists
			//console.log(data1, err)
			if (err || data1.error || !data1.topartists || !data1.topartists.artist) {
				callback([]);
				return;
			}
			var artists = data1.topartists.artist;

			artists.forEach(function(a, num) {
				tagCounts[a.name] = [];
				var xhr2 = api.lastfm.send("artist.gettoptags", [["artist", a.name]], function(err, data2) {
					var hasTags = !data2.error && (data2.toptags.tag ? true : false);
					d3.select("#rec-loading-current").html("(" + a.name + ")");
					if (hasTags) {
						// Compare top 10 tags to user tags
						var tags = d3.nest().key(function(d) {
							return d.name;
						}).map(data2.toptags.tag);

						// Get rid of justin bieber
						if (tags[country]) {
							for (var i = data2.toptags.tag.length - 1; i >= 0; i--) {
								if (userTagObj[data2.toptags.tag[i].name] && data2.toptags.tag[i].count > 5) {
									tagCounts[a.name].push(data2.toptags.tag[i].name);
								}
							};
						}
					}

					if (num === artists.length - 1) {
						//console.log("We've gotten tag counts for all artists, make a list!")
						d3.keys(tagCounts).forEach(function(d) {
							recommendations.push({
								name: d,
								count: tagCounts[d].length,
								tags: tagCounts[d]
							})
						});

						recommendations.sort(function(a, b) {
							return b.count < a.count ? -1 : b.count > a.count ? 1 : 0;
						})
						//console.log(recommendations)
						callback(recommendations);
					}

				})

				recommendationRequests.push(xhr2);
			})
		})

		recommendationRequests.push(xhr1);
	}

	api.getFriends = function(callback) {
		api.lastfm.send("user.getFriends", [["user", SESSION.name]], callback);
	}

	/**
	 * Get the queue of artists that need MusicBrainz fallback lookup
	 * @returns {Array} Array of artist objects
	 */
	api.getMusicBrainzFallbackQueue = function() {
		return musicbrainzFallbackQueue;
	};

	/**
	 * Check if an artist is currently in the MusicBrainz fallback queue
	 * @param {String} artistName - Name of the artist to check
	 * @returns {Boolean} True if artist is in queue
	 */
	api.isArtistInMusicBrainzQueue = function(artistName) {
		return musicbrainzFallbackQueue.some(function(item) {
			return item.artist === artistName;
		});
	};
	
	/**
	 * Queue multiple artists for MusicBrainz fallback lookup
	 * @param {Array} artists - Array of artist objects with artist, url, playcount properties
	 */
	api.queueArtistsForMusicBrainz = function(artists) {
		if (!artists || !Array.isArray(artists)) {
			return;
		}
		
		var queuedCount = 0;
		artists.forEach(function(art) {
			// Skip if already has a country
			if (STORED_ARTISTS[art.artist] && STORED_ARTISTS[art.artist].country && STORED_ARTISTS[art.artist].country.id) {
				return;
			}
			
			// Skip if already in queue
			if (api.isArtistInMusicBrainzQueue(art.artist)) {
				return;
			}
			
			// Add to queue
			musicbrainzFallbackQueue.push({
				artist: art.artist,
				url: art.url || (STORED_ARTISTS[art.artist] ? STORED_ARTISTS[art.artist].url : null),
				playcount: art.playcount || (STORED_ARTISTS[art.artist] ? STORED_ARTISTS[art.artist].playcount : 0)
			});
			queuedCount++;
		});
		
		if (queuedCount > 0) {
			// Sort queue by playcount (highest first)
			musicbrainzFallbackQueue.sort(function(a, b) {
				return (b.playcount || 0) - (a.playcount || 0);
			});
			
			// Start processing if not already active
			if (!musicbrainzProcessingActive) {
				api.startMusicBrainzProcessing();
			}
		}
	};

	/**
	 * Clear the MusicBrainz fallback queue
	 */
	api.clearMusicBrainzFallbackQueue = function() {
		musicbrainzFallbackQueue = [];
	};

	/**
	 * Start processing MusicBrainz fallbacks continuously
	 * Processes artists as they're added to the queue, prioritizing by scrobbles
	 */
	api.startMusicBrainzProcessing = function() {
		if (musicbrainzProcessingActive) {
			return; // Already processing
		}
		
		musicbrainzProcessingActive = true;
		musicbrainzProcessedCount = 0;
		musicbrainzFoundCount = 0;
		
		// Process next item in queue
		var processNext = function() {
			// Sort queue by playcount (highest first) to prioritize artists with most scrobbles
			musicbrainzFallbackQueue.sort(function(a, b) {
				return (b.playcount || 0) - (a.playcount || 0);
			});
			
			if (musicbrainzFallbackQueue.length === 0) {
				// Queue is empty, stop processing
				musicbrainzProcessingActive = false;
				return;
			}
			
			// Get next item from queue (highest playcount)
			var queueItem = musicbrainzFallbackQueue.shift();
			
			var processResult = function(result) {
				musicbrainzProcessedCount++;
				
				if (result.error) {
					if (result.error === "rate_limit") {
						// Retry after longer delay - put back in queue
						musicbrainzFallbackQueue.unshift(queueItem);
						setTimeout(function() {
							api.musicbrainz.queueRequest(queueItem.artist, processResult);
						}, 2000);
						return;
					}
					// Other errors: not_found, no_country, api_error - just skip
					// Process next item after delay
					setTimeout(processNext, 1100);
					return;
				}
				
				if (result.countryName) {
					// Convert country name to country data
					var countryData = api.convertCountryNameToCountry(result.countryName);
					
					if (countryData) {
						musicbrainzFoundCount++;
						
						// Update STORED_ARTISTS
						STORED_ARTISTS[result.artist] = STORED_ARTISTS[result.artist] || {};
						STORED_ARTISTS[result.artist].country = {
							id: countryData.id,
							name: countryData.name
						};
						
						// Remove artist from no-countries list
						if (typeof noCountries !== 'undefined' && typeof noCountries.removeArtist === 'function') {
							noCountries.removeArtist(result.artist);
						}
						
						// Create artist object for countryCountObj
						var artistObj = {
							artist: result.artist,
							id: countryData.id,
							country: countryData.name,
							url: queueItem.url || STORED_ARTISTS[result.artist].url || "",
							playcount: queueItem.playcount || STORED_ARTISTS[result.artist].playcount || 0
						};
						
						// Update countryCountObj (only if SESSION.name is available)
						if (typeof SESSION !== 'undefined' && SESSION.name) {
							var countryId = countryData.id.toString();
							if (!countryCountObj[countryId]) { countryCountObj[countryId] = {}; }
							if (!countryCountObj[countryId][SESSION.name]) { countryCountObj[countryId][SESSION.name] = []; }
							var exists = countryCountObj[countryId][SESSION.name].some(function(a) { return a.artist === result.artist; });
							if (!exists) {
								countryCountObj[countryId][SESSION.name].push(artistObj);
								var newArtistsByCountry = {};
								newArtistsByCountry[countryId] = [artistObj];
								map.addArtists(newArtistsByCountry);
								localforage.setItem("artists", STORED_ARTISTS);
								window.localStorage.countryCountObj = JSON.stringify(countryCountObj);
							}
						}
					}
				}
				
				// Process next item after delay (respect rate limit)
				setTimeout(processNext, 1100);
				
				// Trigger update of no-countries list to reflect queue changes
				// Use setTimeout to avoid calling during render
				setTimeout(function() {
					if (typeof noCountries !== 'undefined' && typeof noCountries.updateList === 'function') {
						noCountries.updateList();
					}
				}, 0);
			};
			
			// Queue the request (MusicBrainz module handles rate limiting)
			api.musicbrainz.queueRequest(queueItem.artist, processResult);
		};
		
		// Start processing
		processNext();
	};

	/**
	 * Process artists in the MusicBrainz fallback queue
	 * This is kept for backwards compatibility but now just calls startMusicBrainzProcessing
	 * @param {Function} progressCallback - Optional callback for progress updates (not used in new implementation)
	 */
	api.processMusicBrainzFallbacks = function(progressCallback) {
		// Just start processing if not already active
		if (!musicbrainzProcessingActive) {
			api.startMusicBrainzProcessing();
		}
	};

})(window, document);
