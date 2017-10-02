
 var RadarChart = {
		  draw: function(id, d, options){
		    var cfg = {
		     radius: 5,
		     w: 600,
		     h: 600,
		     factor: 1,
		     factorLegend: .85,
		     levels: 3,
		     maxValue:2,
		     radians: 2 * Math.PI,
		     opacityArea: 0.5,
		     ToRight: 5,
		     TranslateX: 80,
		     TranslateY: 30,
		     ExtraWidthX: 100,
		     ExtraWidthY: 100,
		     color: d3.scaleOrdinal().range(["#6F257F", "#CA0D59"])
		    };

		    if('undefined' !== typeof options){
		      for(var i in options){
		      if('undefined' !== typeof options[i]){
		        cfg[i] = options[i];
		      }
		      }
		    }
			
		    cfg.maxValue = (domainY.max) - (domainY.min);

		    var allAxis = (d[0].map(function(i, j){return i.deviceid}));
		    var total = allAxis.length;
		    var radius = cfg.factor*Math.min(cfg.w/2, cfg.h/2);
		    var Format = d3.format('%');
		    d3.select(id).select("svg").remove();
		    var width = cfg.w+cfg.ExtraWidthX;
		    var height = cfg.h+cfg.ExtraWidthY;
		    var g = d3.select(id)
		        .append("svg")
		        .attr("width", "100%")
		        .attr("height", "100%")
		        .attr("viewBox", "0 0 "+width+" "+height)
		        .attr("preserveAspectRatio", "xMidYMid meet")
		        .append("g")
		        .attr("transform", "translate(" + cfg.TranslateX + "," + cfg.TranslateY + ")");

				var tooltip;

		    //Circular segments
		    for(var j=0; j<cfg.levels; j++){
		      var levelFactor = cfg.factor*radius*((j+1)/cfg.levels);
		      g.selectAll(".levels")
		       .data(allAxis)
		       .enter()
		       .append("svg:line")
		       .attr("x1", function(d, i){return levelFactor*(1-cfg.factor*Math.sin(i*cfg.radians/total));})
		       .attr("y1", function(d, i){return levelFactor*(1-cfg.factor*Math.cos(i*cfg.radians/total));})
		       .attr("x2", function(d, i){return levelFactor*(1-cfg.factor*Math.sin((i+1)*cfg.radians/total));})
		       .attr("y2", function(d, i){return levelFactor*(1-cfg.factor*Math.cos((i+1)*cfg.radians/total));})
		       .attr("class", "line")
		       .style("stroke", "grey")
		       .style("stroke-opacity", "0.75")
		       .style("stroke-width", "0.3px")
		       .attr("transform", "translate(" + (cfg.w/2-levelFactor) + ", " + (cfg.h/2-levelFactor) + ")");
		    }

		    //Text indicating at what % each level is
		    for(var j=0; j<cfg.levels; j++){
		      var levelFactor = cfg.factor*radius*((j+1)/cfg.levels);
		      g.selectAll(".levels")
		       .data([1]) //dummy data
		       .enter()
		       .append("svg:text")
		       .attr("x", function(d){return levelFactor*(1-cfg.factor*Math.sin(0));})
		       .attr("y", function(d){return levelFactor*(1-cfg.factor*Math.cos(0));})
		       .attr("class", "legend")
		       .style("font-family", "sans-serif")
		       .style("font-size", "10px")
		       .attr("transform", "translate(" + (cfg.w/2-levelFactor + cfg.ToRight) + ", " + (cfg.h/2-levelFactor) + ")")
		       .attr("fill", "#737373")
		       .text(function(d){
		    	 return  (domainY.min+((j+1)*cfg.maxValue/cfg.levels)).toFixed(2);
		       });
		    }

		    series = 0;

		    var axis = g.selectAll(".axis")
		        .data(allAxis)
		        .enter()
		        .append("g")
		        .attr("class", "axis");

		    axis.append("line")
		      .attr("x1", cfg.w/2)
		      .attr("y1", cfg.h/2)
		      .attr("x2", function(d, i){return cfg.w/2*(1-cfg.factor*Math.sin(i*cfg.radians/total));})
		      .attr("y2", function(d, i){return cfg.h/2*(1-cfg.factor*Math.cos(i*cfg.radians/total));})
		      .attr("class", "line")
		      .style("stroke", "grey")
		      .style("stroke-width", "1px");

		    axis.append("text")
		      .attr("class", "legend")
		      .text(function(d){return d})
		      .style("font-family", "sans-serif")
		      .style("font-size", "15px")
		      .attr("text-anchor", "middle")
		      .attr("dy", "1.5em")
		      .attr("transform", function(d, i){return "translate(0, -10)"})
		      .attr("x", function(d, i){return cfg.w/2*(1-cfg.factorLegend*Math.sin(i*cfg.radians/total))-60*Math.sin(i*cfg.radians/total);})
		      .attr("y", function(d, i){return cfg.h/2*(1-Math.cos(i*cfg.radians/total))-20*Math.cos(i*cfg.radians/total)-5;});


		    d.forEach(function(y, x){
		      dataValues = [];
		      g.selectAll(".nodes")
		      .data(y, function(j, i){
		        dataValues.push([
		        cfg.w/2*(1-(parseFloat(Math.max(j.value, 0))/cfg.maxValue)*cfg.factor*Math.sin(i*cfg.radians/total)),
		        cfg.h/2*(1-(parseFloat(Math.max(j.value, 0))/cfg.maxValue)*cfg.factor*Math.cos(i*cfg.radians/total))
		        ]);
		      });
		      dataValues.push(dataValues[0]);
		      g.selectAll(".area")
		             .data([dataValues])
		             .enter()
		             .append("polygon")
		             .attr("class", "radar-chart-serie"+series)
		             .style("stroke-width", "2px")
		             .style("stroke", cfg.color(series))
		             .attr("points",function(d) {
		               var str="";
		               for(var pti=0;pti<d.length;pti++){
		                 str=str+d[pti][0]+","+d[pti][1]+" ";
		               }
		               return str;
		              })
		             .style("fill", function(j, i){return cfg.color(series)})
		             .style("fill-opacity", cfg.opacityArea)
		             .on('mouseover', function (d){
		                      z = "polygon."+d3.select(this).attr("class");
		                      g.selectAll("polygon")
		                       .transition(200)
		                       .style("fill-opacity", 0.1);
		                      g.selectAll(z)
		                       .transition(200)
		                       .style("fill-opacity", .7);
		                      })
		             .on('mouseout', function(){
		                      g.selectAll("polygon")
		                       .transition(200)
		                       .style("fill-opacity", cfg.opacityArea);
		             });
		      series++;
		    });
		    series=0;
		    function res(k){
		    	var r;
		    	d[0].forEach(function(v){
			    	  if(v.deviceid == k) {
			    		  r = (domainY.min+v.value).toFixed(3);
			    	  }
			      }); 
		    	  return r;
		    }		    
		    axis.append("text")
		      .attr("class", "legend")
		      .text(function(k){ return "("+res(k)+")"; })
		      .style("font-family", "sans-serif")
		      .style("font-size", "15px")
		      .attr("text-anchor", "middle")
		      .attr("dy", "1.5em")
		      .attr("transform", function(d, i){return "translate(0, -10)"})
		      .attr("x", function(d, i){return cfg.w/2*(1-cfg.factorLegend*Math.sin(i*cfg.radians/total))-60*Math.sin(i*cfg.radians/total)+5+((i+1)%2)*50;})
		      .attr("y", function(d, i){return cfg.h/2*(1-Math.cos(i*cfg.radians/total))-20*Math.cos(i*cfg.radians/total)-5+((i)%2)*15;});
		    


		var tooltip = d3.select("body").append("div").attr("class", "toolTip");
		    d.forEach(function(y, x){
		      g.selectAll(".nodes")
		      .data(y).enter()
		      .append("svg:circle")
		      .attr("class", "radar-chart-serie"+series)
		      .attr('r', cfg.radius)
		      .attr("alt", function(j){return Math.max(j.value, 0)})
		      .attr("cx", function(j, i){
		        dataValues.push([
		        cfg.w/2*(1-(parseFloat(Math.max(j.value, 0))/cfg.maxValue)*cfg.factor*Math.sin(i*cfg.radians/total)),
		        cfg.h/2*(1-(parseFloat(Math.max(j.value, 0))/cfg.maxValue)*cfg.factor*Math.cos(i*cfg.radians/total))
		        ]);
		        return cfg.w/2*(1-(Math.max(j.value, 0)/cfg.maxValue)*cfg.factor*Math.sin(i*cfg.radians/total));
		      })
		      .attr("cy", function(j, i){
		        return cfg.h/2*(1-(Math.max(j.value, 0)/cfg.maxValue)*cfg.factor*Math.cos(i*cfg.radians/total));
		      })
		      .attr("data-id", function(j){return j.deviceid})
		      .style("fill", "#fff")
		      .style("stroke-width", "2px")
		      .style("stroke", cfg.color(series)).style("fill-opacity", .9)
		      .on('mouseover', function (d){
		            tooltip
		              .style("left", d3.event.pageX - 40 + "px")
		              .style("top", d3.event.pageY - 80 + "px")
		              .style("display", "inline-block")
		      				.html((d.deviceid) + "<br><span>" +((domainY.min+d.value).toFixed(3)) + "</span>");
		            })
		    		.on("mouseout", function(d){ tooltip.style("display", "none");});

		      series++;
		    });
		    }
		};
