var map = {};
//White theme default:
var colorArray = ["#feebe2", "#feebe2", "#fcc5c0", "#fa9fb5", "#f768a1", "#dd3497", "#ae017e", "#7a0177"];
var legend;
var countryScore = 0;


(function(window, document) {
  d3.select(window).on("resize", throttle);

  var doThrottle = false;
  var filter = "artists"; // filter by artists or plays

  var zoom = d3.behavior.zoom()
    .scaleExtent([1, 9])
    .on("zoom", move);



  // var width = document.getElementById('map-container').offsetWidth;
  // var height = width / 1.8;

  var height, width;

  var topo, projection, path, svg, g, countryNames, rateById, centered, active;
  countryCount = {};

  //Variables needed to update scale and legend
  var mydomain = [0, 1, 2, 3, 4, 5, 6];
  var maxartists = 1,
    maxplaycount = 0;

  //Setting color and range to be used
  var color;

  // Set theme
  var theme = window.localStorage.theme || "pink_white";

  map.drawPlays = function() {
    filter = "scrobbles";
    redraw();
  }

  /**
   * Sets width/height, i.e. changes the global variables "width" and "height"
   */
  function updateDimensions() {
    height = window.innerHeight - 5;
    width = document.getElementById('map-container').offsetWidth;
  }

  //Returns total number of plays for country
  function getCountryPlaycount(c) {
    if (countryCount[c.id]) {
      var count = 0;
      for (i = 0; i < countryCount[c.id].length; i++) {
        count += countryCount[c.id][i].playcount;
      }
      return count;
    } else return 0;

  }


  function updateProgressBar() {
    var progressPro = (countryScore / 197);

    return progressPro;

  }



  //Function to format numbers over 1000 with a space
  function numbersWithSpace(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }
  /**
   * Randomize array element order in-place.
   * Using Fisher-Yates shuffle algorithm.
   */
  function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }
  //Function to remove duplicates from arrays
  function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
  }

  function updateScale() {
    var max = -1;
    switch (filter) {
      case "artists":
        max = maxartists;
        for (i = 0; i < 5; i++) {
          mydomain[i] = Math.pow(Math.E, (Math.log(max) / 6) * (i + 1))
        }
        mydomain = [0, 1, mydomain[0], mydomain[1], mydomain[2], mydomain[3], mydomain[4]];
        break;
      case "scrobbles":
        max = maxplaycount;
        for (i = 0; i < 7; i++) {
          mydomain[i] = Math.pow(Math.E, (Math.log(max) / 7) * (i + 1))
        }
        mydomain = [0, 1, mydomain[1], mydomain[2], mydomain[3], mydomain[4], mydomain[5]];
        break;
    }


    color = d3.scale.threshold()
      .domain(mydomain)
      .range(colorArray);
  }

  function updateLegend() {
    //Remove decimals from domain
    var x = 0;
    var len = mydomain.length
    while (x < len) {
      mydomain[x] = Math.ceil(mydomain[x]);
      x++;
    }

    //Array of text
    var legend_labels = [numbersWithSpace(mydomain[0]) + "", mydomain[1] + "-" + (mydomain[2] - 1), mydomain[2] + "-" + (mydomain[3] - 1), mydomain[3] + "-" + (mydomain[4] - 1), mydomain[4] + "-" + numbersWithSpace((mydomain[5] - 1)), numbersWithSpace(mydomain[5]) + "-" + numbersWithSpace((mydomain[6] - 1)), "> " + numbersWithSpace(mydomain[6])];

    //Create Legend
    svg.select("g#legend").selectAll("g.legend").remove(); // need to remove for theme changing :(
    legend = svg.select("g#legend").selectAll("g.legend")
      .data(mydomain);

    //Color box sizes
    var ls_w = 20,
      ls_h = 20;
    var x = width * 0.03;
    var y = height * 0.03;

    // Add legend filter text
    var text1 = svg.select("#filter-text")
      .attr("x", x)
      .attr("y", height - y - mydomain.length * ls_h - 1.5 * ls_h)
      .text("Number of ");
    var text2 = svg.select("#filter")
      .attr("x", x + text1[0][0].getComputedTextLength() + 5)
      .attr("y", height - y - mydomain.length * ls_h - 1.5 * ls_h)
      .text(filter);
    text2.on("click", function() {
      // Toggle filter method
      filter = (filter === "artists" ? "scrobbles" : "artists");
      redraw();
    })

    var enter = legend.enter()
      .append("g")
      .attr("class", "legend");

    enter.append("rect")
      .attr("x", x)
      .attr("y", function(d, i) {
        return height - (i * ls_h) - 2 * ls_h - y;
      })
      .attr("width", ls_w)
      .attr("height", ls_h)
      .style("fill", function(d) {
        return color(d);
      });
    enter.append("text")
      .attr("x", x + 30)
      .attr("y", function(d, i) {
        return height - (i * ls_h) - ls_h - 4 - y;
      });

    legend.selectAll("text").data(mydomain)
      .text(function(d, _, i) {
        return legend_labels[i];
      });
  }

  /*var themeButton = d3.select("#map-container").append("button").attr("class",

    "theme-button").html("Paint it black"); */

  /*var changeTheme = d3.select("#changeTheme").append("button").attr("class",

    "theme-button").html("Paint it black");*/



  //progressbar...


  //Variables for color legend

  var tooltip = d3.select("#map-container").append("div").attr("class",
    "tooltip hidden");

  var infoContainer = d3.select("body").append("div").attr("class",
    "infoContainer hidden").attr("id", "infoContainer");

  var artistContainer = d3.select("#infoContainer").append("div").attr("class",
    "artistContainer").attr("id", "artistContainer");


  var cnameDiv = d3.select("#infoContainer").append("div").attr("class",
    "cnameDiv").attr("id", "cname");

  var detailsDiv = d3.select("#artistContainer").append("div").attr("class",
    "detailsDiv").attr("id", "details");

  var recoDiv = d3.select("#artistContainer").append("div").attr("class",
    "recoDiv").attr("id", "recommendations");

  var artistSummaryDiv = d3.select("#artistContainer").append("div").attr("class",
    "artistSummaryDiv").attr("id", "summary");

  var closeButton;

  var offsetL;
  var offsetT;



  //-----------THEME FUNCTIONS---------------------//

  function toBlackTheme() {
    d3.select("body").classed("black-theme", true);
    changeTheme.html("Paint it white");
    changeTheme.style("color", "white");
    colorArray = ["#211f1D", "#211f1D", "#fcc5c0", "#fa9fb5", "#f768a1", "#dd3497", "#ae017e", "#7a0177"];
    toPinkBlack();
    theme = "black";
    redraw(true);
  }

  function toWhiteTheme() {
    d3.select("body").classed("black-theme", false);
    changeTheme.html("Paint it black");
    changeTheme.style("color", "black");
    colorArray = ["#feebe2", "#feebe2", "#fcc5c0", "#fa9fb5", "#f768a1", "#dd3497", "#ae017e", "#7a0177"];
    //toRedWhite();
    theme = "white";
    redraw(true);
  }


  //---------------------- Color preferences -------------//
  var themes = {
    blue_black: ["#03020D", "#140E1F", "#2A075A", "#321C78", "#362688", "#3E3CA7", "#4651C5", "#5371F4"],
    green_black: ["#03020D", "#08120C", "#032F30", "#064137", "#0E6745", "#158C54", "#1CB162", "#28EA78"],
    pink_black: ["#03020D", "#1F0310", "#4B0627", "#5C1138", "#7E285C", "#A13F80", "#C355A4", "#F778DA"],
    pink_white: ["#feebe2", "#feebe2", "#fcc5c0", "#fa9fb5", "#f768a1", "#dd3497", "#ae017e", "#7a0177"],
    green_white: ["#ece2f0", "#F6EBFA", "#ccece6", "#99d8c9", "#66c2a4", "#41ae76", "#238b45", "#006d2c"],
    red_white: ["#F0F0D8", "#F0F0D8", "#feb24c", "#fd8d3c", "#fc4e2a", "#e31a1c", "#bd0026", "#800026"],
  };

  nextTheme = function(toTheme) {
    // Go to next theme
    var themeList = d3.keys(themes);
    theme = toTheme || themeList[(themeList.indexOf(theme) + 1) % themeList.length];
    colorArray = themes[theme];

    //Change body class
    d3.select(document.body).attr("class", theme);

    // Save :)
    window.localStorage.theme = theme;

    // Redraw map :)
    if (topo) redraw();
  }
  map.nextTheme = nextTheme;

  nextTheme(theme);
  updateScale();
  updateDimensions();
  setup(width, height);

  function setup(width, height) {
    projection = d3.geo.naturalEarth()
      .translate([(width / 2), (height / 2) + height * 0.08])
      .scale(width / 1.7 / Math.PI);

    path = d3.geo.path().projection(projection);

    svg = d3.select("#map-container").append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("margin-left", document.getElementById("map-container").offsetWidth / 2 - width / 2)
      .call(zoom)
      .on("click", click)
      .append("g");

    g = svg.append("g");
    svg.append("g").attr("id", "legend")
    svg.append("text").attr({
      id: "filter-text",
      class: "legend"
    });
    svg.append("text").attr({
      id: "filter",
      class: "legend"
    });
  }

  //Load country aliases and names
  if (!window.localStorage.countries) {
    d3.csv("static/countries.csv", function(err, countries) {
      countryNames = countries;

      countries.forEach(function(i) {
        //Turning CSV values into numeric data
        i.id = +i.id;
      });

      // save countries
      window.localStorage.countries = JSON.stringify(countries);
    });

  } else {
    countryNames = JSON.parse(window.localStorage.countries);
  }
  //Load map
  d3.json("static/world-50m.json", function(error, world) {

    var countries = topojson.feature(world, world.objects.countries).features;

    topo = countries;
    draw(topo, true);

  });

  function draw(topo, redrawMap) {
    var country = g.selectAll(".country").data(topo);

    var progress = d3.select("#progress-bar").style({
      "height": updateProgressBar() * 100 + "%",
      "background-color": colorArray[6]
    });
    d3.select("#countryCount").style({
      "background-color": colorArray[1],
      "border-color": colorArray[6]
    })
    //Show progressbar text on mouse-over
    .on("mousemove", function() {
      d3.select("#progress-text")
        .transition().duration(150).style("opacity", 0.9);
    })
      .on("mouseout", function() {
        d3.select("#progress-text").transition().duration(150).style("opacity", 0);
      });
    d3.select("#progress-text").html("Scrobbled from " + countryScore + "/197 countries")

    //Draw countries
    if (redrawMap) {
      country.enter().insert("path")
        .attr("class", "country")
        .attr("d", path)
        .attr("id", function(d, i) {
          return d.id;
        })
        .attr("title", function(d, i) {
          return d.properties.name;
        })
        .style("fill", function() {
          return color(0);
        });
    }
    //Color countries
    country.transition().style("fill", function(d) {
      switch (filter) {
        case "artists":
          return countryCount[d.id] ? color(countryCount[d.id].length) :
            color(0);
          break;
        case "scrobbles":
          return color(getCountryPlaycount(d));
          break;
      }
      // return countryCount[d.id] ? color(countryCount[d.id].length) :
      //   color(0);
    })

    //offsets for tooltips
    offsetL = document.getElementById('map-container').offsetLeft;
    offsetT = document.getElementById('map-container').offsetTop;

    //tooltips
    country
      .on("mousemove", function(d, i) {
        var name;
        var tag;
        countryNames.forEach(function(e, i) {
          if (e.id === d.id) {
            name = e.name;
            tag = e.tag;
          };
        })
        var mouse = d3.mouse(svg.node()).map(function(d) {
          return parseInt(d);
        });

        tooltip.classed("hidden", false)
          .attr("style", "left:" + (mouse[0] + offsetL + 20) + "px;top:" + (
            mouse[1] +
            offsetT + 10) + "px")
          .html(name + (countryCount[d.id] ? "<br>" + countryCount[d.id].length + " artists, " + numbersWithSpace(getCountryPlaycount(d)) + " scrobbles" : ""));

      })
      .on("mouseout", function(d, i) {
        tooltip.classed("hidden", true);
      });



    //Show div with top 10 artists for country when clicked
    country.on("click", function(d, i) { //.on("click", clicked)
      var name;
      var tag;
      var id;

      clicked(d);

      countryNames.forEach(function(e, i) {
        if (e.id === d.id) {
          name = e.name;
          tag = e.tag;
          id = d.id;
        };
      })
      var mouse = d3.mouse(svg.node()).map(function(d) {
        return parseInt(d);
      });

      closeButton
        .on("click", function(d, i) {
          //detailsDiv.classed("hidden", true);
          removeArtistDiv();
          // zoom out map, fulhack
          clicked(centered);
        }) //"stäng" onclick slutar

    }) // on click slutar

  }
  /*draw slutar här*/



  /*------------------------här börjar alla functioner--------------------------*/


  /*-------redraw----*/
  //den kallas varje gång datan uppdateras. redrawMap är en boolean 
  function redraw(redrawMap) {
    updateDimensions();

    if (redrawMap) {
      d3.select('svg').remove();
      setup(width, height);
    }

    maxartists = d3.max(d3.keys(countryCount), function(cname) {
      return countryCount[cname].length;
    });
    maxplaycount = d3.max(d3.keys(countryCount), function(cname) {
      return getCountryPlaycount({
        id: cname
      });
    })
    updateScale();
    updateLegend();

    draw(topo, redrawMap);
  }


  /**
   * Moves the map to the specified location or based on the current zoom event
   * @param  {Array} tr      Optional: Translation tuple [x, y]
   * @param  {Number} sc      Optional: Scale factor
   * @param  {Boolean} animate Optional: Decides whether to animate the map movement
   */
  function move(tr, sc, animate) {
    var t = tr || (d3.event ? d3.event.translate : false) || zoom.translate();
    var s = sc || (d3.event ? d3.event.scale : false) || zoom.scale();

    // If move was not initiated by clicking on a country, deselect the selected country
    if (!tr && !sc && centered) {
      highlightCountry(false);
      removeArtistDiv();
      centered = null;
    }

    var zscale = s;
    var h = height / 4;

    t[0] = Math.min(
      (width / height) * (s - 1),
      Math.max((width * 1.2) * (1 - s), t[0])
    );

    t[1] = Math.min(
      h * (s - 1) + h * s,
      Math.max(height * (1 - s) - h * s, t[1])
    );

    zoom.translate(t);
    zoom.scale(s);

    if (animate) {
      g.transition().duration(950).attr("transform", "translate(" + t + ")scale(" + s + ")");

    } else {
      g.attr("transform", "translate(" + t + ")scale(" + s + ")");
    }

    //adjust the country hover stroke width based on zoom level
    d3.selectAll(".country").style("stroke-width", 1.5 / s);
  }
  map.move = move;

  var throttleTimer;

  function throttle() {
    window.clearTimeout(throttleTimer);
    throttleTimer = window.setTimeout(function() {
      redraw(true);
      move([0, 0], 1); // Reset position
    }, 200);
  }


  //geo translation on mouse click in map
  function click() {
    var latlon = projection.invert(d3.mouse(this));
    // console.log(latlon);
    //console.log(countryCount);
  }


  /*----------------------------makeArtistDiv------------------------------------------------*/
  //Skapar "details-on-demand"-divarna.
  function makeArtistDiv(d) {

    //lägga till namn till detailseDiv
    var name;
    var tag;
    var recoms;
    //var id;
    countryNames.forEach(function(e, i) {
      if (e.id === d.id) {
        name = e.name;
        tag = e.tag;
        //id = d.id;
      };
    })
    d3.select("#recommendations").html("");
    //Show country name and info div on left hand side
    infoContainer
      .classed("hidden", false)
      .transition()
      .style("opacity", 1)
      .duration(750);

    //Hide progressbar when showing 
    d3.selectAll("#countryCount, .on-map-view")
      .classed("hidden", true);

    closeButton = d3.select('#infoContainer').append("button").attr("type", "button").attr("class", "close-button").html("X");

    //Populate country information div
    cnameDiv
      .append("div").attr("class", "cnameContainer").attr("id", "cnameCont")
      .append("h1").html(name);
    d3.select("#cnameCont").append("h5")
      .html(function() {
        if (countryCount[d.id])
          return numbersWithSpace(countryCount[d.id].length) + " artists, " + numbersWithSpace(getCountryPlaycount(d)) + " scrobbles"
        else return "No artists yet - Find new here ->"
      })


    if (countryCount[d.id]) { //Om landet vi klickat på har lyssnade artister.


      d3.select("#details").append("h4")
        .html("Your top artists tagged with #" + name + " or #" + tag + ": ")
        .attr("class", "details-h4");

      //Show top 5 artists
      for (i = 0; i < 5; i++) {
        if (countryCount[d.id][i]) {
          var index = i;
          var artistDiv = d3.select("#details").append("div").attr({
              "class": "artist-div lowlight",
              "data-artist": countryCount[d.id][i].artist
            })
            .on("click", function() {
              // Lowlight not selected artists
              d3.selectAll(".artist-div").classed({
                "lowlight": true,
                "highlight": false
              });
              // Highlight selected artist
              d3.select(this).classed({
                "highlight": true,
                "lowlight": false
              });
              makeSummaryDiv(d3.select(this).attr("data-artist"), []);
            });
          var artistLink = artistDiv.append("a").style("display", "block")
          artistLink.append("div")
            .attr("class", "image-div")
            .style("background-image", "url(" + "'" + countryCount[d.id][i].image + "'" + " )");

          var playCountDiv = artistDiv.append("div").attr("class", "play-count-div");

          playCountDiv.append("p")
            .html("<b>" + countryCount[d.id][i].artist + "</b><br>" + countryCount[d.id][i].playcount + " scrobbles")
            .attr("class", "details-p");
        } else {
          i = 5;
        }
      }
    } else { //Om landet vi klickat på inte har några lyssnade artister... 
      console.log("landet har inga lyssnade artister");
    }
    //"Recommended"-heading
    d3.select("#recommendations").append("h4")
      .html("You may like: ")
      .attr("class", "recom-h4");

    // show loading message
    var recLoadingDiv = d3.select("#recommendations").append("div").attr("class", "recLoadingDiv");
    var recLoadingMessage = recLoadingDiv.append("span")
      .attr("id", "rec-loading")
      .html("Looking for artists tagged #" + tag);
    // recLoadingDiv.append("span").attr("id", "rec-loading-current");
    recLoadingDiv.append("img")
      .attr({
        id: "rec-loading-img",
        src: "static/img/loader_horizontal.gif"
      })
      .style({
        display: "inline-block",
        margin: "0 5px"
      })
    recLoadingDiv.append("span").attr("id", "rec-loading-current");



    //Get list of recommendations for country based on tags!
    api.getRecommendations(tag, function(taglist) {
      // Return if this callback is from an old (not active) country
      if (!centered || centered.id !== d.id) {
        return;
      }
      // Show loading message
      recLoadingMessage.html("Looking for artists tagged #" + name)

      //Get list of recommendations for country based on country name!
      api.getRecommendations(name, function(namelist) {
        // Return if this callback is from an old (not active) country
        if (!centered || centered.id !== d.id) {
          return;
        }
        //Show loading message
        recLoadingMessage.html("Loading images for recommended artists");

        //Join the two lists
        var list = taglist.concat(namelist);

        //Removing duplicates from the list!
        var arr = {};
        for (var i = 0; i < list.length; i++)
          arr[list[i]['name']] = list[i];

        list = new Array();
        for (key in arr)
          list.push(arr[key]);

        list.sort(function(a, b) {
          return b.count < a.count ? -1 : b.count > a.count ? 1 : 0;
        });

        //Get the first 20 artists
        list = list.slice(0, 20);
        //Randomize list
        list = shuffleArray(list);

        if (list.length === 0) { // Found no recommendations
          recLoadingDiv.remove();
          d3.select("#recommendations").append("p")
            .html("We couldn't find any good " + tag + " recommendations for you :-( ");
          d3.select("#recommendations").append("a").attr({
            href: "http://www.last.fm/tag/" + name,
            target: "_blank",
          }).html("Try searching last.fm yourself!");
        }

        for (i = 0; i < Math.min(list.length, 5); i++) {
          // Return if this callback is from an old (not active) country
          if (centered.id !== d.id) {
            return;
          }

          var artisturl, artistimg, artistname;

          //Get url and images for recommended artists!
          api.getArtistInfo(list[i].name, function(art) {
            recLoadingDiv.remove();
            var artisturl = art[0].url;
            var artistimg = art[0].image;
            var artistname = art[0].name;


            var recoArtistDiv = d3.select("#recommendations").insert("div", "#summaryText").attr("class", "artist-div lowlight");
            var recoArtistLink = recoArtistDiv.append("a").style("display", "block")
              //.attr("href", artisturl)
              //.attr("target", "_blank");
            recoArtistLink.append("div")
              .attr("class", "image-div")
              .style("background-image", "url(" + "'" + artistimg + "'" + ")")

            var recoArtistInfoDiv = recoArtistDiv.append("div").attr("class", "recoArtistInfoDiv");

            recoArtistInfoDiv.append("p")
              .html("<b>" + artistname + "</b>")
              .attr("class", "details-p");

            recoArtistDiv.on("click", function() {
              d3.selectAll(".artist-div").classed({ // Lowlight not selected artists
                "lowlight": true,
                "highlight": false
              });

              d3.select(this).classed({ // Highlight selected artist
                "highlight": true,
                "lowlight": false
              });
              makeSummaryDiv(artistname);
            });

          })
        }


      })
    });

  }

  function removeArtistDiv() {
    infoContainer.transition().style("opacity", 0).duration(1000);
    infoContainer.classed("hidden", true);
    d3.selectAll("#countryCount, .on-map-view").classed("hidden", false);
    d3.selectAll(".artist-div").remove("div");
    d3.select(".close-button").remove("button");
    d3.select(".details-h").remove("p");
    d3.select(".details-h4").remove("h4");
    d3.select(".recom-h4").remove("h4");



    cnameDiv.classed("hidden", true);
    d3.select("#cnameCont").remove("h1");
    d3.select("#cnameCont").remove("h5");
  }

  function makeSummaryDiv(artistname) {
    var usertaglist = [];
    //console.log(usertaglist);
    var artisttaglist = [];

    d3.select("#summaryText").remove();
    var summaryText = d3.select("#recommendations").append("div").attr("class", "summaryText").attr("id", "summaryText");
    d3.select("#summaryText").append("span").html("Loading description of " + artistname);
    d3.select("#summaryText").append("img")
      .attr({
        id: "sum-loading-img",
        src: "static/img/loader_horizontal.gif"
      })
      .style({
        display: "inline-block",
        margin: "0 5px"
      });

    //Get artist info from Lastfm
    api.getArtistInfo(artistname, function(art) {
      var text = art[0].description.replace(/(\n)+/g, '<br />');
      var text = text.substring(6);
      // console.log(text)
      //Get artist's top tags
      artisttaglist = art[0].tags;
      //Create list of user tags

      //Make list of artist tags which are also user's top tags:
      for (y = 0; y < 15; y++) {
        for (z = 0; z < artisttaglist.length; z++) {
          if (artisttaglist[z] === USER_TAGS[y].tag) {
            usertaglist.push(USER_TAGS[y].tag)
          }
        }
      }

      //Create combined tag list and remove duplicates
      var taglist = usertaglist.concat(artisttaglist);
      taglist = taglist.filter(function(elem, pos) {
        return taglist.indexOf(elem) == pos;
      })
      // Remove loading text
      d3.select("#summaryText").html("");
      //Create containing div
      // Calculate height of infotextbox (so the scrollbar is inside the box and not on body)
      var h = window.innerHeight * 0.90 - document.getElementById("artistContainer").offsetHeight;
      summaryText.style("max-height", h + "px");

      summaryText.append("h4").html(artistname);

      //Show top 7 tags
      for (i = 0; i < Math.min(taglist.length, 6); i++) {
        var tagdiv = summaryText.append("div").attr("class", "tagdiv").append("h4").html("#" + taglist[i]);
        //Mark all user tags
        for (p = 0; p < usertaglist.length; p++) {
          if (taglist[i] === usertaglist[p])
            tagdiv.classed("usertag", true);
        }
      }
      //Display artist summary
      summaryText.append("p").html(text || "No description available - <a href='http://last.fm/music/" + artistname + "' target='_blank'>check out last.fm.</a>");

    })

  }

  /**
   * Toggles highlight of a specified country
   * @param  {Boolean} highlight      Specifies whether to highlight or "dehighlight"
   * @param  {Object} countryElement The country element to highlight (needs to have an "id" property)
   */
  function highlightCountry(highlight, countryElement) {
    d3.selectAll(".country").classed("highlighted", false);

    if (highlight) {
      // Fade out all other countries
      d3.selectAll(".country").transition()
        .style("opacity", function() {
          return (+this.id === +countryElement.id ? 1.0 : 0.3);
        })

      var ce = d3.select(document.getElementById("" + countryElement.id)); // d3 can't select ids that are only numbers
      ce.classed("highlighted", true);
    } else {
      // Fade in all countries
      d3.selectAll(".country").transition()
        .style("opacity", 1.0)
    }

  }

  function clicked(d) { //d är det en har klickat på

    var x, y, k;
    //bounding box for clicked country
    var b = path.bounds(d);

    getCountryPlaycount(d);

    //Set scale
    var modscaleX = (b[1][0] - b[0][0]);
    var modscaleY = (b[1][1] - b[0][1]);

    //Dom't zoom too far with small countries!
    if (modscaleX < 80)
      modscaleX = 80;

    //Landet är inte centrerat redan
    if (d && centered !== d) {
      centered = d;
      removeArtistDiv();
      makeArtistDiv(d);
      highlightCountry(true, d);


      //Special rules for special countries:
      switch (d.id) {
        case 840: //US
          k = 3;
          x = -(b[1][0] + b[0][0]) / 3;
          y = -(b[1][1] + b[0][1]) / 1.7;
          break;
        case 250: //France
          k = 7.012;
          x = -(b[1][0] + b[0][0]) / 1.8;
          y = -(b[1][1] + b[0][1]) / 3.4;
          break;
        case 528: //Netherlands
          k = 9.0124;
          x = -(b[1][0] + b[0][0]) / 1.5;
          y = -(b[1][1] + b[0][1]) / 3.3;
          break;
        case 643: //Russia
          k = 1.9;
          x = -(b[1][0] + b[0][0]) / 1.25;
          y = -(b[1][1] + b[0][1]) / 2;
          break;
        case 554: //New Zeeland
          k = 4;
          x = -(b[1][0] + b[0][0]) / 0.90;
          y = -(b[1][1] + b[0][1]) / 1.8;
          break;
        case 36: //Australia
          k = 3.3;
          x = -(b[1][0] + b[0][0]) / 1.8;
          y = -(b[1][1] + b[0][1]) / 2.1;
          break;

        default: //Everybody else
          k = .55 / Math.max(modscaleX / width, modscaleY / height);
          x = -(b[1][0] + b[0][0]) / 2 - (width / k) / 4;
          y = -(b[1][1] + b[0][1]) / 2;
          break;
      }

      //Landet är redan centrerat
    } else {
      x = -width / 2;
      y = -height / 2 - height * 0.08;
      k = 1
      removeArtistDiv();
      highlightCountry(false);
      centered = null;

      //detailsDiv.classed("hidden", true);
    }

    var pt = projection.translate();
    // Tell map to move with animation
    // Basically does the same as before: translate to middle,
    // then to x and y with respect to scale
    move([pt[0] + x * k, pt[1] + y * k], k, true);

  }

  //function to add points and text to the map (used in plotting capitals)
  function addpoint(lat, lon, text) {

    var gpoint = g.append("g").attr("class", "gpoint");
    var x = projection([lat, lon])[0];
    var y = projection([lat, lon])[1];

    gpoint.append("svg:circle")
      .attr("cx", x)
      .attr("cy", y)
      .attr("class", "point")
      .attr("r", 1.5);

    //conditional in case a point has no associated text
    if (text.length > 0) {

      gpoint.append("text")
        .attr("x", x + 2)
        .attr("y", y + 2)
        .attr("class", "text")
        .text(text);
    }

  }

  /** "PUBLUC" FUNCTIONS **/
  map.putCountryCount = function(object) {
    countryCount = JSON.parse(JSON.stringify(object));
    countryScore = 0;
    var countryList = [];

    // Extract info for the current user
    d3.keys(countryCount).forEach(function(id) {
      if (countryCount[id][SESSION.name]) {
        countryCount[id] = countryCount[id][SESSION.name];
        countryScore = countryScore + 1;
        countryList.push(+id)
      } else {
        // delete countryCount[id];
      }
    })

    if (topo) redraw();

    window.countryScore = countryScore;

  }
})(window, document)