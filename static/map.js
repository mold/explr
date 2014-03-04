var map = {};

(function(window, document) {
  d3.select(window).on("resize", throttle);

  var doThrottle = false;

  var zoom = d3.behavior.zoom()
    .scaleExtent([1, 9])
    .on("zoom", move);

  var width = document.getElementById('map-container').offsetWidth;
  var height = width / 1.8;

  var topo, projection, path, svg, g, test, test2, c2, rateById, centered, active;
  countryCount = {};

  var color = d3.scale.threshold()
    .domain([0, 1, 5, 10, 50, 100])
    .range(["#f2f0f7", "#f6f6f6", "#fdd0a2", "#fdae6b", "#fd8d3c", "#e6550d",
      "#a63603"]);
  //Variables for color legend
  var ext_color_domain = [0, 1, 5, 10, 50, 100]
  var legend_labels = ["0", "1-4", "5-9", "10-49", "50-99", "100+"]

  var tooltip = d3.select("#map-container").append("div").attr("class",
    "tooltip hidden");

  var detailsDiv = d3.select("#map-container").append("div").attr("class",
    "detailsDiv hidden").attr("id", "details");


  var closeButton = d3.select('#details').append("button").attr("type", "button").attr("class", "close-button").html("X");



  setup(width, height);

  function setup(width, height) {

    projection = d3.geo.naturalEarth()
      .translate([(width / 2), (height / 2)])
      .scale(width / 1.7 / Math.PI);

    path = d3.geo.path().projection(projection);

    svg = d3.select("#map-container").append("svg")
      .attr("width", width)
      .attr("height", height)
      .call(zoom)
      .on("click", click)
      .append("g");

    g = svg.append("g");
  }

  //Load country aliases and names
  d3.csv("../static/countries.csv", function(err, countries) {
    test = countries;
    rateById = {};

    countries.forEach(function(i) {
      //Turning CSV values into numeric data
      i.id = +i.id;
      i.count = +i.count;
    });

    countries.forEach(function(d) {
      rateById[d.id] = +d.count;
    });

  });
  //Load map
  d3.json("../static/world-50m.json", function(error, world) {

    var countries = topojson.feature(world, world.objects.countries).features;

    topo = countries;
    draw(topo, true);

  });

  function draw(topo, redrawMap) {
    var country = g.selectAll(".country").data(topo);

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
        });
    }
    //Color countries
    country.style("fill", function(d) {
      return countryCount[d.id] ? color(countryCount[d.id].length) :
        color(0);
    })

    //offsets for tooltips
    var offsetL = document.getElementById('map-container').offsetLeft + 20;
    var offsetT = document.getElementById('map-container').offsetTop + 10;

    //tooltips
    country
      .on("mousemove", function(d, i) {
        var name;
        var tag;
        test.forEach(function(e, i) {
          if (e.id === d.id) {
            name = e.name;
            tag = e.tag;
          };
        })
        var mouse = d3.mouse(svg.node()).map(function(d) {
          return parseInt(d);
        });

        tooltip.classed("hidden", false)
          .attr("style", "left:" + (mouse[0] + offsetL) + "px;top:" + (
            mouse[1] +
            offsetT) + "px")
          .html(name + (countryCount[d.id] ? ", number of artists: " +
            countryCount[d.id].length : ""));

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

      test.forEach(function(e, i) {
        if (e.id === d.id) {
          name = e.name;
          tag = e.tag;
          id = d.id;
        };
      })
      var mouse = d3.mouse(svg.node()).map(function(d) {
        return parseInt(d);
      });

      //var bild = d3.select("#details").append("img").attr("src", "http://userserve-ak.last.fm/serve/64/27768421.jpg");



      for (i = 0; i < 3; i++) {
        if (countryCount[d.id][i]) {

          console.log("inne i if: " + countryCount[d.id][i].image);
          var artistDiv = d3.select("#details").append("div").attr("class", "artist-div");
          artistDiv.append("img").attr("src", countryCount[d.id][i].image);
          artistDiv.append("p").html(countryCount[d.id][i].artist);
          //var img = d3.select("#details").append("img").attr("src", countryCount[d.id][i].image);
          //d3.select("#details").append("p").html(countryCount[d.id][i].artist);
          //var hej = countryCount[d.id][i].image;
        } else {
          i = 10;
          console.log("inne i else");
        }
      }

      /*
      var img = $("<img>");
      img.attr("src", "http://userserve-ak.last.fm/serve/64/27768421.jpg");
      $(".details").append("<p>TEZT</p>");
      */



      detailsDiv
        .classed("hidden", function(d) {
          return (countryCount[id] ? false : true)
        })
        .attr("style", "left:" + (width / 2) +
          "px;top:" + (height / 2 - offsetT) + "px")

      closeButton
        .on("click", function(d, i) {
          detailsDiv.classed("hidden", true);

          d3.selectAll(".artist-div").remove("div");

        }) //"stäng" onclick slutar

    }) // on click slutar


    //Create Legend
    var legend = svg.selectAll("g.legend")
      .data(ext_color_domain)
      .enter().append("g")
      .attr("class", "legend");

    //Color box sizes
    var ls_w = 20,
      ls_h = 20;
    //Adds color box to legend
    legend.append("rect")
      .attr("x", 20)
      .attr("y", function(d, i) {
        return height - (i * ls_h) - 2 * ls_h;
      })
      .attr("width", ls_w)
      .attr("height", ls_h)
      .style("fill", function(d, i) {
        return color(d);
      })
      .style("opacity", 0.8);
    //Add legend text
    legend.append("text")
      .attr("x", 50)
      .attr("y", function(d, i) {
        return height - (i * ls_h) - ls_h - 4;
      })
      .text(function(d, i) {
        return legend_labels[i];
      });
  }

  function redraw(redrawMap) {
    width = document.getElementById('map-container').offsetWidth;
    height = width / 2;
    if (redrawMap) {
      d3.select('svg').remove();
      setup(width, height);
    }
    draw(topo, redrawMap);
  }
  //Ny funktion WIP:



  function move() {

    var t = d3.event.translate;
    var s = d3.event.scale;
    zscale = s;
    var h = height / 4;


    t[0] = Math.min(
      (width / height) * (s - 1),
      Math.max(width * (1 - s), t[0])
    );

    t[1] = Math.min(
      h * (s - 1) + h * s,
      Math.max(height * (1 - s) - h * s, t[1])
    );

    zoom.translate(t);
    g.attr("transform", "translate(" + t + ")scale(" + s + ")");

    //adjust the country hover stroke width based on zoom level
    d3.selectAll(".country").style("stroke-width", 1.5 / s);

  }



  var throttleTimer;

  function throttle() {
    window.clearTimeout(throttleTimer);
    throttleTimer = window.setTimeout(function() {
      redraw(true);
    }, 200);
  }


  //geo translation on mouse click in map
  function click() {
    var latlon = projection.invert(d3.mouse(this));
    console.log(latlon);
  }

  function clicked(d) {
    //Zoom-to-bounds
    //Status: FUNKAR att zooma in, knas när man zoomar ut

    var x, y, k;
    var b = path.bounds(d);
    //Set scale
    k = .70 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height);

    //Landet är inte centrerat redan
    if (d && centered !== d) {
      var centroid = path.centroid(d);
      centered = d;
      x = -(b[1][0] + b[0][0]) / 2 - (width / k) / 4;
      y = -(b[1][1] + b[0][1]) / 2;

      //Landet är redan centrerat
    } else {
      x = -width / 2;
      y = -height / 2;
      k = 1

      centered = null;
    }
    d3.selectAll(".country").style("stroke-width", 1.5 / k);

    g.transition().duration(750).attr("transform",
      "translate(" + projection.translate() + ")" +
      "scale(" + k + ")" +
      "translate(" + x + "," + y + ")");

    d3.selectAll(".country").style("stroke-width", 1.5 / k);


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
  map.putCountryCount = function(list) {
    countryCount = list;
    redraw();
  }
})(window, document)