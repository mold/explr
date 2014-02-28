var map = {};

(function(window, document) {
  d3.select(window).on("resize", throttle);

  var zoom = d3.behavior.zoom()
    .scaleExtent([1, 9])
    .on("zoom", move);

  var width = document.getElementById('map-container').offsetWidth;
  var height = width / 1.8;

  var topo, projection, path, svg, g, test, test2, c2, rateById,
    countryCount = {};

  var color = d3.scale.threshold()
    .domain([0, 5, 10, 15, 20])
    .range(["#f2f0f7", "#dadaeb", "#bcbddc", "#9e9ac8", "#756bb1", "#54278f"]);

  //var graticule = d3.geo.graticule();

  var tooltip = d3.select("#map-container").append("div").attr("class",
    "tooltip hidden");

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
    draw(topo);

  });

  function draw(topo) {
    var country = g.selectAll(".country").data(topo);

    var c1;

    country.enter().insert("path")
      .attr("class", "country")
      .attr("d", path)
      .attr("id", function(d, i) {
        return d.id;
      })
      .attr("title", function(d, i) {
        return d.properties.name;
      });
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


  }

  function redraw() {
    width = document.getElementById('map-container').offsetWidth;
    height = width / 2;
    d3.select('svg').remove();
    setup(width, height);
    draw(topo);
  }


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
      redraw();
    }, 200);
  }


  //geo translation on mouse click in map
  function click() {
    var latlon = projection.invert(d3.mouse(this));
    console.log(latlon);
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