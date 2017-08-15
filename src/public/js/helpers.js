	function getDomainForDashboardGraph(data, parameter) {
		var domain = {
			X : {
				min : -1,
				max : -1
			},
			Y : {
				min : -1,
				max : -1
			}
		};
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
				if (x[parameter] != 999)
					return (x[parameter]);
			});
			return a.concat(i);
		}, [])
		if(tempX.length == 0){
			domain.X.min = new Date().getTime()/1000;
			domain.X.max = (new Date().getTime()/1000) + (60*60);
		}else{
			domain.X.min = Math.min.apply(Math, tempX);
			domain.X.max = Math.max.apply(Math, tempX);
		}
		if (tempY.length == 0){
			domain.Y.min = 0;
			domain.Y.max = 100;
		}else{
			domain.Y.min = Math.min.apply(Math, tempY);
			domain.Y.max = Math.max.apply(Math, tempY);
		}
		return domain;
	}
	
	function setMinMaxforAssetGraph(values, latestTimeStamp) {
		var domain = {
			X : {
				min : 10000,
				max : -1
			},
			Y : {
				min : 10000,
				max : -1
			}
		};
		domain.X = {
			min : latestTimeStamp - (15 * 60),
			max : latestTimeStamp
		};
		var keys = Object.keys(values);
		for (var i = 0; i < keys.length; i++) {
			var min = values[keys[i]].Min || values[keys[i]];
			var max = values[keys[i]].Max || values[keys[i]];
			if (min < domain.Y.min)
				domain.Y.min = parseFloat((min - 0.2).toFixed(2));
			if (max > domain.Y.max)
				domain.Y.max = parseFloat((max + 0.2).toFixed(2));
		}
		return domain;
	}
	
	function reformatData(data, YAxis) {
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
					"yV" : t[b][YAxis]
				});
			}
			res.push(grp);
		}
		return res;
	}
	
	function timestampToTime(timestamp) {
		var date = new Date(timestamp * 1000);
		var hours = date.getHours();
		var minutes = "0" + date.getMinutes();
		return hours + ':' + minutes.substr(-2);
	}
	
	function assignColor(assets) {
		var colors = {};
		var length = Object.keys(assets).length;
		var index = 0;
		var keys = Object.keys(assets);
		keys.forEach(function(key, index) {
			colors[key] = getFixedColor(index, length);
			index++;
		});
		return colors;
	}
	
	function getFixedColor(index, total_num) {
		var startcolor = 0x00FF00; // green
		var endcolor = 0xFF0000; // red
		var steps = 0x000000;
	
		if (total_num <= 1) {
			steps = startcolor;
		} else {
			steps = (endcolor - startcolor) / (total_num - 1);
		}
		var calcolor = startcolor + index * steps;
		var hexstr = ("000000" + calcolor.toString(16)).substr(-6);
		return "#" + hexstr;
	}
	
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
			$(".sideLegend text[data-id*='" + key + "']").removeClass("disable");
	}