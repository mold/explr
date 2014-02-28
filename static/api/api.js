var api = api || {};

if (!window.localStorage.artists) {
	window.localStorage.artists = {};
}

d3.csv("../countries.csv",function(err, data){
	api.getCountry = function(artist, callback) {
		var ls = window.localStorage;
		if (ls.artists[artist]) {
			return ls.artists[artist].country_code;
		} else {
			// Get artists country code here, from last.fm or whatever
			data = d3.nest()
				.key(function(d){
					return d.tag.toLowerCase();
				})
				.entries(data);

				console.log(data);

			api.lastfm.send("artist.gettoptags", [["artist", el.name]] function(err, responseData2){
            // Return if something failed
            if(err || !responseData2.toptags.tag){
                console.error("Couldn't get top tags from lastfm", err, responseData2);                
                return;
            }
            responsedata2.toptags.tag.forEach(function(t, i){
                if (t.name == "swedish")
                    
            })
            /*

            // Get coordinates from googlgle
            geocoder.geocode({"address":responseData2.area.name}, function(geoResults, status){
                 // Add all info to a string
		        text += el.name + " (" + responseData2.area.name + ", " + el.playcount+" plays)";

                // Return on error
                if(geoResults){
                    text +=" <a href=http://www.openstreetmap.org/#map=7/"+
                    geoResults[0].geometry.location.d+"/"+geoResults[0].geometry.location.e+
                    " target='_blank'>map</a>";
                }else{
                    console.error("Couldn't get coordinates for "+el.name+", "+responseData2.area.name+" / Status: "+status);
                } 
                
                // Show on page
                text+=", ";
		        document.body.innerHTML = text;
                */
            });   
        });
		}
	}	
})



api.getTags = function(artist, callback) {
	var ls = window.localStorage;
	if (ls.artists[artist]) {
		return ls.artists[artist].tags;
	} else {
		// Get artists tags here, from last.fm or whatever
	}
}