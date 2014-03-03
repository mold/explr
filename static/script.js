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
            // maxPage = 5;
            maxPage = +responseData.artists["@attr"].totalPages;
            if (currPage > maxPage) {
                return;
            }

            currPage += 1;

            console.log("Artists done, get countries")
            var artistNames = responseData.artists.artist.map(function(el) {
                return el.name;
            });
            // Get country for all artists
            api.getCountries(artistNames,
                function(data) {
                    // Count plays for each country?
                    // countryCountList = countryCountList.concat(data);
                    var dataObj = d3.nest()
                        .key(function(d) {
                            return d.id;
                        })
                        .rollup(function(leaves) {
                            return leaves;
                        })
                        .map(data);

                    d3.keys(dataObj).forEach(function(id) {
                        if (countryCountObj[id]) {
                            countryCountObj[id] = countryCountObj[id].concat(
                                dataObj[id]);
                        } else {
                            countryCountObj[id] = dataObj[id];
                        }


                    })

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