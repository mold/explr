/* requires:
api/api.js
api/lastfm.js
utils.js
search.js
aria-announcer.js
*/

var script = script || {};
let loadingReady = false;
let loadingStatus = loadingReady ? "Ready to Explr!" : "Loading...";
let announcementIntervalId;


var STORED_ARTISTS;
var STORED_ARTISTS_PROMISE = localforage.getItem("artists").then(val => 
    STORED_ARTISTS = val || {}
);

var CACHED_NO_COUNTRIES;
var CACHED_NO_COUNTRIES_PROMISE = localforage.getItem("no_countries").then(val => 
    CACHED_NO_COUNTRIES = val || {}
);

var USER_TAGS = []; // JSON.parse(window.localStorage.user_tags || "[]");
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

(function () {
    // user = prompt("Input your user name, get top 20 artists")
    var user, currPage = 1,
        maxPage;
    var count = 0;
    var tries = 0;
    var randomcountrylist = ["Malawi", "Malaysia", "Peru", "Sierra Leone", "Trinidad & Tobago", "Greece", "Laos", "Iran", "Haiti", "Nicaragua", "Mongolia", "Slovakia"];
    var listOfArtistsWithNoCountry = [];

    /**
     * adds artists with no country to the array of artists with
     * no country :)
     * 
     * @param {*} data Response from api.getCountries; array of
     * artists that may or may not have country
     */
    var addArtistsWithNoCountry = function (data) {
        listOfArtistsWithNoCountry = listOfArtistsWithNoCountry.concat(data);

        var noCountriesListEl = d3.select(".no-countries ul");
        data.forEach(function (_art) {
            noCountriesListEl.append("li").html('<a href="' + _art.url + '" target="blank" class="no-countries__link">' + _art.artist + '</a>');
        })

        d3.select(".no-countries__info").html(listOfArtistsWithNoCountry.length + " artists without a country:");

        saveToStorage("no_countries", listOfArtistsWithNoCountry);

        if (listOfArtistsWithNoCountry.length) {
            d3.select(".no-countries").style({
                visibility: "visible",
                "pointer-events": "all",
            });
        }
    }

    var getAllArtists = function () {
        // console.log("get artists")

        loadingReady = false;

        api.lastfm.send("library.getartists", [
                ["user", user],
                ["limit", 50],
                ["page", currPage]
            ],
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

                        // TODO: Show erorr message ;)
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
                    SESSION.total_artists = +responseData.artists["@attr"].total;
                    maxPage = +responseData.artists["@attr"].totalPages;

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
                // console.log("Artists done, get countries");

                // Save artist data to localStorage (and create a list of artist names)
                var artistNames = []
                responseData.artists.artist.forEach(function (newArtist) {
                    var a = STORED_ARTISTS[newArtist.name] || {};

                    a.playcount = +newArtist.playcount;
                    a.url = newArtist.url;

                    STORED_ARTISTS[newArtist.name] = a;
                    artistNames.push(newArtist.name);
                })
                saveToStorage("artists", STORED_ARTISTS);
                // var n = count++;

                // Get country for all artists
                api.getCountries(artistNames, function (data) {
                    //Gör så att man kan slå upp på land-id och få upp en lista på artister.
                    var newArtistCountries = d3.nest().key((d) => d.id)
                        // gör så att man får en lista på alla artister för ett land.
                        .rollup((leaves) => leaves)
                        // Skickar in en lista med ett objekt för varje artist.
                        .map(data);

                    d3.keys(newArtistCountries).forEach(function (id) {
                        countryCountObj[id] = countryCountObj[id] || {};
                        countryCountObj[id][user] = countryCountObj[id][user] || [];

                        var artistsFromCountry = countryCountObj[id][user];

                        artistsFromCountry = artistsFromCountry.concat(newArtistCountries[id]);

                        artistsFromCountry.forEach(function (el, i) {
                            //Här lägger vi till ett fält image med artistens bild-url som ett fält till det "inre" objektet.
                            artistsFromCountry[i].url = STORED_ARTISTS[el.artist].url;
                            artistsFromCountry[i].playcount = STORED_ARTISTS[el.artist].playcount;
                        });
                        // countryCountObj är en lista med "country"-objekt. 
                        // Varje country-objekt innehåller en lista med "inre" objekt med artistnamn, lands-id och landsnamn.
                        // dataObj är typ samma som countryCountObj, fast är bara för de tillfälligt sparade artisterna (intervallet).
                        countryCountObj[id][user] = artistsFromCountry;
                    })

                    addArtistsWithNoCountry(data.filter((artist) => !artist.id));

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
        // Get "all" artists from one country
        // countriesList.forEach(function(country){

        // });
        api.lastfm.send("tag.gettopartists", [
            ["tag", "swedish"],
            ["limit", limit],
            ["page", currPage]
        ], function (err, data) {
            var artists = data.topartists.artist;
            // For each artist, get their tags
            artists.forEach(function (a) {
                api.lastfm.send("artist.gettoptags", [
                    ["artist", a.name]
                ], function (err, data) {
                    // console.log(data);
                })
            })
            // Look for user's top tags in artist tags
            // If a lot of matches, save to recommended artists for that country
        });

    }

    var getUserTags = function (err, data) {
        // err = err ||data.error;
        if (err || data.error) {
            if (data && data.error === 6) {
                alert("User not found");
                window.location.assign(window.location.origin + window.location.pathname);
            }
        }


        /*if (err || data.error) {
            console.error("Erorr in getUserTags", err, data);
            alert("Something went wrong when contacting the Last.fm API\n\nEither:\n - The specified user does not exist\n - Last.fm is down\n\nPlease try again.");
            window.location.replace(window.location.origin + window.location.pathname);
        }*/

        var c = 0;

        var tagCount = {};

        //console.log("Gotta get tags")

        var topArtists = data.topartists.artist;
        var done = function () {
            // make list of tags to sort
            USER_TAGS = [];
            //Remove specific tags from user's top tags
            let forbidden = ["american", "swedish", "british", "female vocalists", "male vocalists", "german", "seen live", "english", "singer-songwriter", "spanish", "french"];
            d3.keys(tagCount).forEach(function (el) {
                var nogood = false
                for (let i = 0; i < forbidden.length; i++) {
                    if (el === forbidden[i]) {
                        nogood = true;
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
            // get top ten tags and save to users tag count....
            setTimeout(function () { // Set timeout to not stop artists from loading...
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
                        // console.log(c, topArtists.length)
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
        //Send analytics event
        ga('send', 'event', 'splash screen', 'Go!', 'test');
        // fade out username input box
        var welcomeOverlay = d3.select("#welcome-container");
        welcomeOverlay.transition().duration(2000)
            .style("opacity", 0)
            .each("end", function () {
                welcomeOverlay.remove();
            });

        // Fade in loader
        d3.select(".loader").transition().duration(2000).style("opacity", 1);
        d3.select("#loading-text").html("Getting library...");

        // Screen reader status update every 30 seconds
        setTimeout(function () {
            announcer.announce(document.getElementById("loading-text").innerText);
        }, 3000);
        announcer.announce(document.getElementById("loading-text").innerText);
        announcementIntervalId = setInterval(() => {
            announcer.announce(document.getElementById("loading-text").innerText);
        }, 45000);

        setTimeout(function () {
            if (d3.select("#loading-text").html() === "Getting library...") {
                d3.select("#loading-text").html("Last.fm is taking<br>a long time to<br>respond...");
                setTimeout(function () {
                    if (d3.select("#loading-text").html() === "Last.fm is taking<br>a long time to<br>respond...") {
                        d3.select("#loading-text").html("Maybe <a href='http://last.fm' target='_blank'>last.fm</a> has<br>gone offline...")
                            .style("pointer-events", "all");
                        clearInterval(announcementIntervalId);
                    }
                }, 8000);
            }
        }, 8000);

        // Fade in legend, progress-bar etc
        d3.selectAll(".on-map-view").style({
            "visibility": "visible",
            //            "opacity": 0
        }) //.transition().duration(1000).style("opacity", 1);

        // Get user tags
        api.lastfm.send("user.gettopartists", [
            ["user", user],
            ["period", "12months"],
            ["limit", "50"]
        ], getUserTags);

        // Get user friends
        api.getFriends(function (err, data) {
            try {
                var friends = data.friends.user;
                var i = 0;
                var friendName = d3.select("#friend-name");

                var updateName = function () {
                    friendName.html("");
                    friendName.append("a").attr({
                        href: window.location.origin + window.location.pathname + "?username=" + friends[i].name,
                        target: "_self",
                    }).html(friends[i].name);
                }

                d3.selectAll(".arrow").on("click", function () {
                    if (d3.select(this).classed("left")) {
                        // Go left
                        i = (i === 0 ? friends.length - 1 : i - 1);
                    } else {
                        // Go right
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

        if (CACHED_USERS[user]) {
            // TODO: use timestamp
            console.info("No new artists on last.fm!");
            countryCountObj = JSON.parse(window.localStorage.countryCountObj);

            localforage.getItem("no_countries", function (err, val) {
                addArtistsWithNoCountry(val || []);
            });

            // Get number of artists for screenshot etc.
            api.lastfm.send("library.getartists", [
                    ["user", user],
                    ["limit", 1],
                    ["page", 1]
                ],
                function (error, responseData) {
                    SESSION.total_artists = +responseData.artists["@attr"].total;
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
            // Save theme
            var theme = window.localStorage.theme;
            window.localStorage.clear();
            if (theme) {
                window.localStorage.theme = theme;
            }
            getAllArtists();
        }
    }

    var end = function () {
        loadingReady = true;

        // Screen reader status update
        clearInterval(announcementIntervalId);
        announcer.announce("All artists are loaded!");

        // We're done, fade out loader
        var loader = d3.select(".loader");
        loader.transition().duration(2000)
            .style("opacity", 0)
            .each("end", function () {
                loader.remove();
            });
        //Also fade out progress bar text (after a short delay)
        d3.select("#progress-text").transition().delay(5000).duration(1500)
            .style("opacity", 0);

        CACHED_USERS = {};
        CACHED_USERS[user] = new Date().getTime();
        window.localStorage.cached_users = JSON.stringify(CACHED_USERS);
        window.localStorage.countryCountObj = JSON.stringify(countryCountObj);
    }

    // // Set theme
    // map.nextTheme(window.localStorage.theme || "pink_white");

    // Try to get username from url
    var param = window.location.href.split("username=")[1];

    if (param) { // We already have a user

        // Set up search button listener
        document.addEventListener('DOMContentLoaded', (event) => {
            document.getElementById('search-button').addEventListener('click', function() {
                // Set timeout needed to make sure the browser is ready to focus the search box
                setTimeout(()=> { search.initSearch() }, 0) ;
            });
        });

        // set up keyboard shortcuts
        window.addEventListener("keydown", function (evt) {

            if ((evt.ctrlKey || evt.metaKey) && evt.keyCode === 70) {
                
                // Prevent the browser's default "ctrl + f" or "cmd + f" action (usually "Find")
                evt.preventDefault();

                // Initialize the search box
                search.initSearch();
                
            }
            // Supress hotkeys if search is open 
            if (search.getSearchStatus()) {
                return;
            };
            switch (evt.keyCode) {
                case 83:
                    screenshot.render();
                    //Send google analytics event
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'Hotkeys',
                        eventAction: 'Take screenshot',
                        eventLabel: 'test'
                    });
                    break;
                    // t
                case 84:
                    nextTheme();
                    //Send google analytics event
                    ga('send', {
                        hitType: 'event',
                        eventCategory: 'Hotkeys',
                        eventAction: 'Cycle theme',
                        eventLabel: 'test'
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
        Promise.all([CACHED_NO_COUNTRIES_PROMISE, STORED_ARTISTS_PROMISE]).then(() => begin());
    } else {
        d3.select("#welcome-container").style("visibility", "visible");
        d3.select("#randomCountry").html(randomcountrylist[Math.floor(Math.random() * (randomcountrylist.length))] + "?")
    }

    var saveToStorage = function (key, object, cb) {
        localforage.setItem(key, object, cb || function () {});
    }

})();

script.getCurrentData = function () {
    if (loadingReady) {
        return JSON.parse(window.localStorage.getItem('countryCountObj'));;
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