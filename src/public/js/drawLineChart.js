function setStrokeVisibility(key) {
  if ($(".sideLegend text[data-id*='" + key + "']").hasClass("showLine"))
    d3.selectAll("#" + key).style("opacity", 1);
  else
    d3.selectAll("#" + key).style("opacity", 0);
}

function setLegendEnability(key, itemsLength) {
  if (itemsLength == 0)
    $(".sideLegend text[data-id*='" + key + "']").addClass("disable");
  else
    $(".sideLegend text[data-id*='" + key + "']")
        .removeClass("disable");
}

function assignColor(colors) {
//  var assets = <%-JSON.stringify(assets)%>;
//  console.log(Object.keys(assets).length);
  var index = 0;
  Object.keys(assets).forEach(function(key) {
//    console.log(key);
//    colors[key] = getRandomColor();
      colors[key] = getFixedColor(index, Object.keys(assets).length);
      index++;
  });
  return colors;
}

function getFixedColor(index, total_num)
{
   var startcolor = 0x00FF00;
   var endcolor = 0xFF0000;
   var steps = 0x000000;

   if (total_num <= 1){
      steps = startcolor;
   }
   else {
     steps = (endcolor - startcolor) / (total_num - 1);
   }

   var calcolor = startcolor + index * steps

   var hexstr = ("000000" + calcolor.toString(16)).substr(-6);
   return "#" + hexstr;
}

function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function timestampToTime(timestamp) {
  var date = new Date(timestamp * 1000);
  var hours = date.getHours();
  var minutes = "0" + date.getMinutes();
  return hours + ':' + minutes.substr(-2);
}

function setMinMaxforAxis(data) {
  var tempX = [], tempY = [];
  tempX = data.reduce(function(a, b) {
    var vals = Object.values(b)[0];
    var i = vals.map(function(x) {
      return (x.EpochTimeStamp);
    });
    return a.concat(i);
  }, [])
  tempY = data.reduce(function(a, b) {
    var vals = Object.values(b)[0];
    var i = vals.map(function(x) {
      if (x["Heat_Balance_Error(%)"] != 999)
        return (x["Heat_Balance_Error(%)"]);
    });
    return a.concat(i);
  }, [])
  if (tempX.length == 0 && tempY == 0)
    return;
  minX = Math.min.apply(Math, tempX);
  maxX = Math.max.apply(Math, tempX);
  minY = Math.min.apply(Math, tempY);
  maxY = Math.max.apply(Math, tempY);
}

function getMinX(data) {
  var tempX = [], tempY = [];
  tempX = data.reduce(function(a, b) {
    var vals = Object.values(b)[0];
    var i = vals.map(function(x) {
      return (x.EpochTimeStamp);
    });
    return a.concat(i);
  }, [])
  if (tempX.length == 0)
    return;
    minX = Math.min.apply(Math, tempX);
  return minX;
}

function getMinY(data) {
  var tempX = [], tempY = [];
  tempY = data.reduce(function(a, b) {
    var vals = Object.values(b)[0];
    var i = vals.map(function(x) {
      if (x["Heat_Balance_Error(%)"] != 999)
        return (x["Heat_Balance_Error(%)"]);
    });
    return a.concat(i);
  }, [])
  if (tempY == 0)
    return;
    minY = Math.min.apply(Math, tempY);
  return minX;
}

function getMaxX(data) {
  var tempX = [], tempY = [];
  tempX = data.reduce(function(a, b) {
    var vals = Object.values(b)[0];
    var i = vals.map(function(x) {
      return (x.EpochTimeStamp);
    });
    return a.concat(i);
  }, [])
  if (tempX.length == 0)
    return;
  maxX = Math.max.apply(Math, tempX);

  return maxX;
}

function getMaxY(data) {
  var tempX = [], tempY = [];
  tempY = data.reduce(function(a, b) {
    var vals = Object.values(b)[0];
    var i = vals.map(function(x) {
      if (x["Heat_Balance_Error(%)"] != 999)
        return (x["Heat_Balance_Error(%)"]);
    });
    return a.concat(i);
  }, [])
  if (tempY == 0)
    return;
    maxY = Math.max.apply(Math, tempY);
  return maxY;
}

function reformatData(data) {
  var res = [];
  for (a in data) {
    var grp = {};
    var key = Object.keys(data[a])[0];
    grp["key"] = key;
    grp["values"] = new Array();
    var t = data[a][key];
    for (b in t) {
      grp["values"].push({
        "xV" : t[b]["EpochTimeStamp"],
        "yV" : t[b]["Heat_Balance_Error(%)"]
      });
    }
    res.push(grp);
  }
  return res;
}


function drawLineChart(data, assets) {

  d3.select("#dashboard-line-chart-div").select('svg').remove();

  var colors = {};
  var minX = -1, maxX = -1, minY = -1, maxY = -1;

  var vis = d3.select("#dashboard-line-chart-div")
              .append('svg')
              .attr('width',1000)
              .attr('height',500)
              .attr('class','col col-md-10'), WIDTH = 800, HEIGHT = 400, MARGINS = {
    top : 20,
    right : 20,
    bottom : 20,
    left : 50
  };
  var res = reformatData(data);

  minX = getMinX(data);
  minY = getMinY(data);

  maxX = getMaxX(data);
  maxY = getMaxY(data);

  console.log(maxY);
//  setMinMaxforAxis(data);

  //var legendSpace = WIDTH/data.length; // spacing for the legend
  //var zoom = d3.zoom().scaleExtent([ 0.5, 2 ]).on("zoom", zoomFunction);

  var xScale = d3.scaleLinear().range(
      [ MARGINS.left, WIDTH - MARGINS.right - 50])
      .domain([ minX, maxX ]);
  var yScale = d3.scaleLinear().range(
      [ HEIGHT - MARGINS.top, MARGINS.bottom ]).domain(
      [ 0, maxY * 1.2 ]);

  var xAxis = d3.axisBottom(xScale).ticks(10).tickFormat(function(d) {
    return timestampToTime(d);
  });
  var yAxis = d3.axisLeft(yScale);

  var gX = vis.append("g").attr("class", "xaxis").attr("transform",
      "translate(0," + (HEIGHT - MARGINS.bottom) + ")");

  gX.call(xAxis).selectAll("text").attr("y", 0).attr("x", 9).attr("dy",
      ".35em").attr("transform", "rotate(90)").style("text-anchor",
      "start");

  var gY = vis.append("g").attr("class", "yaxis").attr("transform",
      "translate(" + (MARGINS.left) + ",0)").call(yAxis);
  var sideLegend = vis.append('g').attr('class', 'sideLegend');

  vis.append("g")
    .attr("class", "yaxis")
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .style("font-size", "10pt")
    .text("Heat Balance Error (%)");

  /*var tip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);*/

  vis.append("defs").append("clipPath").attr("id", "clip").append("rect")
      .attr("x", "50").attr("y", "-20").attr("width", WIDTH - 120).attr(
          "height", HEIGHT);

//	var view = vis
//	.attr("x", 9).attr("y", 0).attr("width", WIDTH - 50).attr("height",
//			HEIGHT + 50).call(zoom);

  var chartBody = vis.append("g").attr("clip-path", "url(#clip)");

  colors = assignColor(colors);

  var dataGroup = res;
  var lineGen = d3.line()
                  .curve(d3.curveBasis)
                  .x(function(d) { return xScale(d.xV);})
                  .y(function(d) { return yScale(d.yV);
  });
//									.curve(d3.curveBasis)
  dataGroup.forEach(function(d, i) {

    sideLegend.append('rect').attr('x', WIDTH - 20).attr('y', function() {
      return (i * 20) + 10;
    }).attr('width', 10).attr('height', 10).style('fill', function() {
      return colors[d.key];
    });

    sideLegend.append('text').attr('x', WIDTH - 8).attr('y', function() {
      return (i * 20) + 20;
    }).attr("class", "showLine").attr("data-id", d.key).text(function() {
      return assets[d.key];
    }).on("click", function() {
      var device = $(this).attr("data-id");
      $(this).toggleClass("showLine");
      setStrokeVisibility(device);
    });
    /*   d3.select("#legend").append(function(){
        if(i%5 == 0){
          d3.select("#legend").append("tr");
        }
        return "td";
      }(i)).text(d.key).attr("class", "legend showLine")
      .style("color", function() { return colors[d.key]; })
      .on("click", function(){
          var device = $(this).text();
          $(this).toggleClass("showLine");
          setStrokeVisibility(device);
      });
     */
    setLegendEnability(d.key, d.values.length);

    chartBody.append('path').attr('d', lineGen(d.values)).attr('stroke',
        colors[d.key]).attr('stroke-width', 2).attr('class', 'line')
        .attr('fill', 'none').attr('id', d.key);
    //   .on("mouseover", handleMouseOver).on("mouseout", handleMouseOut);
  });

  // mouse over event - start
  var mouseG = vis.append("g").attr("class", "mouse-over-effects");

  mouseG.append("path") // this is the black vertical line to follow mouse
  .attr("class", "mouse-line").style("stroke", "black").style("stroke-width",
      "1px").style("opacity", "0");

  var lines = document.getElementsByClassName('line');

  var mousePerLine = mouseG.selectAll('.mouse-per-line').data(data).enter()
      .append("g").attr("class", "mouse-per-line");

  mousePerLine.append("circle").attr("r", 7).style("stroke", "red").style(
      "fill", "none").style("stroke-width", "1px").style("opacity", "0");

  mousePerLine.append("text").attr("transform", "translate(10,3)");

  mouseG
      .append('svg:rect')
      // append a rect to catch mouse movements on canvas
      .attr("x", "50")
      .attr("y", "30")
      .attr('width', WIDTH - 120)
      // can't catch mouse events on a g element
      .attr('height', HEIGHT - 50)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mouseout', function() { // on mouse out hide line, circles and text
        d3.select(".mouse-line").style("opacity", "0");
        d3.selectAll(".mouse-per-line circle").style("opacity", "0");
        d3.selectAll(".mouse-per-line text").style("opacity", "0");
      })
      .on('mouseover', function() { // on mouse in show line, circles and text
        d3.select(".mouse-line").style("opacity", "1");
        d3.selectAll(".mouse-per-line circle").style("opacity", "1");
        d3.selectAll(".mouse-per-line text").style("opacity", "1");
      })
      .on(
          'mousemove',
          function() { // mouse moving over canvas
            var mouse = d3.mouse(this);
            d3.select(".mouse-line").attr("d", function() {
              var d = "M" + mouse[0] + "," + (HEIGHT - 20);
              d += " " + mouse[0] + "," + 20;
              return d;
            });

            d3
                .selectAll(".mouse-per-line")
                .attr(
                    "transform",
                    function(d, i) {

                      var key = Object.keys(d)[0];
                      if (!($(".sideLegend text[data-id*='"
                          + key + "']")
                          .hasClass("showLine")))
                        return null;

                      var xDate = xScale.invert(mouse[0]), bisect = d3
                          .bisector(function(d) {
                            return key;
                          }).right;
                      idx = bisect(d[key], xDate);

                      var beginning = 0, end = lines[i]
                          .getTotalLength(), target = null;

                      while (true) {
                        target = Math
                            .floor((beginning + end) / 2);
                        pos = lines[i]
                            .getPointAtLength(target);
                        if ((target === end || target === beginning)
                            && pos.x !== mouse[0]) {
                          break;
                        }
                        if (pos.x > mouse[0])
                          end = target;
                        else if (pos.x < mouse[0])
                          beginning = target;
                        else
                          break; //position found
                      }
                      d3
                          .select(this)
                          .select('text')
                          .text(
                              yScale
                                  .invert(
                                      pos.y)
                                  .toFixed(2));

                      return "translate(" + mouse[0]
                          + "," + pos.y + ")";
                    });
          });


}
