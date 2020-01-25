var api = api || {};

api.lastfm = {};
api.lastfm.key = "865b1653dbe200905a5b75d9d839467a";
api.lastfm.url = "https://ws.audioscrobbler.com/2.0/";

(function (api) {
	let keyI = 0;
	let keys = [
		// https://gitlab.gnome.org/World/lollypop/blob/master/lollypop/lastfm.py
		"7a9619a850ccf7377c46cf233c51e3c6",
		
 		// https://github.com/rembo10/headphones/blob/master/headphones/lastfm.py
		"395e6ec6bb557382fc41fde867bce66f",
		
		// https://github.com/ampache/ampache/issues/1694
		"13893ba930c63b1b2cbe21441dc7f550",

		// https://www.reddit.com/r/lastfm/comments/3okkij/cant_create_lastfm_api_key/
		"4cb074e4b8ec4ee9ad3eb37d6f7eb240",

		// https://www.w3resource.com/API/last.fm/tutorial.php
		"4a9f5581a9cdf20a699f540ac52a95c9",

		// https://www.reddit.com/r/lastfm/comments/3l3cae/cant_get_a_lastfm_api_key/
		"57ee3318536b23ee81d6b27e36997cde",

		// original explr api key
		"865b1653dbe200905a5b75d9d839467a",

		// https://www.w3resource.com/API/last.fm/example.html
		"68b2125fd8f8fbadeb2195e551f32bc4",

		// https://rstudio-pubs-static.s3.amazonaws.com/236264_81312ba4d795474c8641dd0e2af83cba.html
		"1ba315d4d1673bbf88aed473f1917306"
	];
	let keyInfo = window.keyInfo = {};
	keys.forEach(k => keyInfo[k] = { success: 0, fails: 0, total: 0 });

	let rotateKey = function () {
		let avgErrors = keys.reduce((avg, k, i, arr) => avg + keyInfo[k].fails / arr.length, 0);
		let bestKeys = keys.filter(k => keyInfo[k].fails <= avgErrors);
		bestKeys = bestKeys.length ? bestKeys : keys;
		let key = bestKeys[++keyI % bestKeys.length];

		// console.log({ key, avgErrors, bestKeys });

		return key;
	}

	let setKeyInfo = function (key, success) {
		keyInfo[key].total++;
		keyInfo[key].success += success ? 1 : 0;
		keyInfo[key].fails += success ? 0 : 1;
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
		let getUrl = (apiKey) => {
			let _url = api.lastfm.url + "?" + "method=" + method + "&api_key=" +
				apiKey + "&format=json";

			options.forEach(function (el) {
				_url += "&" + el[0] + "=" +
					(el[1] + "")
					.replace("&", "%26")
					.replace("/", "%2F")
					.replace("+", "%2B")
					.replace("\\", "%5C");
			});

			return _url;
		};

		retries = undefined === retries ? 10 : retries
		let xhr, gotResponse, aborted = false;

		function tryGet(tries, cb) {
			let _key = rotateKey();
			xhr = d3.json(getUrl(_key), function (e, d) {
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

				if (e) {
					setKeyInfo(_key, false);

					let errInfo = {
						method: method,
						errorCode: e && e.error,
						try: tries,
						options: options,
						key: _key,
					};
					// alert("ERROR");
					if (tries < retries) {
						console.warn("Retry request: ", errInfo);
						setTimeout(tryGet.bind(null, tries + 1, cb), tries * 3000);
						return;
					}

					if (tries >= retries) {
						console.warn("Retry failed after " + retries + " attempts, will stop trying.", errInfo);
						clearTimeout(timeout);
						aborted = true;
						e = "ERROR";
						d = {
							error: "Took to long to respond"
						};
					}
				} else {
					setKeyInfo(_key, true);
				}

				gotResponse = true;
				cb(e, d);
			});
		}

		tryGet(0, callback);

		// Abort if the request takes too long - it sometimes ballar ur and fails after a minute :(
		let timeout = setTimeout(function () {
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