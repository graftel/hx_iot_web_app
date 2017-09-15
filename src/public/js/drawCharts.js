	
	var zoomEnabled = false;
	var lock = false;
	var selectionDrag;

	function drawLineGraph(graphDiv, data, assets, domain, YParam) {
		
		graphDiv.select('svg').remove(); // empty svg on every load
		window.vis = graphDiv.append('svg')
					.attr("preserveAspectRatio", "xMinYMin meet")
					.attr("viewBox", "0 0 800 500")
					.attr('width', 800).attr('height', 500)
					.attr('class', 'svg-content col col-md-10');
		var WIDTH = 800, HEIGHT = 400, MARGINS = {
			top : 20,
			right : 20,
			bottom : 20,
			left : 70
		};
		vis.append("rect").attr("x", 0).attr("y", 0).attr("height", HEIGHT + 50)
				.attr("width", WIDTH + 60).style("stroke", "grey").style("fill",
						"none").style("stroke-width", 1);   // svg border line
		
		// ***** X-axis, Y-axis ******
		var xScale = d3.scaleLinear().range(
				[ MARGINS.left, WIDTH - MARGINS.right - 50 ]).domain(
				[ domain.X.min, domain.X.max ]);
		var yScale = d3.scaleLinear().range(
				[ HEIGHT - MARGINS.top, MARGINS.bottom ]).domain(
				[ domain.Y.min, domain.Y.max ]);
		var new_xScale, new_yScale;
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
		
		var xlabelBox = d3.select(".xaxis").append("rect").attr("transform",
		"translate(12,20)").style("fill", "#7d7e82").attr("width", 50)
		.attr("height", 30).style("opacity", "0");
		
		var xlabelText = d3.select(".xaxis").append("text").attr("transform",
		"translate(12,20)").style("fill", "white").style("opacity", "0");
		
		var startingDate = new Date(domain.X.min * 1000),
			endingDate = new Date(domain.X.max * 1000);
		if(startingDate.getDate() != endingDate.getDate()){
			vis.append("g")  // x axis label ending date
			.append("text").attr("x", 750).attr("y", 430).attr("dy",".71em")
			.style("text-anchor", "end").style("font-size", "10pt")
			.text((endingDate.getMonth()+1) + "/" + endingDate.getDate() + "/" + endingDate.getFullYear());
		}
		vis.append("g")  // x axis label starting date
			.append("text").attr("x", 120).attr("y", 430).attr("dy",".71em")
			.style("text-anchor", "end").style("font-size", "10pt")
			.text((startingDate.getMonth()+1) + "/" + startingDate.getDate() + "/" + startingDate.getFullYear());
		vis.append("g")  // y axis label
			.append("text").attr("transform", "rotate(-90)").attr("x", -20).attr("y", 20).attr("dy",".71em")
			.style("text-anchor", "end").style("font-size", "10pt")
			.text(YParam);
		
		// ****** Path and side legend ********
		var chartBody = vis.append("g").attr("clip-path", "url(#clip)").attr("id","chartBody");
		var colors = assignColor(assets);
		
		var dataGroup = reformatData(data, YParam);
		var lineGen = d3.line().curve(d3.curveBasis).x(function(d) {
			return xScale(d.xV);
		}).y(function(d) {
			return yScale(d.yV);
		});
		
		var sideLegend = vis.append('g').attr('class', 'sideLegend'); // legend group
		
		dataGroup.forEach(function(d, i) { // draw graph lines and add legend
			
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
			
			chartBody.append('path').attr('d', lineGen(d.values)).attr('stroke',  // generate path lines
					colors[d.key]).attr('stroke-width', 2).attr('class', 'line')
					.attr('fill', 'none').attr('id', d.key);
		});
		
		vis.append("defs").append("clipPath").attr("id", "clip").append("rect")
		.attr("x", "70").attr("y", "0").attr("width", WIDTH - 140).attr("height", HEIGHT - 20);		
		
		// ****** Tool tip **********
		var lines = document.getElementsByClassName('line');
		var mouseG = chartBody.append("g").attr("class", "mouse-over-effects");  // tooltip canvas group
		
		
		var mousePerLine = mouseG.selectAll('.mouse-per-line').data(data).enter()   // tooltip group
				.append("g").attr("class", "mouse-per-line");
	
		mousePerLine.append("rect").style("fill", "none").attr("width", 50).attr(
				"height", 30).attr("class","holder").style("opacity", "0");
	
		mousePerLine.append("text").attr("transform", "translate(12,20)").attr("class","holder").style(
				"fill", "white");
		
		var showTooltip = function(){
			d3.select(".mouse-line").style("opacity", "1");
			d3.selectAll(".mouse-per-line rect").style("opacity", "0.6");
			d3.selectAll(".mouse-per-line text").style("opacity", "1");
			xlabelBox.style("opacity", "0.6");
			xlabelText.style("opacity", "1");
		};
		
		var hideTooltip = function(){
			d3.select(".mouse-line").style("opacity", "0");
			d3.selectAll(".mouse-per-line rect").style("opacity", "0");
			d3.selectAll(".mouse-per-line text").style("opacity", "0");
			xlabelBox.style("opacity", "0");
			xlabelText.style("opacity", "0");
		};
		
		mouseG.append('svg:rect')
				.attr("x", "70")
				.attr("y", "20")
				.attr('width', WIDTH - 140)
				.attr('height', HEIGHT - 40)
				.attr('fill', 'none')
				.attr('pointer-events', 'all')
				.on('mouseout', function() { 
					hideTooltip();
				})
				.on('mouseover', function() { 
					showTooltip();
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
													var rectColor = $("#" + key).attr(
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
													
													var offset = lines[i].getAttribute("transform") == null ? 22 : 0; // offset on zoom
													var yValue = yScale.invert(pos.y);
													
													xlabelText.text(timestampToTime(xScale.invert(mouse[0])))
															   .attr("transform", "translate("+ (mouse[0] + offset ) + ",40)")
															   .style("opacity", "1");
													if(new_yScale && (yValue < new_yScale.domain()[0] || yValue > new_yScale.domain()[1])){
														return "translate(-20,-20)";
													}
													d3.select(this).select('text').text(yValue.toFixed(2));
													return "translate(" + mouse[0] + "," + pos.y + ")";
											});
						}).on('mousedown', function() { 
							hideTooltip();
						}).on('mouseup', function() { 
							showTooltip();
						});
		
		// ******** Tool Menu Options **********
		var toolMenu = vis.append('g').attr('class', 'toolMenu'); // Tool menu group
		toolMenu.append('rect').attr('x', 740).attr('y', 2).attr('width', 120)  // tool menu background
		.attr('height', 25).style('fill', "#f2f2f2");
	
		var foreignObj = toolMenu.append("foreignObject").attr("class", "container").attr(
			'x', 745).attr('y', 2).attr('width', 80).attr('height', 25);  // options under tool menu
		
		foreignObj.append('xhtml:div')					// tool menu options, timer drop down
		.attr("class", "row border-0")
		.html('<img src="images/zoom_drag.png" alt="zoom" width="25" height="25" id="zoom" class="span3 controls" title="Selectable Zoom / Zoom InOut"/>'
						+ '<img src="images/reset.png" alt="full" width="25" height="25" id="reset" class="span3 controls" style="margin: 0 5px 0 5px;" title="Reset" />'
						+ '<img src="images/timer.png" alt="timer" width="25" height="25" id="timer" class="span3 controls" title="Time Period" data-toggle="dropdown"/>'
						+ '<img src="images/unlock.png" alt="lock" width="25" height="25" id="lock" class="span3 controls" title="Lock this control bar" />'
						+ '<div class="timer-dropdown"><div><a id="timer-1hr" href="#">1-hour data</a></div><div><a id="timer-2hr" href="#">2-hours data</a></div>'
						+ '<div><a id="timer-3hr" href="#">3-hours data</a></div><div><a id="timer-5hr" href="#">5-hours data</a></div><div><a id="timer-24hr" href="#">24-hours data</a></div></div>');
		
		if(window.location.pathname == "/asset"){
			zoomEnabled = true;
			toolMenu.attr("display", "none");
		}
		
		if (!lock) // lock button - initial setup
			toolMenu.attr("display", "none");
		
		$("img#lock").click(function(event) { // lock button - click event
			lock = !lock;
			if(lock){
				$("img#lock").attr("src", "images/lock.png");
			}
			else{
				$("img#lock").attr("src", "images/unlock.png");
			}
		});
	
		vis.on("mouseover", function() { // tool menu - display events
			if(window.location.pathname == "/asset"){
				toolMenu.attr("display", "none");
				return;
			}
			toolMenu.attr("display", "block");
		}).on("mouseout", function() {
			if (!lock)
				toolMenu.attr("display", "none");
		});
		
		toolMenu.on("mouseover", function(d) {
			var circleUnderMouse = this;
			graphDiv.selectAll("svg g").transition().style('opacity', function() {
				var opacityDegree = 0.4;
				return (this === circleUnderMouse) ? 1.0 : opacityDegree;
			});
		}).on("mouseout", function(d) {
			d3.selectAll("svg g").transition().style('opacity', 1);
		});
	
		toolMenu.selectAll("img#timer, div.timer-dropdown").on("mouseover", function() { // timer button - display events
			toolMenu.select("div.timer-dropdown").style("display", "block");
		}).on("mouseout", function() {
			toolMenu.select("div.timer-dropdown").style("display", "none");
		});
		
		toolMenu.selectAll("div.timer-dropdown a").on('click',function(){ // timer button - click events
			var timeInHours = this.id.replace(/^\D+|\D+$/g, "");
			getLiveData(timeInHours);			
		});
		
		vis.select("#reset").on("click",function() { // RESET button
			drawLineGraph(graphDiv, data, assets, domain, YParam);
		});
		
		
		// ****** Zoom and Drag ********
		window.zoom = d3.zoom().scaleExtent([ 0.5, 2 ])  // svg zoom properties
		  .on("zoom", function() {
							if (zoomEnabled) {
								new_xScale = d3.event.transform.rescaleX(xScale);
								new_yScale = d3.event.transform.rescaleY(yScale);
								gX.call(xAxis.scale(new_xScale)).selectAll("text").attr(
										"x", 9).attr("y", 0).attr("dy", ".35em").attr(
										"transform", "rotate(90)").style("text-anchor",
										"start");
								gY.call(yAxis.scale(new_yScale));
								vis.selectAll('.line')
										.attr("transform", d3.event.transform);
								vis.selectAll('.mouse-over-effects *:not(.holder)')
								.attr("transform",d3.event.transform);
							}
		  });
		
		var mask, startarea, endarea;
		var dragBehavior = d3.drag()
		  .on("start",function() {
				startarea = d3.event;
				clearMask();
				mask = vis.append("defs").attr("class", "maskDef").append(
						"mask").attr("id", "myMask").style("stroke","green").style("stroke-width","3px");

				mask.append("rect").attr("x", 0).attr("y", 0).attr("width",
						 WIDTH - 70).attr("height", HEIGHT - 20).style("fill", "white")
						.style("opacity", 0.5);
		  })
		  .on("drag", function() {
			  	d3.selectAll(".maskRect").remove(); // remove mask layer
			  	endarea = d3.event;
				var sv = vis.append("g").attr("class", "maskRect").attr(
						"transform", "translate(0,0)");
				var dx = endarea.x - startarea.x,
		      		dy = endarea.y - startarea.y;
				if(dx < 0 || dy < 0)
					return false;
				mask.append("rect").attr("x", startarea.x).attr("y",
						startarea.y).attr("width", (endarea.x - startarea.x))
						.attr("height", (endarea.y - startarea.y));

				var rr = sv.append("rect").attr("x", 70).attr("y", 0).attr(
						"width", WIDTH - 130).attr("height", HEIGHT - 20).attr(
						"mask", "url(#myMask)").style("fill", "grey");
		  })
		  .on("end", function(d) {
				endarea = d3.event;
				clearMask();
				var dx = endarea.x - startarea.x,
			      	dy = endarea.y - startarea.y,
			      	x = (startarea.x + endarea.x) / 2,
			      	y = (startarea.y + endarea.y) / 2;
				if(dx == 0 && dy == 0){
					vis.transition().call(zoom.transform, d3.zoomIdentity);
					return;
				}				
				var scale = .9 / Math.max(dx / WIDTH, dy / HEIGHT),
					translate = [(WIDTH / 2) - (scale * x), (HEIGHT / 2) - (scale * y)];
				var transform = d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale);
				new_xScale = transform.rescaleX(xScale);
				new_yScale = transform.rescaleY(yScale);			
				gX.call(xAxis.scale(new_xScale)).selectAll("text").attr(
						"x", 9).attr("y", 0).attr("dy", ".35em").attr(
						"transform", "rotate(90)").style("text-anchor",
						"start");
				gY.call(yAxis.scale(new_yScale));
				vis.selectAll('.line').attr("transform",transform);
				vis.selectAll('.mouse-over-effects *:not(.holder)').attr("transform","translate("+translate[0]+","+translate[1]+")scale("+scale+")");
		  });
		vis.on("click", clearMask);
		
		var setZoom = function(){
			if(zoomEnabled){ // zoom enabled
				$("img#zoom").attr("src", "images/zoom_in_out.png");
				if(dragBehavior) // disable drag behavior
					chartBody.call(dragBehavior).on(".drag",null);
				vis.call(zoom);
			}			
			else{ 
				$("img#zoom").attr("src", "images/zoom_drag.png");
				if(zoom)
					vis.call(zoom) // zoom disable
				    .on("wheel.zoom", null)
				    .on("mousedown.zoom", null)
				    .on("touchstart.zoom", null)
				    .on("touchmove.zoom", null)
				    .on("touchend.zoom", null);					
				chartBody.call(dragBehavior); // enable drag
			}
		};
		
		setZoom(); // for initial setup when graph loads
		$("img#zoom").click(function(event) {
			zoomEnabled = !zoomEnabled;
			setZoom();
		});
	}
	
	function clearMask(){
		d3.selectAll(".maskDef").remove();
		d3.selectAll(".maskRect").remove();
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