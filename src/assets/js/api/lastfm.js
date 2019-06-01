var api = api || {};

api.lastfm = {};
api.lastfm.key = "865b1653dbe200905a5b75d9d839467a";
api.lastfm.url = "https://ws.audioscrobbler.com/2.0/";

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

			if (e || d.error) {
				var errInfo = {
					method: method,
					errorCode: d.error,
					try: tries,
					options: options,
				};
				// alert("ERROR");
				d = d || JSON.parse(e.response);
				if ((
						d.error === 29 || // Rate Limit Exceeded
						d.error === 8 // Operation failed
					) && tries < retries) {
					console.log("Retry request: ", errInfo);
					setTimeout(tryGet.bind(null, tries + 1, cb), tries * 500 + Math.random() * tries * 1000);
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