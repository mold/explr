var STORED_ARTISTS = JSON.parse(window.localStorage.artists || "{}");
var USER_TAGS = JSON.parse(window.localStorage.user_tags || "[]");

(function() {
    // user = prompt("Input your user name, get top 20 artists")
    var user, currPage = 1,
        maxPage;
    var countryCountObj = {};
    var times = [];
    user = SESSION.name;
    var start = new Date().getTime();
    var count = 0;



    var getAllArtists = function() {
        api.lastfm.send("library.getartists", [["user", user], ["limit", 100],
    ["page", currPage]],
            function(error, responseData) {
                if (error || responseData.error) {
                    console.error(error);
                    // Try again
                    getAllArtists();
                    return;
                }

                if (currPage === 1) {
                    SESSION.total_artists = +responseData.artists["@attr"].total;
                    maxPage = +responseData.artists["@attr"].totalPages;

                    if (d3.keys(STORED_ARTISTS).length === SESSION.total_artists) {
                        console.log("No new artists on last.fm!");
                        countryCountObj = JSON.parse(window.localStorage.countryCountObj);
                        map.putCountryCount(countryCountObj);
                        currPage = maxPage + 1; // Fulhack to get loader to fade out
                    }
                }

                // maxPage = 7;
                if (currPage > maxPage) {
                    // We're done, fade out loader
                    var loader = d3.select(".loader");
                    loader.transition().duration(2000)
                        .style("opacity", 0)
                        .each("end", function() {
                            loader.remove();
                        });

                    window.localStorage.countryCountObj = JSON.stringify(countryCountObj);
                    return;
                }

                currPage += 1;

                console.log("Artists done, get countries");

                // Save artist data to localStorage (and create a list of artist names)
                var artistNames = []
                responseData.artists.artist.forEach(function(newArtist) {
                    var a = STORED_ARTISTS[newArtist.name] || {};

                    a.playcount = +newArtist.playcount;
                    a.url = newArtist.url;

                    a.image = [newArtist.image[3]];

                    STORED_ARTISTS[newArtist.name] = a;
                    artistNames.push(newArtist.name);
                })
                window.localStorage.artists = JSON.stringify(STORED_ARTISTS);
                // var n = count++;



                // Get country for all artists
                api.getCountries(artistNames,
                    function(data) {
                        // Count plays for each country?
                        // countryCountList = countryCountList.concat(data);
                        var dataObj = d3.nest() //Gör så att man kan slå upp på land-id och få upp en lista på artister.
                        .key(function(d) {
                            return d.id;
                        })
                            .rollup(function(leaves) { //gör så att man får en lista på alla artister för ett land.
                                return leaves;
                            })
                            .map(data); //Skickar in en lista med ett objekt för varje artist.

                        d3.keys(dataObj).forEach(function(id) {
                            if (countryCountObj[id]) {
                                countryCountObj[id] = countryCountObj[id].concat(
                                    dataObj[id]);
                                //Lägger på de nya dataObj-elementen i countryCountObj-listan.
                            } else {
                                countryCountObj[id] = dataObj[id];
                            }

                            countryCountObj[id].forEach(function(el, i) {
                                //Här lägger vi till ett fält image med artistens bild-url som ett fält till det "inre" objektet.
                                countryCountObj[id][i].image = STORED_ARTISTS[el.artist].image[0]["#text"];
                                countryCountObj[id][i].url = STORED_ARTISTS[el.artist].url;
                                countryCountObj[id][i].playcount = STORED_ARTISTS[el.artist].playcount;
                            });
                            //countryCountObj är en lista med "country"-objekt. 
                            //Varje country-objekt innehåller en lista med "inre" objekt med artistnamn, lands-id och landsnamn.
                            //dataObj är typ samma som countryCountObj, fast är bara för de tillfälligt sparade artisterna (intervallet).

                        })

                        var mapstart = new Date().getTime();
                        map.putCountryCount(countryCountObj);
                        // console.log("map update " + (new Date().getTime() -
                        //         mapstart) +
                        //     " ms");
                        times.push(new Date().getTime() - start);

                        // console.log(n);
                    });

                getAllArtists(); // more!!! more!!!!

            });
    }

    var getRecommendations = function() {
        var currPage = 1,
            limit = 50,
            maxPage = 1000 / limit;
        var countriesList = JSON.parse(window.localStorage.countries);

        var countriesObj = d3.nest().key(function(d) {
            return d.name;
        }).rollup(function(d) {
            return d[0];
        }).map(countriesList);
        // Get "all" artists from one country
        // countriesList.forEach(function(country){

        // });
        api.lastfm.send("tag.gettopartists", [
            ["tag", "swedish"],
            ["limit", limit],
            ["page", currPage]
            ], function(err, data) {
            var artists = data.topartists.artist;
            // For each artist, get their tags
            artists.forEach(function(a) {
                api.lastfm.send("artist.gettoptags", [["artist", a.name]], function(err, data) {
                    console.log(data);
                })
            })
            // Look for user's top tags in artist tags
            // If a lot of matches, save to recommended artists for that country
        });

    }

    var getUserTags = function(err, data) {
        var c = 0;

        var tagCount = {};

        var topArtists = data.topartists.artist;
        var done = function() {
            // make list of tags to sort
            USER_TAGS = [];
            d3.keys(tagCount).forEach(function(el) {
                USER_TAGS.push({
                    tag: el,
                    count: tagCount[el]
                });
            })
            USER_TAGS.sort(function(a, b) {
                return b.count < a.count ? -1 : b.count > a.count ? 1 : 0;
            });
            window.localStorage.user_tags = JSON.stringify(USER_TAGS);
        }

        topArtists.forEach(function(el, i) {
            // get top ten tags and save to users tag count....
            setTimeout(function() { // Set timeout to not stop artists from loading...
                api.lastfm.send("artist.gettoptags", [["artist", el.name]], function(err, data) {
                    taglist = data.toptags.tag;
                    if (!taglist) {
                        return;
                    }
                    var lim = Math.min(taglist.length, 10);
                    for (var i = 0; i < lim; i++) {
                        if (tagCount[taglist[i].name]) {
                            tagCount[taglist[i].name]++;
                        } else {
                            tagCount[taglist[i].name] = 1;
                        }
                    }
                    c++;
                    // console.log(c, topArtists.length)
                    if (c == topArtists.length - 1) {
                        done();
                    }
                });
            }, Math.random() * 3000);
        });

    }
    if (USER_TAGS.length === 0) {
        api.lastfm.send("user.gettopartists", [["user", user], ["period", "12months"]], getUserTags);
    }
    getAllArtists();

})();