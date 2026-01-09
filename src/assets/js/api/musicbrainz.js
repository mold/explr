var api = api || {};

api.musicbrainz = (function() {
	var requestQueue = [];
	var isProcessing = false;
	var lastRequestTime = 0;
	var MIN_REQUEST_INTERVAL = 1000; // 1 second minimum between requests
	
	// Mapping for common subdivisions to countries
	var subdivisionToCountry = {
		"England": "United Kingdom",
		"Scotland": "United Kingdom",
		"Wales": "United Kingdom",
		"Northern Ireland": "United Kingdom"
	};
	
	/**
	 * Extract country name from artist data
	 * @param {Object} artistData - Artist data from MusicBrainz API
	 * @returns {Object} Object with countryName and areaName, or null if not found
	 */
	function extractCountryName(artistData) {
		var countryName = null;
		var areaName = null;
		
		// Check area field first
		if (artistData.area) {
			if (artistData.area.type === "Country" && artistData.area.name) {
				countryName = artistData.area.name;
				areaName = artistData.area.name;
			} else if (artistData.area.type === "Subdivision" && artistData.area.name) {
				countryName = subdivisionToCountry[artistData.area.name];
				areaName = artistData.area.name;
			}
		}
		
		// Check begin-area if area didn't work
		if (!countryName && artistData["begin-area"]) {
			if (artistData["begin-area"].type === "Country" && artistData["begin-area"].name) {
				countryName = artistData["begin-area"].name;
				areaName = artistData["begin-area"].name;
			} else if (artistData["begin-area"].type === "Subdivision" && artistData["begin-area"].name) {
				countryName = subdivisionToCountry[artistData["begin-area"].name];
				areaName = artistData["begin-area"].name;
			}
		}
		
		return countryName ? { countryName: countryName, areaName: areaName } : null;
	}
	
	/**
	 * Get country for an artist from MusicBrainz API
	 * @param {String} artist - Artist name
	 * @param {Function} callback - Callback function with result object
	 */
	function getCountry(artist, callback) {
		var url = "https://musicbrainz.org/ws/2/artist/?query=artist:" + encodeURIComponent(artist) + "&fmt=json&limit=1";
		
		// Use XMLHttpRequest for consistency with rest of codebase and better abort support
		var xhr = new XMLHttpRequest();
		
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				// Check for CORS error (status 0 typically indicates CORS failure)
				if (xhr.status === 0) {
					callback({
						artist: artist,
						error: "cors_error"
					});
					return;
				}
				
				// Check for rate limit
				if (xhr.status === 503) {
					callback({
						artist: artist,
						error: "rate_limit"
					});
					return;
				}
				
				// Check for other HTTP errors
				if (xhr.status < 200 || xhr.status >= 300) {
					callback({
						artist: artist,
						error: "api_error"
					});
					return;
				}
				
				// Parse JSON response
				var data;
				try {
					data = JSON.parse(xhr.responseText);
				} catch (e) {
					callback({
						artist: artist,
						error: "parse_error"
					});
					return;
				}
				
				// Check if we got valid artist data
				if (!data || !data.artists || !data.artists.length) {
					callback({
						artist: artist,
						error: "not_found"
					});
					return;
				}
				
				// Get first artist result
				var artistData = data.artists[0];
				
				// Extract country name from artist data
				var countryInfo = extractCountryName(artistData);
				
				if (countryInfo) {
					callback({
						artist: artist,
						countryName: countryInfo.countryName,
						area: countryInfo.areaName
					});
				} else {
					callback({
						artist: artist,
						error: "no_country"
					});
				}
			}
		};
		
		xhr.onerror = function() {
			// Network error or CORS error (only fires if status is still 0)
			// onreadystatechange will handle status 0, so this is a fallback
			if (xhr.readyState === 4 && xhr.status === 0) {
				callback({
					artist: artist,
					error: "cors_error"
				});
			}
		};
		
		xhr.ontimeout = function() {
			callback({
				artist: artist,
				error: "api_error"
			});
		};
		
		try {
			xhr.open("GET", url, true);
			xhr.setRequestHeader("Accept", "application/json");
			xhr.timeout = 20000; // 20 second timeout
			xhr.send();
		} catch (e) {
			callback({
				artist: artist,
				error: "api_error"
			});
		}
		
		// Return abort function for compatibility
		return {
			abort: function() {
				if (xhr.readyState !== 4 && xhr.readyState !== 0) {
					xhr.abort();
				}
			}
		};
	}
	
	/**
	 * Queue a request with rate limiting
	 * @param {String} artist - Artist name
	 * @param {Function} callback - Callback function
	 */
	function queueRequest(artist, callback) {
		requestQueue.push({
			artist: artist,
			callback: callback
		});
		
		processQueue();
	}
	
	/**
	 * Process the request queue with rate limiting
	 */
	function processQueue() {
		if (isProcessing) {
			return;
		}
		
		if (requestQueue.length === 0) {
			return;
		}
		
		isProcessing = true;
		
		var processNext = function() {
			if (requestQueue.length === 0) {
				isProcessing = false;
				return;
			}
			
			var now = Date.now();
			var timeSinceLastRequest = now - lastRequestTime;
			var delay = Math.max(0, MIN_REQUEST_INTERVAL - timeSinceLastRequest);
			
			setTimeout(function() {
				var request = requestQueue.shift();
				lastRequestTime = Date.now();
				
				getCountry(request.artist, function(result) {
					request.callback(result);
					
					// Process next request
					processNext();
				});
			}, delay);
		};
		
		processNext();
	}
	
	/**
	 * Clear the request queue
	 */
	function clearQueue() {
		requestQueue = [];
		isProcessing = false;
	}
	
	return {
		getCountry: getCountry,
		queueRequest: queueRequest,
		clearQueue: clearQueue
	};
})();

