/* requires:
api/api.js
api/lastfm.js
utils.js
search.js
aria-announcer.js
no-countries.js
keyboard-mode.js
*/

var script = script || {};
let loadingReady = false;
let loadingStatus = loadingReady ? "Ready to Explr!" : "Loading...";
let announcementIntervalId;
let noCountryArtistSortMethod = "scrobbles";
let selectedPeriod = "12month"; // Default period

var STORED_ARTISTS;
var STORED_ARTISTS_PROMISE = localforage.getItem("artists").then(val => 
    STORED_ARTISTS = val || {}
);

var CACHED_NO_COUNTRIES;
var CACHED_NO_COUNTRIES_PROMISE = localforage.getItem("no_countries").then(val => 
    CACHED_NO_COUNTRIES = val || {}
);

var USER_TAGS = [];
var CACHED_USERS = JSON.parse(window.localStorage.cached_users || "{}");
var SESSION = {};

function clearExplrCache() {
    var theme = window.localStorage.getItem("theme");
    window.localStorage.clear();
    window.localStorage.setItem("theme", theme);

    announcer.announce("Cleared artist cache, reloading page...");

    return localforage.clear();
}

var countryCountObj = {};

// Helper function to get display name for period
function getPeriodDisplayName(period) {
    const periodNames = {
        'overall': 'All Time',
        '12month': 'Last 12 Months',
        '6month': 'Last 6 Months',
        '3month': 'Last 3 Months',
        '1month': 'Last Month',
        '7day': 'Last 7 Days'
    };
    return periodNames[period] || 'Last 12 Months';
}

// Helper function to create cache key with period
function getCacheKey(user, period) {
    return `${user}_${period}`;
}

// Helper function to get URL parameters
function getUrlParams() {
    var params = {};
    var urlParts = window.location.href.split('?')[1];
    if (urlParts) {
        var pairs = urlParts.split('&');
        pairs.forEach(function(pair) {
            var keyValue = pair.split('=');
            if (keyValue.length === 2) {
                params[keyValue[0]] = decodeURIComponent(keyValue[1]);
            }
        });
    }
    return params;
}

// Initialize period from URL parameters early - FIXED
function initializePeriod() {
    var urlParams = getUrlParams();
    if (urlParams.period) {
        selectedPeriod = urlParams.period;
        console.log("Period set from URL:", selectedPeriod); // Debug log
    }
}

// Call initializePeriod immediately when script loads
initializePeriod();

(function () {
    var user, currPage = 1, maxPage;
    var count = 0;
    var tries = 0;
    var randomcountrylist = ["Malawi", "Malaysia", "Peru", "Sierra Leone", "Trinidad & Tobago", "Greece", "Laos", "Iran", "Haiti", "Nicaragua", "Mongolia", "Slovakia"];

    var getAllArtists = function () {
        loadingReady = false;

        // Use the selected period when fetching artists
        var apiParams = [
            ["user", user],
            ["limit", 50],
            ["page", currPage]
        ];
        
        // Add period parameter if not overall
        if (selectedPeriod && selectedPeriod !== 'overall') {
            apiParams.push(["period", selectedPeriod]);
        }

        console.log("API params for getAllArtists:", apiParams); // Debug log

        api.lastfm.send("user.gettopartists", apiParams,
            function (error, responseData) {
                // Special case for unfortunate users
                if (responseData === "") {
                    console.error('Got empty string ("") as response, skipping page.')
                    currPage++;
                    getAllArtists();
                    return;
                }
                if (error || responseData.error) {
                    console.error("Error in getAllArtists, page " + currPage, error, responseData);

                    // Try again, but not forever
                    if (tries++ < 5) {
                        getAllArtists();
                    } else {
                        var refresh = confirm("Last.fm took too long to respond.\n\nPress OK to refresh the page and try again, or Cancel to use the page as it is.");
                        if (refresh) {
                            clearExplrCache().then(function () {
                                saveToStorage("artists", STORED_ARTISTS, function () {
                                    window.location.reload()
                                });
                            })
                        }
                    }
                    return;
                }

                tries = 0;

                if (currPage === 1) {
                    SESSION.total_artists = +responseData.topartists["@attr"].total;
                    maxPage = +responseData.topartists["@attr"].totalPages;

                    if (SESSION.total_artists === 0) {
                        d3.select(".bubblingG").remove();
                        d3.select("#loading-text")
                            .html("You haven't listened to any<br> artists yet. Start scrobbling with <br>\
                                <a href='http://evolver.fm/2012/05/08/how-to-scrobble-to-last-fm-from-itunes-" +
                                "spotify-and-more/'>your favorite music player!</a>");
                        d3.select(".loader").style("pointer-events", "all");
                        return;
                    }
                }

                currPage++;

                // Save artist data to localStorage (and create a list of artist names)
                var artistNames = []
                responseData.topartists.artist.forEach(function (newArtist) {
                    var a = STORED_ARTISTS[newArtist.name] || {};

                    a.playcount = +newArtist.playcount;
                    a.url = newArtist.url;

                    STORED_ARTISTS[newArtist.name] = a;
                    artistNames.push(newArtist.name);
                })
                saveToStorage("artists", STORED_ARTISTS);

                // Get country for all artists
                api.getCountries(artistNames, function (data) {
                    var newArtistCountries = d3.nest().key((d) => d.id)
                        .rollup((leaves) => leaves)
                        .map(data);

                    d3.keys(newArtistCountries).forEach(function (id) {
                        countryCountObj[id] = countryCountObj[id] || {};
                        countryCountObj[id][user] = countryCountObj[id][user] || [];

                        var artistsFromCountry = countryCountObj[id][user];

                        artistsFromCountry = artistsFromCountry.concat(newArtistCountries[id]);

                        artistsFromCountry.forEach(function (el, i) {
                            artistsFromCountry[i].url = STORED_ARTISTS[el.artist].url;
                            artistsFromCountry[i].playcount = STORED_ARTISTS[el.artist].playcount;
                        });
                        
                        countryCountObj[id][user] = artistsFromCountry;
                    })

                    noCountries.addArtistsWithNoCountry(data.filter((artist) => !artist.id));

                    map.addArtists(newArtistCountries);

                    if (currPage > maxPage) {
                        end();
                        return;
                    } else {
                        getAllArtists();
                    }
                });
            });
    }

    var getRecommendations = function () {
        var currPage = 1,
            limit = 50,
            maxPage = 1000 / limit;
        var countriesList = JSON.parse(window.localStorage.countries);

        var countriesObj = d3.nest().key(function (d) {
            return d.name;
        }).rollup(function (d) {
            return d[0];
        }).map(countriesList);

        api.lastfm.send("tag.gettopartists", [
            ["tag", "swedish"],
            ["limit", limit],
            ["page", currPage]
        ], function (err, data) {
            var artists = data.topartists.artist;
            artists.forEach(function (a) {
                api.lastfm.send("artist.gettoptags", [
                    ["artist", a.name]
                ], function (err, data) {
                    // console.log(data);
                })
            })
        });
    }

    var getUserTags = function (err, data) {
        if (err || data.error) {
            if (data && data.error === 6) {
                alert("User not found");
                window.location.assign(window.location.origin + window.location.pathname);
            }
            return;
        }

        var c = 0;
        var tagCount = {};

        var topArtists = data.topartists.artist;
        var done = function () {
            USER_TAGS = [];
            let forbidden = ["american", "swedish", "british", "female vocalists", "male vocalists", "german", "seen live", "english", "singer-songwriter", "spanish", "french"];
            d3.keys(tagCount).forEach(function (el) {
                var nogood = false
                for (let i = 0; i < forbidden.length; i++) {
                    if (el === forbidden[i]) {
                        nogood = true;
                        break;
                    }
                }
                if (!nogood) {
                    USER_TAGS.push({
                        tag: el,
                        count: tagCount[el]
                    });
                }
            })
            USER_TAGS.sort(function (a, b) {
                return b.count < a.count ? -1 : b.count > a.count ? 1 : 0;
            });
            console.info("Done getting tags, saved to localStorage.user_tags")
            window.localStorage.user_tags = JSON.stringify(USER_TAGS);
        }

        topArtists.forEach(function (el, i) {
            setTimeout(function () {
                api.lastfm.send("artist.gettoptags", [
                    ["artist", el.name]
                ], function (err, data) {
                    let taglist = data.toptags && data.toptags.tag;
                    if (taglist) {
                        var lim = Math.min(taglist.length, 10);
                        for (var i = 0; i < lim; i++) {
                            if (tagCount[taglist[i].name]) {
                                tagCount[taglist[i].name]++;
                            } else {
                                tagCount[taglist[i].name] = 1;
                            }
                        }
                    }

                    c++;
                    if (c == topArtists.length - 1) {
                        done();
                    }
                });
            }, Math.random() * 3000);
        });
    }

    var begin = function () {
        // Ensure we're using the correct period
        SESSION.period = selectedPeriod;

        console.log("Begin function - selectedPeriod:", selectedPeriod); // Debug log

        // Send analytics event with period info
        ga('send', 'event', 'splash screen', 'Go!', selectedPeriod);
        
        // Update map label with current period
        document.getElementById("map-label").innerHTML = `${user}'s world map (${getPeriodDisplayName(selectedPeriod)})`;
        
        // fade out username input box
        var welcomeOverlay = d3.select("#welcome-container");
        welcomeOverlay.transition().duration(2000)
            .style("opacity", 0)
            .each("end", function () {
                welcomeOverlay.remove();
            });

        // Fade in loader with period info
        d3.select(".loader").transition().duration(2000).style("opacity", 1);
        d3.select("#loading-text").html(`Getting library (${getPeriodDisplayName(selectedPeriod)})...`);

        // Screen reader status update every 30 seconds
        setTimeout(function () {
            announcer.announce(document.getElementById("loading-text")?.innerText);
        }, 6000);

        setTimeout(function () {
            if (d3.select("#loading-text")?.html().includes("Getting library")) {
                d3.select("#loading-text").html("Last.fm is taking<br>a long time to<br>respond...");
                setTimeout(function () {
                    if (d3.select("#loading-text").html() === "Last.fm is taking<br>a long time to<br>respond...") {
                        d3.select("#loading-text").html("Maybe <a href='http://last.fm' target='_blank'>last.fm</a> has<br>gone offline...")
                            .style("pointer-events", "all");
                    }
                }, 8000);
            }
        }, 8000);

        // Show hidden screen reader help text
        document.getElementById("a11y-map-info").classList.remove("hidden");

        // Fade in legend, progress-bar etc
        d3.selectAll(".on-map-view").style({
            "visibility": "visible",
        })

        // Get user tags with selected period - FIXED
        var tagApiParams = [
            ["user", user],
            ["limit", "50"]
        ];
        
        if (selectedPeriod && selectedPeriod !== 'overall') {
            tagApiParams.push(["period", selectedPeriod]);
        }

        api.lastfm.send("user.gettopartists", tagApiParams, getUserTags);

        // Get user friends
        api.getFriends(function (err, data) {
            try {
                var friends = data.friends.user;
                var i = 0;
                var friendName = d3.select("#friend-name");

                var updateName = function () {
                    friendName.html("");
                    friendName.append("a").attr({
                        href: window.location.origin + window.location.pathname + "?username=" + friends[i].name + "&period=" + selectedPeriod,
                        target: "_self",
                    }).html(friends[i].name);
                }

                d3.selectAll(".arrow").on("click", function () {
                    if (d3.select(this).classed("left")) {
                        i = (i === 0 ? friends.length - 1 : i - 1);
                    } else {
                        i = (i + 1) % friends.length;
                    }
                    updateName();
                })

                updateName();
                d3.select("#friends #msg").html("Check out " + user + "'s friends")
                d3.select("#friends").transition().duration(1000).style("opacity", 1);

            } catch (e) {
                console.error("getFriends()", e);
                d3.select("#friends").html("&nbsp;Couldn't find any<br>friends on last.fm :(&nbsp;")
                d3.select("#friends").transition().duration(1000).style("opacity", 1);
            }
        });

        // Check cache with period-specific key - FIXED CACHE LOGIC
        var cacheKey = getCacheKey(user, selectedPeriod);
        console.log("Checking cache for key:", cacheKey); // Debug log
        
        // IMPORTANT: Always fetch fresh data for different periods
        // Only use cache if it's for the same period AND recent (within last hour)
        var cacheTime = CACHED_USERS[cacheKey];
        var isRecentCache = cacheTime && (new Date().getTime() - cacheTime < 3600000); // 1 hour
        
        if (isRecentCache) {
            console.info("Using cached data for period:", selectedPeriod);
            var countryDataKey = `countryCountObj_${cacheKey}`;
            countryCountObj = JSON.parse(window.localStorage.getItem(countryDataKey) || '{}');

            localforage.getItem("no_countries", function (err, val) {
                noCountries.addArtistsWithNoCountry(val || []);
            });

            // Get number of artists for screenshot etc.
            var apiParams = [
                ["user", user],
                ["limit", 1],
                ["page", 1]
            ];
            
            if (selectedPeriod && selectedPeriod !== 'overall') {
                apiParams.push(["period", selectedPeriod]);
            }

            api.lastfm.send("user.gettopartists", apiParams,
                function (error, responseData) {
                    if (!error && responseData && responseData.topartists) {
                        SESSION.total_artists = +responseData.topartists["@attr"].total;
                    }
                });

            setTimeout(function () {
                map.addArtists(
                    Object.keys(countryCountObj).reduce((acc, countryId) => ({
                        ...acc,
                        [countryId]: countryCountObj[countryId][SESSION.name]
                    }), {}));
                end();
            }, 1000)
        } else {
            console.info("Fetching fresh data for period:", selectedPeriod);
            // Clear old cache data for different periods
            var theme = window.localStorage.theme;
            
            // Only clear artist cache, keep theme and other settings
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('countryCountObj_') || key === 'cached_users') {
                    localStorage.removeItem(key);
                }
            });
            
            if (theme) {
                window.localStorage.theme = theme;
            }
            
            // Reset CACHED_USERS for fresh start
            CACHED_USERS = {};
            
            getAllArtists();
        }
    }

    var end = function () {
        loadingReady = true;

        // Screen reader status update
        clearInterval(announcementIntervalId);
        announcer.announce("All artists have been loaded!");
        const map = document.querySelector("#map-container svg")
        if (map) {
            const existingAriaLabelledBy = map.getAttribute("aria-labelledby");
            map.setAttribute("aria-labelledby", `${existingAriaLabelledBy} progress-text sr-instructions`);
        }

        // We're done, fade out loader
        var loader = d3.select(".loader");
        loader.transition().duration(2000)
            .style("opacity", 0)
            .each("end", function () {
                loader.remove();
            });
        
        // Also fade out progress bar text (after a short delay)
        d3.select("#progress-text").transition().delay(5000).duration(1500)
            .style("opacity", 0);

        // Save cache with period-specific key
        var cacheKey = getCacheKey(user, selectedPeriod);
        CACHED_USERS[cacheKey] = new Date().getTime();
        window.localStorage.cached_users = JSON.stringify(CACHED_USERS);
        
        // Save country data with period-specific key
        var countryDataKey = `countryCountObj_${cacheKey}`;
        window.localStorage.setItem(countryDataKey, JSON.stringify(countryCountObj));
        
        console.log("Data saved for period:", selectedPeriod, "with key:", cacheKey); // Debug log
    }

    // Get URL parameters and set up initial values
    var urlParams = getUrlParams();
    var param = urlParams.username;

    if (param) { // We already have a user
        // Set up search button listener
        document.addEventListener('DOMContentLoaded', (event) => {
            document.getElementById('search-button').addEventListener('click', function() {
                setTimeout(()=> { search.initSearch() }, 0);
            });

            // Set up period selector if it exists
            const periodSelect = document.getElementById("period-select");
            if (periodSelect) {
                // Set initial value from current selectedPeriod
                periodSelect.value = selectedPeriod;
                
                // Add change listener to reload with new period
                periodSelect.addEventListener('change', function() {
                    const newPeriod = this.value;
                    const newUrl = window.location.pathname + '?username=' + param + '&period=' + newPeriod;
                    
                    // Always reload with new period
                    window.location.href = newUrl;
                });
            }
        });

        // set up keyboard shortcuts
        window.addEventListener("keydown", function (evt) {
            if ((evt.ctrlKey || evt.metaKey) && evt.keyCode === 70 && !evt.shiftKey && !keyboardMode.getStatus()) { 
                evt.preventDefault();
                search.initSearch();
            }
            
            // Supress hotkeys if search or keyboard mode is open 
            if (search.getSearchStatus() || keyboardMode.getStatus()) {
                return;
            };
            
            switch (evt.keyCode) {
                case 83: // 's'
                    screenshot.render();
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'Hotkeys',
                        eventAction: 'Take screenshot',
                        eventLabel: selectedPeriod
                    });
                    break;
                case 84: // 't'
                    nextTheme();
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'Hotkeys',
                        eventAction: 'Cycle theme',
                        eventLabel: selectedPeriod
                    });
                    break;
                default:
                    break;
            }
        });

        if (param.length > 15) {
            param = param.substr(0, 15);
        }
        user = param;
        SESSION.name = param;
        SESSION.period = selectedPeriod;
        
        Promise.all([CACHED_NO_COUNTRIES_PROMISE, STORED_ARTISTS_PROMISE]).then(() => begin());
    } else {
        d3.select("#welcome-container").style("visibility", "visible");
        d3.select("#randomCountry").html(randomcountrylist[Math.floor(Math.random() * (randomcountrylist.length))] + "?")
    }

    var saveToStorage = function (key, object, cb) {
        localforage.setItem(key, object, cb || function () {});
    }

})();

// Export functions
script.getCurrentData = function () {
    if (loadingReady) {
        var cacheKey = getCacheKey(SESSION.name, selectedPeriod);
        var countryDataKey = `countryCountObj_${cacheKey}`;
        return JSON.parse(window.localStorage.getItem(countryDataKey) || '{}');
    } else {
        return countryCountObj;
    }
}

script.getLoadingStatus = function () {
    return loadingStatus;
}

script.setLoadingStatus = function (status) {
    loadingStatus = status;
}

script.getCurrentPeriod = function() {
    return selectedPeriod;
}

script.setPeriod = function(period) {
    selectedPeriod = period;
    if (SESSION) {
        SESSION.period = period;
    }
}
