	
	function drawLineGraph(graphDiv, data, assets, domain, YParam) {
		graphDiv.select('svg').remove();
		window.vis = graphDiv.append('svg').attr('width', 1000).attr('height', 500)
				.attr('class', 'col col-md-10');
		var	WIDTH = 800, HEIGHT = 400, MARGINS = {
			top : 20,
			right : 20,
			bottom : 20,
			left : 70
		};
	
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
		
/*		vis.append("g") // display YAxis parameter name
		.attr("class", "yaxis")
		.append("text")
		.attr("transform", "rotate(-90)")
		.attr("y", 6)
		.attr("dy", ".71em")
		.style("text-anchor", "end")
		.style("font-size", "10pt")
		.text(YParam);*/

		vis.append("defs").append("clipPath").attr("id", "clip").append("rect")
				.attr("x", "50").attr("y", "-20").attr("width", WIDTH - 120).attr(
						"height", HEIGHT);
		window.zoom = d3.zoom().scaleExtent([ 0.5, 2 ]).on("zoom", function(){
			var new_xScale = d3.event.transform.rescaleX(xScale);
	 		var new_yScale = d3.event.transform.rescaleY(yScale);
	 		gX.call(xAxis.scale(new_xScale)).selectAll("text").attr("y", 0).attr(
	 				"x", 9).attr("dy", ".35em").attr("transform", "rotate(90)")
	 			.style("text-anchor", "start");
	 		gY.call(yAxis.scale(new_yScale));
	 		vis.selectAll('.line').attr("transform", d3.event.transform);
		});
		vis.call(zoom);
		var chartBody = vis.append("g").attr("clip-path", "url(#clip)");
		var colors = assignColor(assets);
		var sideLegend = vis.append('g').attr('class', 'sideLegend');
		var dataGroup = reformatData(data, YParam);
		var lineGen = d3.line().curve(d3.curveBasis).x(function(d) {
			return xScale(d.xV);
		}).y(function(d) {
			return yScale(d.yV);
		});
	
		// draw graph lines and add legend
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
			setLegendEnability(d.key, d.values.length);
			chartBody.append('path').attr('d', lineGen(d.values)).attr('stroke',
					colors[d.key]).attr('stroke-width', 2).attr('class', 'line')
					.attr('fill', 'none').attr('id', d.key);
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
				// can't catch mouse events on a g element
				.attr("y", "30")
				.attr('width', WIDTH - 120)
				.attr('height', HEIGHT - 50)
				.attr('fill', 'none')
				.attr('pointer-events', 'all')
				.on('mouseout', function() { // on mouse out hide line, circles
												// and text
					d3.select(".mouse-line").style("opacity", "0");
					d3.selectAll(".mouse-per-line circle").style("opacity", "0");
					d3.selectAll(".mouse-per-line text").style("opacity", "0");
				})
				.on('mouseover', function() { // on mouse in show line, circles
												// and text
					d3.select(".mouse-line").style("opacity", "1");
					d3.selectAll(".mouse-per-line circle").style("opacity", "1");
					d3.selectAll(".mouse-per-line text").style("opacity", "1");
				})
				.on('mousemove', function() { // mouse moving over canvas
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
										if (!($(".sideLegend text[data-id*='"+ key + "']").hasClass("showLine")))
													return null;
										var xDate = xScale.invert(mouse[0]), 
											bisect = d3.bisector(function(d) {
															return key;
														}).right;
											idx = bisect(d[key], xDate);
	
										var beginning = 0, end = lines[i]
														.getTotalLength(), target = null;
	
										while (true) {
													target = Math.floor((beginning + end) / 2);
													pos = lines[i].getPointAtLength(target);
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
										d3.select(this).select('text')
														.text(yScale.invert(pos.y).toFixed(2));
										return "translate(" + mouse[0]+ "," + pos.y + ")";
									});
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

	$( document ).ready(function() {
		$("#zoom-reset").click(function(event){
			vis.transition()
		    .duration(750)
		    .call(zoom.transform, d3.zoomIdentity);
		});
	});
