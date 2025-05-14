/* requires:
api/api.js
api/lastfm.js
script.js
aria-announcer.js
keyboard-mode.js
*/
var map = {};
//White theme default:
var colorArray = ["#feebe2", "#feebe2", "#fcc5c0", "#fa9fb5", "#f768a1", "#dd3497", "#ae017e", "#7a0177"];
var legend;
var countryScore = 0;
let currentPage = 1;
let itemsPerPage = 5;
let artists = []; // Your artists data goes here
let currentZoom = 1;
const MAX_ZOOM = 25;

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Update the COUNTRY_BBOX_OVERRIDES constant
const COUNTRY_BBOX_OVERRIDES = {
  // Format: [west, south, east, north]
  // US territories as multiple boxes
  '840': [
    [-125, 24, -66, 50],  // Continental US
    [-180, 51, -130, 72], // Alaska
    [-160, 18, -154, 23], // Hawaii
  ],
  // Russia - adjusted boundaries
  '643': [
    [27.5, 41.0, 180.0, 82.0],   // Main Russian territory (European + Asian)
    [-180.0, 60.0, -169.0, 71.0], // Far Eastern part (crosses the date line)
  ],
  // Chile - mainland only, excluding Pacific islands
  '152': [
    [-75.6, -55.9, -66.0, -17.5],  // Chilean mainland
    [-109.5, -27.2, -109.2, -27.0], // Easter Island (Rapa Nui)
    [-80.8, -33.8, -80.0, -33.3]    // Juan Fernández Islands
  ],
  // Ecuador - mainland only, excluding Galápagos
  '218': [
    [-81.5, -5.0, -75.0, 1.5],   // Ecuadorian mainland
    [-92.0, -1.4, -89.2, 1.7]     // Galápagos Islands
  ],
  // Spain - mainland and islands
  '724': [
    [-9.3, 36.0, 3.4, 43.8],     // Iberian Peninsula (mainland Spain)
    [-18.2, 27.6, -13.3, 29.5],   // Canary Islands
    [1.2, 38.6, 4.4, 40.1]        // Balearic Islands
  ],
  // Portugal
  '620': [
    [-9.5, 36.8, -6.2, 42.2],     // Continental Portugal (mainland)
    [-31.3, 32.6, -16.2, 39.7]     // Atlantic islands (Azores and Madeira)
  ],
  // France - mainland and overseas territories
  '250': [
    [-5.1, 41.3, 9.6, 51.1],     // Metropolitan France (mainland)
    [-54.6, 2.1, -51.6, 5.8],     // French Guiana
    [55.2, -21.4, 55.8, -20.8],   // Réunion
    [-61.2, 14.4, -60.8, 14.9],   // Martinique
    [-61.8, 15.8, -61.0, 16.5],   // Guadeloupe
    [8.5, 41.3, 9.6, 43.0]        // Corsica
  ],
  // Netherlands - mainland and Caribbean territories
  '528': [
    [3.3, 50.7, 7.2, 53.6],      // Mainland Netherlands
    [-69.2, 12.0, -68.2, 12.4],   // Aruba
    [-69.0, 11.9, -68.2, 12.4],   // Curaçao
    [-63.2, 17.9, -62.9, 18.1]    // Sint Maarten
  ],
  // New Zealand - main islands
  '554': [
    [166.0, -47.5, 179.0, -34.0],  // Main islands (North and South)
    [172.5, -43.9, 173.9, -40.5],  // Chatham Islands
  ],
  // Fiji - main island group (corrected)
  '242': [
    [177.0, -21.0, 180.0, -16.0],  // Western islands (up to the date line)
    [-180.0, -21.0, -178.0, -16.0], // Eastern islands (from the date line)
  ],
  // Kiribati - three island groups spread across the Pacific
  '296': [
    [172.0, -3.0, 177.0, 5.0],      // Gilbert Islands (western group)
    [-175.0, -11.5, -170.0, -5.0],   // Phoenix Islands (central group)
    [-160.0, -5.0, -150.0, 12.0],    // Line Islands (eastern group)
  ],
  // Add other countries as needed
};

map.COUNTRY_BBOX_OVERRIDES = COUNTRY_BBOX_OVERRIDES;

// At the top, after requires or before main logic
window.lastInputWasKeyboard = false;

// Listen for keyboard and mouse input globally
window.addEventListener('keydown', function(e) {
  // Only set for navigation/keyboard mode relevant keys
  if ([37,38,39,40, 65, 76, 27, 13, 32].includes(e.keyCode) || (e.key >= '0' && e.key <= '9')) {
    window.lastInputWasKeyboard = true;
  }
});
window.addEventListener('mousedown', function() { window.lastInputWasKeyboard = false; });
window.addEventListener('click', function() { window.lastInputWasKeyboard = false; });
window.addEventListener('wheel', function() { window.lastInputWasKeyboard = false; });

(function(window, document) {
  d3.select(window).on("resize", throttle);

  var doThrottle = false;
  var filter = "artists"; // filter by artists or plays

  var zoom = d3.behavior.zoom()
    .scaleExtent([1, MAX_ZOOM])
    .on("zoom", move);


  var height, width;

  var topo, projection, path, svg, g, countryNames, rateById, centered, active;
  let countryCount = {};
  let countryDivIsOpen = false;
  let currentNoArtists = 0;
  let currentCount = 0;
  let currentCountry = null;

  //Variables needed to update scale and legend
  var mydomain = [0, 1, 2, 3, 4, 5, 6];
  var maxartists = 1,
    maxplaycount = 0;

  //Setting color and range to be used
  var color;


  // Set theme
  const defaultTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "blue_black" : "pink_white";
  var theme = window.localStorage.theme || defaultTheme;

  map.drawPlays = function() {
    filter = "scrobbles";
    redraw();
  };

  let countryPlaylists; 
  // load links to country playlists
  d3.json("assets/data/playlists.json", (err, list) => {
    countryPlaylists = list;
  });  

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
      for (let i = 0; i < countryCount[c.id].length; i++) {
        count += countryCount[c.id][i].playcount;
      }
      return count;
    } else return 0;
  };


  function updateProgressBar() {
    var progressPro = (countryScore / 210);
    return progressPro;
  }
;

  //Function to format numbers over 1000 with a space
  function numbersWithSpace(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }
  /**
   * Randomize array element order in-place.
   * Using Fisher-Yates shuffle algorithm.
   */
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
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
        for (let i = 0; i < 5; i++) {
          mydomain[i] = Math.pow(Math.E, (Math.log(max) / 6) * (i + 1));
        }
        mydomain = [0, 1, mydomain[0], mydomain[1], mydomain[2], mydomain[3], mydomain[4]];
        break;
      case "scrobbles":
        max = maxplaycount;
        for (let i = 0; i < 7; i++) {
          mydomain[i] = Math.pow(Math.E, (Math.log(max) / 7) * (i + 1))
        }
        mydomain = [0, 1, mydomain[1], mydomain[2], mydomain[3], mydomain[4], mydomain[5]];
        break;
    };


    color = d3.scale.threshold()
      .domain(mydomain)
      .range(colorArray);
  };

  function updateLegend() {
    //Remove decimals from domain
    var x = 0;
    var len = mydomain.length
    while (x < len) {
      mydomain[x] = Math.ceil(mydomain[x]);
      x++;
    };

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
    });

    var noCountryArtists = d3.select(".no-countries")
      .style("bottom", (y + mydomain.length * ls_h + 1.5 * ls_h + 30) + "px"); // <<< magic numbers broo

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
  //Variables for color legend

  var tooltip = d3.select("#map-container").append("div").attr("class",
    "tooltip hidden").attr("aria-hidden", "true");

  var infoContainer = d3.select("main").append("div")
  .attr("class","infoContainer hidden")
  .attr("id", "infoContainer")
  .attr("role", "region")
  .attr("aria-labelledby", "music-from cname-heading")

    var cnameDiv = d3.select("#infoContainer").append("div").attr("class",
  "cnameDiv").attr("id", "cname");
  
    var artistContainer = d3.select("#infoContainer").append("div").attr("class",
    "artistContainer").attr("id", "artistContainer");


  var detailsDiv = d3.select("#artistContainer").append("div").attr("class",
    "detailsDiv").attr("id", "details");

  var recoDiv = d3.select("#artistContainer").append("div").attr("class",
    "recoDiv").attr("id", "recommendations");

  var artistSummaryDiv = d3.select("#artistContainer").append("div").attr("class",
    "artistSummaryDiv").attr("id", "summary");

  var closeButton;

  var offsetL;
  var offsetT;

  //---------------------- Color preferences -------------//
  var themes = {
    blue_black: ["#03020D", "#140E1F", "#2A075A", "#321C78", "#362688", "#3E3CA7", "#4651C5", "#5371F4"],
    green_black: ["#03020D", "#08120C", "#032F30", "#064137", "#0E6745", "#158C54", "#1CB162", "#28EA78"],
    pink_black: ["#03020D", "#1F0310", "#4B0627", "#5C1138", "#7E285C", "#A13F80", "#C355A4", "#F778DA"],
    pink_white: ["#feebe2", "#feebe2", "#fcc5c0", "#fa9fb5", "#f768a1", "#dd3497", "#ae017e", "#7a0177"],
    green_white: ["#ece2f0", "#F6EBFA", "#ccece6", "#99d8c9", "#66c2a4", "#41ae76", "#238b45", "#006d2c"],
    red_white: ["#F0F0D8", "#F0F0D8", "#feb24c", "#fd8d3c", "#fc4e2a", "#e31a1c", "#bd0026", "#800026"],
  };

  let nextTheme = window.nextTheme = function(toTheme) {
    // Go to next theme
    var themeList = d3.keys(themes);
    theme = toTheme || themeList[(themeList.indexOf(theme) + 1) % themeList.length];
    colorArray = themes[theme];

    // Change body class
    let bodyClass = ["blue_black", "green_black", "pink_black"].includes(theme) ? "dark" : "light";
    bodyClass += " " + theme;
    d3.select(document.body).attr("class", bodyClass);

    // Save :)
    window.localStorage.theme = theme;

    // Redraw map :)
    if (topo) redraw();

    // Annunce to screen readers
    announcer.announce(`Theme changed to ${theme}`);
  }
  map.nextTheme = nextTheme;

  nextTheme(theme);
  updateScale();
  updateDimensions();
  setup(width, height);
  keyboardMode.init(zoom, move, width, height, MAX_ZOOM);

  function setup(width, height) {
    projection = d3.geo.naturalEarth()
      .translate([(width / 2), (height / 2) + height * 0.08])
      .scale(width / 1.7 / Math.PI);

    path = d3.geo.path().projection(projection);
    
    // Export path and projection for use in keyboard-mode.js
    map.path = path;
    map.projection = projection;

    svg = d3.select("#map-container")
      .attr("role", "application")
      .append("svg")
      .attr("role", "img")
      .attr("tabindex", "0")
      .attr("aria-labelledby", "map-label")
      // .attr("aria-describedby", "map-hint")
      .attr("id", "map-svg")
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

    map.zoom = zoom; // Export the zoom behavior
  }

  //Load country aliases and names
  api.getCountriesData().then(countries => (map.countryNames = countryNames = countries));
  
  //Load map
  d3.json("assets/data/world-50m.json", function(error, world) {

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
        .transition().duration(prefersReducedMotion ? 0 : 150).style("opacity", 0.9);
    })
      .on("mouseout", function() {
        d3.select("#progress-text").transition().duration(prefersReducedMotion ? 0 : 150).style("opacity", 0);
      });
    d3.select("#progress-text").html("Scrobbled from " + countryScore + "/210 countries").attr("aria-hidden", "true");

    //Draw countries
    if (redrawMap) {
      country.enter().insert("path")
        .attr("class", "country")
        .attr("d", path)
        .attr("id", function(d, i) {
          return `c${d.id}`;
        })
        .attr("title", function(d, i) {
          return d.properties.name;
        })
        .attr("data-center-x", function(d, i) {
          return getCountryCenter(d).x;
        })
        .attr("data-center-y", function(d, i) {
          return getCountryCenter(d).y;
        })
        .style("fill", function() {
          return color(0);
        })
        .style("transform-origin", function (d) {
          const center = getCountryCenter(d);
          return `${-center.x}px ${-center.y}px`;
        });
    }
    //Color countries
    country.transition().style("fill", function(d) {
      switch (filter) {
        case "artists":
          return countryCount[d.id] ? color(countryCount[d.id].length) :
            color(0);
          //break;
        case "scrobbles":
          return color(getCountryPlaycount(d));
      }
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
      })
      //Show div with top 10 artists for country when clicked
      .on("click", function(d, i) {
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
            removeArtistDiv();
            // zoom out map, fulhack
            clicked(centered);
            // Restore focus to the img
            d3.select('#map-svg').node().focus();
          }) //"stäng" onclick slutar
      }) // on click slutar

  }

  /*-------redraw----*/
  //den kallas varje gång datan uppdateras. redrawMap är en boolean
  function redraw(redrawMap) {
    updateDimensions();

    if (redrawMap) {
      d3.select('#map-svg').remove();
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
   * @param  {Boolean} withKeyboard If the move was initiated by the keyboard
   */
  function move(tr, sc, animate, withKeyboard) {
    // Check if we should activate keyboard mode
    if (sc >= MIN_ZOOM_LEVEL_FOR_KEYBOARD_MODE) {
      if (window.lastInputWasKeyboard) {
        keyboardMode.updateVisibleCountries(zoom);
      } else {
        keyboardMode.cleanup();
      }
    } else {
      keyboardMode.cleanup();
    }
    
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
      g.transition().duration(prefersReducedMotion ? 0 : 950).attr("transform", "translate(" + t + ")scale(" + s + ")");

    } else {
      g.attr("transform", "translate(" + t + ")scale(" + s + ")");
    }

    //adjust the country hover stroke width based on zoom level
    d3.selectAll(".country").style("stroke-width", 1.5 / s);

    window.triggerAuditoryFeedback();
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

  function showArtists(pageNumber, itemsPerPage) {
    const start = (pageNumber - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = artists.slice(start, end);

    // Clear the details section
    d3.selectAll(".artist-li").remove();

    // Append the artists to the details section
    pageItems.forEach(artist => {
      var artistDiv = d3.select("#top-artist-list")
      .append("li")
        .attr("class", "artist-li")
      .append("button")
        .attr({
          "class": `scrobbled artist-div lowlight`,
          "data-artist": artist.artist
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
          d3.selectAll(".artist-div").attr("aria-pressed", "false");
          d3.select(this).attr("aria-pressed", "true");

          makeSummaryDiv(d3.select(this).attr("data-artist"), []);
        });
      
      var artistLink = artistDiv.append("div").style("display", "block")
      artistLink.append("div")
        .attr("class", "artist-image image-div");

      var playCountDiv = artistDiv.append("div").attr("class", "play-count-div");

      playCountDiv.append("p")
        .html("<strong>" + artist.artist + "</strong><br>" + artist.playcount + " scrobbles")
        .attr("class", "details-p");
    });

    // Update the state of the navigation buttons
    d3.select(".artist-control.left").attr("disabled", currentPage === 1 ? "disabled" : null);
    d3.select(".artist-control.right").attr("disabled", currentPage === Math.ceil(artists.length / itemsPerPage) ? "disabled" : null);
}

  function showNextFive() {
      if (currentPage < artists.length / itemsPerPage) {
          currentPage++;
          showArtists(currentPage, itemsPerPage);
          // Give feedback to screen readers
          announcer.announce("Showing next five artists", "polite");
          //Send event to google analytics
          ga('send', {
            hitType: 'event',
            eventCategory: 'Artist viewer',
            eventAction: 'Next five',
            eventLabel: 'test'
          });
      }
  }

  function showPreviousFive() {
      if (currentPage > 1) {
          currentPage--;
          showArtists(currentPage, itemsPerPage);
          // Give feedback to screen readers
          announcer.announce("Showing previous five artists", "polite");
          //Trigger GA event
          ga('send', {
            hitType: 'event',
            eventCategory: 'Artist viewer',
            eventAction: 'Previous five',
            eventLabel: 'test'
          });
      }
  }

  function searchArtist(name) {
    const index = artists.findIndex(artist => artist.artist.toLowerCase() === name.toLowerCase());

    if (index !== -1) {
        currentPage = Math.floor(index / itemsPerPage) + 1;
        showArtists(currentPage, itemsPerPage);
        setTimeout(() => {
          const artist = document.querySelector(`[data-artist="${name}"]`);
          artist?.click();
          setTimeout(() => {
            artist?.focus();
          }, 50); 
        }, 250);
    }
  }

  /*----------------------------makeArtistDiv------------------------------------------------*/
  //Skapar "details-on-demand"-divarna.
  // d är det land vi klickat på
  // artistName är ett artistnamn vi vill zooma in på
  function makeArtistDiv(d) {

    countryDivIsOpen = true;
    currentCountry = d;

    //lägga till namn till detailseDiv
    var name;
    var tag;
    var nameTags;
    var tagTags;
    var recoms;
    //var id;
    countryNames.forEach(function(e, i) {
      if (e.id === d.id) {
        name = e.name;
        tag = e.tag;

        nameTags = (e.names || [e.name]).map(n => "<span class=\"demonym\">" + n + "</span>").join(", ");
        tagTags = (e.tags || [e.tag]).map(t => "<span class=\"demonym\">" + t + "</span>").join(", ");
      };
    })
    d3.select("#recommendations").html("");
    //Show country name and info div on left hand side
    infoContainer
      .classed("hidden", false)
      .transition()
      .style("opacity", 1)
      .duration(prefersReducedMotion ? 0 : 750);

    //Hide progressbar when showing
    d3.selectAll("#countryCount, .on-map-view")
      .classed("hidden", true);

    closeButton = d3.select('#infoContainer').append("button").attr("type", "button").attr("aria-label", `Close ${name}`).attr("class", "close-button fa fa-xmark");

    //Populate country information div
    cnameDiv
      .append("div").attr("class", "cnameContainer").attr("id", "cnameCont")
      .append("h1").html(name)
      .attr("id", "cname-heading");
    d3.select("#cnameCont").append("strong")
      .html(function() {
        if (countryCount[d.id])
          return numbersWithSpace(countryCount[d.id].length) + " artists, " + numbersWithSpace(getCountryPlaycount(d)) + " scrobbles"
        else return "No artists yet - Find new here<span aria-hidden> -></span>"
      })

    let pl = countryPlaylists.find(c => c.name === name);
    let linkdiv = d3.select("#cnameCont")
      .append("div").attr("class", "playlist-link")

   let lastFmLink =  linkdiv.append("a").attr("href", "https://last.fm/tag/" + name)
   lastFmLink.append("img").attr("alt", "Last.fm tag").attr("class", "playlist-link__img").attr("src", "https://www.shareicon.net/data/32x32/2016/05/24/769923_logo_512x512.png").attr("style","background:none");
   lastFmLink.append("span").html("#"+name);

    if (pl) {

      linkdiv.append("span").attr("class","divider").html("/").attr("aria-hidden", "true");

      let a = linkdiv.append("a").attr("href", pl.uri).attr("target", "_self");

      a.append("img")
        .attr("alt", "Spotify playlist")
        .attr("class", "playlist-link__img")
        .attr("src", "https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg");

      a.append("span").html(pl.playlistName);

    }

    if (countryCount[d.id]) { //Om landet vi klickat på har lyssnade artister.

      d3.select("#details").append("h2")
        .html("<span>Your top artists tagged with </span>" + nameTags + "<span> or </span>" + tagTags + "<span>: </span>")
        .attr("class", "topartists-desc").attr("id", "top-artist-list-heading");
      
        currentPage = 1;
        itemsPerPage = 5;
        artists = countryCount[d.id]; // Your artists data goes here
        d3.select("#details").append("div").attr("id", "top-artist-list-container");

        d3.select("#top-artist-list-container").append("ol").attr("id", "top-artist-list").attr("aria-labelledby", "top-artist-list-heading");
      
        d3.select("#top-artist-list-container").append("button").attr("class", "fa artist-control left fa-angle-left").attr("aria-label", "Previous five artists");
        d3.select("#top-artist-list-container").append("button").attr("class", "fa artist-control right fa-angle-right").attr("aria-label", "Next five artists");
        
        // Event listeners for the navigation buttons
        d3.select(".artist-control.left").on("click", showPreviousFive);
        d3.select(".artist-control.right").on("click", showNextFive);
        
        
        // Initial display of artists
        showArtists(currentPage, itemsPerPage);


    } else { //Om landet vi klickat på inte har några lyssnade artister...
      // console.log("landet har inga lyssnade artister");
    }
    //"Recommended"-heading
    d3.select("#recommendations")
    .append("h2")
      .html("You may like: ")
      .attr("id", "recom-heading")
      .attr("class", "topartists-desc");
    d3.select("#recommendations")
      .append("ul")
        .attr("id", "recom-list")
        .attr("aria-labelledby", "recom-heading")
        .classed("hidden", false);

    // show loading message
    var recLoadingDiv = d3.select("#recommendations").append("div").attr("class", "recLoadingDiv");
    var recLoadingMessage = recLoadingDiv.append("span")
      .attr("id", "rec-loading")
      .html("Looking for artists tagged #" + tag);
    recLoadingDiv.append("img")
      .attr({
        id: "rec-loading-img",
        src: "assets/img/loader_horizontal.gif",
        alt: "Loading..."
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
        for (let i = 0; i < list.length; i++)
          arr[list[i]['name']] = list[i];

        list = new Array();
        for (let key in arr)
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
            href: "https://www.last.fm/tag/" + name,
            target: "_blank",
          }).html("Try searching last.fm yourself!");
        }

        for (let i = 0; i < Math.min(list.length, 5); i++) {
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


            var recoArtistDiv = d3.select("#recom-list")
              .append("li")
              .insert("button", "#summaryText")
              .attr("type", "button")
              .attr("class", "artist-div lowlight");
            var recoArtistLink = recoArtistDiv.append("div").style("display", "block")
              //.attr("href", artisturl)
              //.attr("target", "_blank");
            recoArtistLink.append("div")
              .attr("class", "image-div")
              .style("background-image", "url(" + "'" + artistimg + "'" + ")")

            var recoArtistInfoDiv = recoArtistDiv.append("div").attr("class", "recoArtistInfoDiv");

            recoArtistInfoDiv.append("p")
              .html(artistname)
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
    countryDivIsOpen = false;
    currentCountry = null;
    api.cancelRecommendationRequests();

    infoContainer.transition().style("opacity", 0).duration(prefersReducedMotion ? 0 : 1000);

    infoContainer.classed("hidden", true);

    // Restore toolbar
    d3.selectAll("#countryCount, .on-map-view")
      .classed("hidden", false);

    d3.select("#details").html("");
    d3.select("#recommendations").html("");
    d3.select("#cname").html("");
    d3.selectAll(".artist-control").remove();
    d3.select(".close-button").remove();
    d3.selectAll("#top-artist-list").remove();
  }

  function makeSummaryDiv(artistname) {
    var usertaglist = [];
    var artisttaglist = [];

    d3.select("#summaryText").remove();
    var summaryText = d3.select("#recommendations").append("div").attr("class", "summaryText").attr("id", "summaryText");
    d3.select("#summaryText").append("span").html("Loading description of " + artistname);
    d3.select("#summaryText").append("img")
      .attr({
        id: "sum-loading-img",
        src: "assets/img/loader_horizontal.gif"
      })
      .style({
        display: "inline-block",
        margin: "0 5px"
      });

    //Get artist info from Lastfm
    api.getArtistInfo(artistname, function(art) {
      var paragraphs = art[0].description.split(/(\n)+/g);
      //var text = text.substring(6);
      //Get artist's top tags
      artisttaglist = art[0].tags;
      //Create list of user tags

      //Make list of artist tags which are also user's top tags:
      for (let y = 0; y < 15; y++) {
        for (let z = 0; z < artisttaglist.length; z++) {
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

      summaryText.append("h2").html(artistname).attr("id", "artistname");

      const tags = summaryText.append("ul").attr("class", "taglist").attr("aria-labelledby", "tags-for artistname");

      //Show top 7 tags
      for (let i = 0; i < Math.min(taglist.length, 6); i++) {
        var tagdiv = tags.append("li").attr("class", "tagdiv").html(taglist[i]);
        //Mark all user tags
        for (let p = 0; p < usertaglist.length; p++) {
          if (taglist[i] === usertaglist[p])
            tagdiv.classed("usertag", true);
        }
      }
      //Display artist summary
      paragraphs.forEach(function(paragraph) {
        summaryText.append("p").html(paragraph || "No description available - <a href='https://last.fm/music/" + artistname + "' target='_blank'>check out last.fm.</a>");
      });

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
          return (this.id === `c${countryElement.id}` ? 1.0 : 0.3);
        })

      var ce = d3.select(document.getElementById(`c${countryElement.id}`));
      ce.classed("highlighted", true);
    } else {
      // Fade in all countries
      d3.selectAll(".country").transition()
        .style("opacity", 1.0)
    }
}


  function clicked(d) { //d är det en har klickat på
    if (window.keyboardMode && window.keyboardMode.getStatus && window.keyboardMode.getStatus()) {
        window.keyboardMode.cleanup();
    }

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

      announcer.announce(`Opened ${countryNames.find(c => c.id === d.id).name}. Use TAB key to find scrobbled artists.`, "assertive");

      //Special rules for special countries:
      switch (d.id) {
        case 840: //US
          k = 3;
          x = -(b[1][0] + b[0][0]) / 3;
          y = -(b[1][1] + b[0][1]) / 1.7;
          break;
        case 250: //France
          k = 7.012;
          x = -(b[1][0] + b[0][0]) / 1.85;
          y = -(b[1][1] + b[0][1]) / 3;
          break;
        case 528: //Netherlands
          k = 12.0124;
          x = -(b[1][0] + b[0][0]) / 1.56;
          y = -(b[1][1] + b[0][1]) / 2.7;
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
      announcer.announce(`Left ${countryNames.find(c => c.id === d.id).name}`, "polite");
      x = -width / 2;
      y = -height / 2 - height * 0.08;
      k = 1
      removeArtistDiv();
      highlightCountry(false);
      centered = null;
      // Refocus the map svg (mainly for screen readers)
      document.getElementById("map-svg").focus( { 
        preventScroll: true
       } );

    }

    var pt = projection.translate();
    // Tell map to move with animation
    // Basically does the same as before: translate to middle,
    // then to x and y with respect to scale
    move([pt[0] + x * k, pt[1] + y * k], k, !prefersReducedMotion);

  }

function dismissCenteredCountry() {
  if (centered) {
    const countryName = countryNames.find(c => c.id === centered.id).name;
    announcer.announce(`Left ${countryName}`, "polite");
  }
  removeArtistDiv();
  highlightCountry(false);
  centered = null;
}

// Add this helper function
function getBBoxCenter(bbox) {
  const [west, south, east, north] = bbox;
  // For countries that cross the date line, handle the longitude calculation specially
  const centerLon = west > east ? (west + east + 360) / 2 % 360 : (west + east) / 2;
  const centerLat = (north + south) / 2;
  return [centerLon, centerLat];
}

// Modify the getCountryCenter function
function getCountryCenter(countryTopoData) {
  // Check if we have a custom bounding box for this country
  const countryId = countryTopoData.id;
  if (COUNTRY_BBOX_OVERRIDES && COUNTRY_BBOX_OVERRIDES[countryId]) {
    // Use the first bounding box for the center (usually the main territory)
    const overrides = COUNTRY_BBOX_OVERRIDES[countryId];
    const mainBBox = Array.isArray(overrides[0]) ? overrides[0] : overrides;
    
    // Calculate the center of the bounding box
    const center = getBBoxCenter(mainBBox);
    
    // Project the center to screen coordinates
    const projected = projection(center);
    return {
      x: -projected[0],
      y: -projected[1]
    };
  }
  
  // Fall back to the existing logic for countries without overrides
  let x, y;
  let b = path.bounds(countryTopoData);

  //Special rules for special countries:
  switch (countryTopoData.id) {
    case 840: //US
      x = -(b[1][0] + b[0][0]) / 4;
      y = -(b[1][1] + b[0][1]) / 1.9;
      break;
    case 250: //France
      x = -(b[1][0] + b[0][0]) / 1.94;
      y = -(b[1][1] + b[0][1]) / 2.81;
      break;
    case 528: //Netherlands
      x = -(b[1][0] + b[0][0]) / 1.605;
      y = -(b[1][1] + b[0][1]) / 2.54;
      break;
    case 643: //Russia
      x = -(b[1][0] + b[0][0]) / 1.40;
      y = -(b[1][1] + b[0][1]) / 2;
      break;
    case 554: //New Zeeland
      x = -(b[1][0] + b[0][0]) / 1.03;
      y = -(b[1][1] + b[0][1]) / 1.87;
      break;
    case 36: //Australia
      x = -(b[1][0] + b[0][0]) / 2;
      y = -(b[1][1] + b[0][1]) / 2.1;
      break;

    default: //Everybody else
      x = -(b[1][0] + b[0][0]) / 2;
      y = -(b[1][1] + b[0][1]) / 2;
      break;
  }

  return { x, y };
}

  // Close the country div on escape
  window.addEventListener('keydown', function(evt) {
    if ((evt.key === 'Escape' || evt.keyCode === 27) && countryDivIsOpen) {
      console.log("Escape pressed");
      removeArtistDiv();
      // zoom out map, fulhack
      clicked(centered);
    }
  });

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

  function animateCountries(countryDict) {
    const userPrefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var countries = g.selectAll(".country").filter(c => !!countryDict[c.id]);

    setTimeout(() => {
      // bounce - didn't look too good but might be fun to try again
      // later
      
      // countries.transition()
      // .duration(200)
      // .style("transform", "scale(1.1)")
      // .delay((_, i) => i * 100)
      // .transition().duration(150)
      // .style("transform", "scale(1)");

      // fade
      // Only do the bing bong thing if the user doesn't prefer reduced motion
      if (!userPrefersReducedMotion) {
        countries.transition()
        .duration(200)
        .style("opacity", "0.8")
        .delay((_, i) => i * 100)
        .transition().duration(150)
        .style("opacity", "1");
      }
      
    })
  }

  function putCountryCount(newArtists) {
    Object.entries(newArtists).forEach(([key, value]) => {
      countryCount[key] = (countryCount[key] || []).concat(value);
    });

    countryScore = 0;

    d3.keys(countryCount).forEach(function (id) {
      countryScore = countryScore + 1;
    })

    if (topo) redraw();

    window.countryScore = countryScore;
  }

  /** "PUBLUC" FUNCTIONS **/
  
  map.addArtists = function (newArtistsByCountry) {
    putCountryCount(newArtistsByCountry);
    animateCountries(newArtistsByCountry);
  }

  map.getCountryCenter = getCountryCenter;

  map.makeSummaryDiv = makeSummaryDiv;

  map.showArtists = showArtists;

  map.searchArtist = searchArtist;

  map.centered = centered;

  map.dismissCenteredCountry = dismissCenteredCountry;

  map.toggleFilter = function() {
    filter = filter === "artists" ? "scrobbles" : "artists";
    updateLegend();
    redraw();
  }

  // Find the function that handles the zoom/fit behavior, likely something like:
  function fitToCountry(countryFeature) {
    if (countryFeature.id && COUNTRY_BBOX_OVERRIDES[countryFeature.id]) {
      const overrides = COUNTRY_BBOX_OVERRIDES[countryFeature.id];
      const boxArray = Array.isArray(overrides[0]) ? overrides : [overrides];
      
      // Find the overall bounding box that encompasses all boxes
      const allBounds = boxArray.reduce((acc, bbox) => {
        const [west, south, east, north] = bbox;
        return {
          west: Math.min(acc.west, west),
          south: Math.min(acc.south, south),
          east: Math.max(acc.east, east),
          north: Math.max(acc.north, north)
        };
      }, {west: 180, south: 90, east: -180, north: -90});
      
      const bounds = [[allBounds.west, allBounds.south], [allBounds.east, allBounds.north]];
      
      // Use your existing zoom/fit logic with these bounds
      const [[x0, y0], [x1, y1]] = bounds;
      const dx = x1 - x0;
      const dy = y1 - y0;
      const x = (x0 + x1) / 2;
      const y = (y0 + y1) / 2;
      const scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height)));
      
      // Apply the transform
      svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(scale)
          .translate(-projection([x, y])[0], -projection([x, y])[1]));
        
      return; // Skip the regular bounds calculation
    }
    
    // ... rest of existing fitToCountry code ...
  }

  function handleKeyboardNavigation(event) {
    if (!isKeyboardModeEnabled) return;
    
    switch(event.key) {
        case 'ArrowRight':
        case 'ArrowLeft':
            // Move focus to next/previous country
            const countries = getVisibleCountries();
            const currentIndex = countries.indexOf(currentFocus);
            const nextIndex = event.key === 'ArrowRight' ? 
                (currentIndex + 1) % countries.length :
                (currentIndex - 1 + countries.length) % countries.length;
            setFocus(countries[nextIndex]);
            break;
            
        case 'Enter':
        case ' ': // Space
            // Select currently focused country
            selectCountry(currentFocus);
            break;
    }
  }

  // Update the setupAuditoryFeedbackForMap function to only trigger on keyboard navigation
  function setupAuditoryFeedbackForMap() {
    // Remove the automatic triggers on zoom/pan
    
    // Only trigger feedback when new data is loaded
    document.addEventListener("artistsLoaded", function() {
      if (window.auditoryFeedback) {
        window.auditoryFeedback.updateFeedback();
      }
    });
    
    // Create a custom event dispatcher to trigger feedback manually if needed
    window.triggerAuditoryFeedback = function() {
      if (window.auditoryFeedback) {
        window.auditoryFeedback.updateFeedback();
      }
    };
    
    // Remove the automatic trigger in the move function
  }

  // Call this after your map is initialized
  setupAuditoryFeedbackForMap();

  // Add this to the public API section at the bottom of the file
  map.getColorDomain = function() {
    return mydomain; // This is the array that defines the color thresholds
  };

})(window, document)
