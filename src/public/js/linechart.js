function drawDashboardLineChart(inData) {

var margin = {
  top: 20,
  right: 80,
  bottom: 30,
  left: 50
},
width = 900 - margin.left - margin.right,
height = 500 - margin.top - margin.botom;

var myData = {"Items":
              [
                {"Time": 1499953428, "ASSET1": 4.770876940022415, "ASSET2": 6.100765399591436},
                {"Time": 1499953488, "ASSET1": 4.15282980474972, "ASSET2": 6.2},
                {"Time": 1499953548, "ASSET1": 0.46928588133090066, "ASSET2": 6.3},
                {"Time": 1499953608, "ASSET1": 2.9509166295391056, "ASSET2": 6.2},
                {"Time": 1499953668, "ASSET1": 2.0758281545257167, "ASSET2": 6.3},
                {"Time": 1499953728, "ASSET1": 0.7179634074671896, "ASSET2": 6.1},
                {"Time": 1499953788, "ASSET1": 0.8330908687866172, "ASSET2": 6.4},
                {"Time": 1499953848, "ASSET1": 0.6210364056813759, "ASSET2": 6.1},
                {"Time": 1499953908, "ASSET1": 3.480294509780996, "ASSET2": 6.3},
                {"Time": 1499953968, "ASSET1": 7.3922681460221735, "ASSET2": 6.4}
                ], "DataName": "Heat Balance Error (%)"
              };

  var vis = d3.select("#dashboard-line-chart-div").append("svg")
              .attr("width", width + margin.left + margin.right)
              .attr("height", height + margin.top + margin.bottom)
              .append("g")
              .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var data = inData.data;
  var assets = inData.assets;
	var res = reformatData(data);

  setMinMaxforAxis(data);

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
