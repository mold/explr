var geocoder = new google.maps.Geocoder();
var user, currPage = 1,
    maxPage;
var countryCountObj = {};
var times = [];

//1291
//1074
// user = prompt("Input your user name, get top 20 artists")
user = SESSION.name;
var start = new Date().getTime();

var getAllArtists = function() {
    api.lastfm.send("library.getartists", [["user", user], ["limit", 50],
    ["page", currPage]],
        function(error, responseData) {
            maxPage = 2;
            //maxPage = +responseData.artists["@attr"].totalPages;
            if (currPage > maxPage) {
                return;
            }

            currPage += 1;

            console.log("Artists done, get countries");

            // Save artist data to localStorage (and create a list of artist names)
            var artistNames = []
            var storedArtists = JSON.parse(window.localStorage.artists);
            responseData.artists.artist.forEach(function(newArtist) {
                var a = storedArtists[newArtist.name] || {};

                a.playcount = +newArtist.playcount;
                a.url = newArtist.url;
                a.image = newArtist.image;

                storedArtists[newArtist.name] = a;
                artistNames.push(newArtist.name);
            })
            window.localStorage.artists = JSON.stringify(storedArtists);

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

                        countryCountObj[id].forEach(function(el, i){
                            //Här lägger vi till ett fält image med artistens bild-url som ett fält till det "inre" objektet.
                            var localArtists = JSON.parse(window.localStorage.artists);
                            countryCountObj[id][i].image= localArtists[el.artist].image[1]["#text"];
                            console.log("countryCountObj.image: " + countryCountObj[id][i].image);
                        });
                    //countryCountObj är en lista med "country"-objekt. 
                    //Varje country-objekt innehåller en lista med "inre" objekt med artistnamn, lands-id och landsnamn.
                    //dataObj är typ samma som countryCountObj, fast är bara för de tillfälligt sparade artisterna (intervallet).

                    })

                                        console.log(dataObj, countryCountObj);


                    var mapstart = new Date().getTime();
                    map.putCountryCount(countryCountObj);
                    // console.log("map update " + (new Date().getTime() -
                    //         mapstart) +
                    //     " ms");
                    times.push(new Date().getTime() - start);



                    getAllArtists(); // more!!! more!!!!

                });
        });
}

getAllArtists();