	var zoomEnabled = false;
	var lock = false;
	function drawLineGraph(graphDiv, data, assets, domain, YParam) {
		
		graphDiv.select('svg').remove(); // empty svg on every load
		window.vis = graphDiv.append('svg').attr('width', 1000).attr('height', 500)
				.attr('class', 'col col-md-10');
		var WIDTH = 800, HEIGHT = 400, MARGINS = {
			top : 20,
			right : 20,
			bottom : 20,
			left : 70
		};
		vis.append("rect").attr("x", 0).attr("y", 0).attr("height", HEIGHT + 50)
				.attr("width", WIDTH + 60).style("stroke", "grey").style("fill",
						"none").style("stroke-width", 1);   // svg border line
		var xScale = d3.scaleLinear().range(
				[ MARGINS.left, WIDTH - MARGINS.right - 50 ]).domain(
				[ domain.X.min, domain.X.max ]);
		var yScale = d3.scaleLinear().range(
				[ HEIGHT - MARGINS.top, MARGINS.bottom ]).domain(
				[ domain.Y.min, domain.Y.max ]);
	
		var xAxis = d3.axisBottom(xScale).ticks(10).tickFormat(function(d) {
			return timestampToTime(d);
		});
		window.yAxis = d3.axisLeft(yScale);
	
		var gX = vis.append("g").attr("class", "xaxis").attr("transform",
				"translate(0," + (HEIGHT - MARGINS.bottom) + ")");
		gX.call(xAxis).selectAll("text").attr("y", 0).attr("x", 9).attr("dy",
				".35em").attr("transform", "rotate(90)").style("text-anchor",
				"start");
		var gY = vis.append("g").attr("class", "yaxis").attr("transform",
				"translate(" + (MARGINS.left) + ",0)").call(yAxis);
		var chartBody = vis.append("g").attr("clip-path", "url(#clip)");
		var colors = assignColor(assets);
		var sideLegend = vis.append('g').attr('class', 'sideLegend'); // legend group
		var toolMenu = vis.append('g').attr('class', 'toolMenu'); // Tool menu group
			toolMenu.append('rect').attr('x', 740).attr('y', 2).attr('width', 120)  // tool menu background
			.attr('height', 25).style('fill', "#f2f2f2");
		
		var foreignObj = toolMenu.append("foreignObject").attr("class", "container").attr(
				'x', 745).attr('y', 2).attr('width', 80).attr('height', 25);  // options under tool menu
		
		var mouseG = vis.append("g").attr("class", "mouse-over-effects");  // tooltip canvas group
		
	
		var mousePerLine = mouseG.selectAll('.mouse-per-line').data(data).enter()   // tooltip group
				.append("g").attr("class", "mouse-per-line");
	
		mousePerLine.append("rect").style("fill", "none").attr("width", 50).attr(
				"height", 30).style("opacity", "0");
	
		mousePerLine.append("text").attr("transform", "translate(12,20)").style(
				"fill", "white");
		
		var xlabelBox = d3.select(".xaxis").append("rect").attr("transform",
				"translate(12,20)").style("fill", "#337ab7").attr("width", 50)
				.attr("height", 30).style("opacity", "0");
		var xlabelText = d3.select(".xaxis").append("text").attr("transform",
				"translate(12,20)").style("fill", "white").style("opacity", "0");
		
		/*
		 * vis.append("g") // display YAxis parameter name .attr("class", "yaxis")
		 * .append("text") .attr("transform", "rotate(-90)") .attr("y", 6)
		 * .attr("dy", ".71em") .style("text-anchor", "end") .style("font-size",
		 * "10pt") .text(YParam);
		 */

		var dataGroup = reformatData(data, YParam);
		var lineGen = d3.line().curve(d3.curveBasis).x(function(d) {
			return xScale(d.xV);
		}).y(function(d) {
			return yScale(d.yV);
		});
	
		// draw graph lines and add legend
		dataGroup.forEach(function(d, i) {
			// adding legend start
			sideLegend.append('rect').attr('x', WIDTH - 20).attr('y', function() {
				return (i * 20) + 50;
			}).attr('width', 10).attr('height', 10).style('fill', function() {
				return colors[d.key];
			});
	
			sideLegend.append('text').attr('x', WIDTH - 8).attr('y', function() {
				return (i * 20) + 60;
			}).attr("class", "showLine").attr("data-id", d.key).text(function() {
				return assets[d.key];
			}).on("click", function() {
				var device = $(this).attr("data-id");
				$(this).toggleClass("showLine");
				setStrokeVisibility(device);
			});
			setLegendEnability(d.key, d.values.length);
			// adding legend end
			
			chartBody.append('path').attr('d', lineGen(d.values)).attr('stroke',  // generate path lines
					colors[d.key]).attr('stroke-width', 2).attr('class', 'line')
					.attr('fill', 'none').attr('id', d.key);
		});
		
		vis.append("defs").append("clipPath").attr("id", "clip").append("rect")
		.attr("x", "50").attr("y", "-20").attr("width", WIDTH - 120).attr("height", HEIGHT);
		
		window.zoom = d3.zoom().scaleExtent([ 0.5, 2 ])  // svg zoom properties
					  .on("zoom", function() {
										if (zoomEnabled) {
											var new_xScale = d3.event.transform.rescaleX(xScale);
											var new_yScale = d3.event.transform.rescaleY(yScale);
											gX.call(xAxis.scale(new_xScale)).selectAll("text").attr(
													"x", 9).attr("y", 0).attr("dy", ".35em").attr(
													"transform", "rotate(90)").style("text-anchor",
													"start");
											gY.call(yAxis.scale(new_yScale));
											vis.selectAll('.line')
													.attr("transform", d3.event.transform);
										}
					  });
		vis.call(zoom);

		foreignObj.append('xhtml:div')					// tool menu options, timer drop down
				.attr("class", "row border-0")
				.html('<img src="images/zoom.png" alt="zoom" width="25" height="25" id="zoom" class="span3 controls" title="Enable/Disable Zoom"/>'
								+ '<img src="images/full-screen.png" alt="full" width="25" height="25" id="full-screen" class="span3 controls" style="margin: 0 5px 0 5px;" title="Full Screen" />'
								+ '<img src="images/timer.png" alt="timer" width="25" height="25" id="timer" class="span3 controls" title="Time Period" data-toggle="dropdown"/>'
								+ '<img src="images/lock.png" alt="lock" width="25" height="25" id="lock" class="span3 controls" title="Lock this control bar" />'
								+ '<div class="timer-dropdown"><div><a  id="timer-1" href="#">1-hour data</a></div><div><a id="timer-2" href="#">2-hours data</a></div>'
								+ '<div><a id="timer-3" href="#">3-hours data</a></div><div><a  id="timer-5" href="#">5-hours data</a></div><div><a  id="timer-24" href="#">24-hours data</a></div></div>');
			
		var lines = document.getElementsByClassName('line');

		// all mouse events - start
		mouseG.append('svg:rect')
				.attr("x", "50")
				.attr("y", "30")
				.attr('width', WIDTH - 120)
				.attr('height', HEIGHT - 50)
				.attr('fill', 'none')
				.attr('pointer-events', 'all')
				.on('mouseout', function() { 
					d3.select(".mouse-line").style("opacity", "0");
					d3.selectAll(".mouse-per-line rect").style("opacity", "0");
					d3.selectAll(".mouse-per-line text").style("opacity", "0");
					xlabelBox.style("opacity", "0");
					xlabelText.style("opacity", "0");
				})
				.on('mouseover', function() { 
					d3.select(".mouse-line").style("opacity", "1");
					d3.selectAll(".mouse-per-line rect").style("opacity", "1");
					d3.selectAll(".mouse-per-line text").style("opacity", "1");
					xlabelBox.style("opacity", "0.6");
					xlabelText.style("opacity", "1");
				})
				.on('mousemove', function() {
							var mouse = d3.mouse(this);
							d3.select(".mouse-line").attr("d", function() {
								var d = "M" + mouse[0] + "," + (HEIGHT - 20);
								d += " " + mouse[0] + "," + 20;
								return d;
							});
	
							d3.selectAll(".mouse-per-line")
									.attr("transform",
											function(d, i) {
													var key = Object.keys(d)[0];
													var rectColor = d3
															.select("#" + key).attr(
																	"stroke");
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
															break; // position found
													}
													if (pos.y == 0)
														return "translate(-10,-10)";
													d3.select(this).select('rect')
															.style('fill', rectColor);
		
													xlabelBox.attr(
															"transform",
															"translate(" + mouse[0]
																	+ ",20)").style(
															"opacity", "0.6");
													xlabelText.text(timestampToTime(xScale.invert(mouse[0])))
															   .attr("transform", "translate("+ (mouse[0] + 22) + ",40)")
															   .style("opacity", "1");
		
													d3.select(this).select('text').text(yScale.invert(pos.y).toFixed(2));
													return "translate(" + mouse[0] + "," + pos.y + ")";
											});
						});
		if (!lock)
			toolMenu.attr("display", "none");
		
		$("img#lock").click(function(event) {
			lock = !lock;
		});
		
		$("img#zoom").click(function(event) {
			zoomEnabled = !zoomEnabled;
		});
		
		vis.on("mouseover", function() {
			toolMenu.attr("display", "block");
		}).on("mouseout", function() {
			if (!lock)
				toolMenu.attr("display", "none");
		});
		
		toolMenu.on("mouseover", function(d) {
			var circleUnderMouse = this;
			d3.selectAll("svg g").transition().style('opacity', function() {
				var opacityDegree = 0.4;
				d3.select("#zoom-reset").style('opacity', opacityDegree);
				return (this === circleUnderMouse) ? 1.0 : opacityDegree;
			});
		}).on("mouseout", function(d) {
			d3.select("#zoom-reset").style('opacity', 1);
			d3.selectAll("svg g").transition().style('opacity', 1);
		});
	
		toolMenu.selectAll("img#timer, div.timer-dropdown").on("mouseover", function() {
			toolMenu.select("div.timer-dropdown").style("display", "block");
		}).on("mouseout", function() {
			toolMenu.select("div.timer-dropdown").style("display", "none");
		});
		
		toolMenu.selectAll("div.timer-dropdown a").on('click',function(){
			var timeInHours = this.id.split("timer-")[1];
			window.location.href = "/?timer="+timeInHours;
		});
		
	}
	
	function drawSensorMap(latestValues) {
		window.domainY = setMinMaxforAssetGraph(latestValues).Y;
		var width = 300, height = 300;
		var svg = d3.select('#sensor-chart').selectAll('svg').append('svg').attr(
				"width", width).attr("height", height);
		svg.select("g").remove();
		// Config for the Radar chart
		var config = {
			w : width,
			h : height,
			maxValue : 3,
			levels : 5,
			ExtraWidthX : 300
		};
	
		var data = [];
		var devices = Object.keys(latestValues);
		for (i in devices) {
			data.push({
				deviceid : devices[i],
				value : latestValues[devices[i]] - domainY.min
			});
		}
		RadarChart.draw("#sensor-chart", [ data ], config);
	}
	
	$(document).ready(function() {
		$("#zoom-reset").click(function(event) {
			vis.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
		});
	});
