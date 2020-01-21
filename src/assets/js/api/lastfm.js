var api = api || {};

api.lastfm = {};
api.lastfm.key = "865b1653dbe200905a5b75d9d839467a";
api.lastfm.url = "https://ws.audioscrobbler.com/2.0/";

(function (api) {
	var keyI = 0;
	var keys = [
		// from https://github.com/ampache/ampache/issues/1694
		"13893ba930c63b1b2cbe21441dc7f550",

		// from https://www.reddit.com/r/lastfm/comments/3okkij/cant_create_lastfm_api_key/
		"4cb074e4b8ec4ee9ad3eb37d6f7eb240",

		// from https://www.w3resource.com/API/last.fm/tutorial.php
		"4a9f5581a9cdf20a699f540ac52a95c9",

		// from https://www.reddit.com/r/lastfm/comments/3l3cae/cant_get_a_lastfm_api_key/
		"57ee3318536b23ee81d6b27e36997cde",

		// original explr api key
		"865b1653dbe200905a5b75d9d839467a"
	];

	var rotateKey = function () {
		api.lastfm.key = keys[++keyI % keys.length];
	}

	/**
	* Send an API call to last.fm
	* @param {String} method    The method name (e.g. "library.getartists")
	* @param {Array} options    An array of tuples (arrays with two elements)
	                            with options for the request: ["key", "value"]
	* @param {Function} callback    The callback function to call with the data
	                                returned from the request. Takes two arguments,
	                                error and data (callback(error, data))
	*/
	api.lastfm.send = function (method, options, callback, retries) {
		rotateKey();

		var url = api.lastfm.url + "?" + "method=" + method + "&api_key=" +
			api.lastfm.key + "&format=json";
		var xhr, gotResponse, retries = undefined === retries ? 10 : retries,
			aborted = false;

		options.forEach(function (el) {
			url += "&" + el[0] + "=" +
				(el[1] + "")
				.replace("&", "%26")
				.replace("/", "%2F")
				.replace("+", "%2B")
				.replace("\\", "%5C");
		});

		function tryGet(tries, cb) {
			xhr = d3.json(url, function (e, d) {
				if (aborted) {
					clearTimeout(timeout);
					return;
				}

				if (e) { // we got an actual server error: 4xx, 5xx
					d = JSON.parse(e.response);
					// now e and d are the same
				} else if (d.error) {
					// we got 200 BUT it's an error
					e = d;
				}

				// console.log({
				// 	e: e,
				// 	d: d
				// });

				if (e) {
					var errInfo = {
						method: method,
						errorCode: e.error,
						try: tries,
						options: options,
						key: api.lastfm.key,
					};
					// alert("ERROR");
					if ((
							e.error === 29 || // Rate Limit Exceeded
							e.error === 8 // Operation failed
						) && tries < retries) {
						console.log("Retry request: ", errInfo);
						setTimeout(tryGet.bind(null, tries + 1, cb), tries * 3000);
						return;
					}

					if (tries >= retries) {
						console.log("Retry failed after " + retries + " attempts, will stop trying.", errInfo);
						clearTimeout(timeout);
						aborted = true;
						e = "ERROR";
						d = {
							error: "Took to long to respond"
						};
					}
				}

				gotResponse = true;
				cb(e, d);
			});
		}

		tryGet(0, callback);

		// Abort if the request takes too long - it sometimes ballar ur and fails after a minute :(
		var timeout = setTimeout(function () {
			if (!gotResponse) {
				//console.log("GET " + url + " took to long, aborting");
				xhr.abort();
				callback("ERROR", {
					error: "Took to long to respond"
				});
			}
		}, 20000);

		return {
			abort: function () {
				aborted = true;
				xhr.abort();
			}
		};
	}

})(api);