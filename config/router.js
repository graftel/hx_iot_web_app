module.exports = function(app,options){
	var math = require('mathjs');

	// declarations
	var tables = {
			company: "Hx.Company",
			users: "Hx.Users",
			assets: "Hx.Assets",
			deviceConfig: "Hx.DeviceConfiguration",
			rawData: "Hx.RawData",
			calculatedData: "Hx.CalculatedData",
			alerts: "Hx.Alerts"
	};
	var plateNames = {
			"GT_HX_170101" : {
				"HOT_IN": "01A003",
				"HOT_OUT": "01A004",
				"COLD_IN": "01A001",
				"COLD_OUT": "01A002"
			},
			"GT_HX_170102" : {
				"HOT_IN": "01A007",
				"HOT_OUT": "01A008",
				"COLD_IN": "01A005",
				"COLD_OUT": "01A006"
			}
	};
	var HBEdetails = [], assets=[], assetIDs = [];
	var today = new Date();
	//today.setHours(0,0,0,0);
	today = today.getTime()/1000;
	var params = {
			  TableName: tables.rawData,
			  FilterExpression: "EpochTimeStamp >= :val",
			  ExpressionAttributeValues: {":val" : today },
			  Limit: 1
	};
	var startTime=0;
	var currTime;
	getStartTime();
	var counter = 60*60;
	var dynamodb = new options.AWS.DynamoDB();
	const path = require("path");
	var simpleCallback;

	// User Management Routes
	app.get('/login', function (req, res) {
		 res.render('pages' + path.sep + 'login');
	});

	app.post('/login',
			  options.passport.authenticate('local'),
			  function(req, res) {
			    res.redirect('/');
	});

	app.get('/logout', function(req, res){
		  req.logout();
		  res.redirect('/login');
	});

	app.post('/register', function(req, res){
		 var username = req.body.username;
		 var password = req.body.password;
		 var params = {
				  TableName: tables.users,
				  Item: {
					  UserName: username,
					  Password: password
				  },
				  ConditionExpression: "attribute_not_exists(UserName)"
		  };
		 options.docClient.put(params, function (err, data) {
			    if (err) {
			        console.error("Unable to insert user into the table. Error JSON:", JSON.stringify(err, null, 2));
			    } else {
			        console.log("Inserted User Successfully.");
			    }
			});
		 res.redirect('/login');
	});

	// Dashboard page routes
	app.get('/', function (req, res) {
		if(typeof req.session.passport == 'undefined'){
			res.redirect('/login');
		}
		else{
			getAssets(getCalculatedValues);
			simpleCallback = function(){
				if(HBEdetails.length == assetIDs.length){
					var parameterlist = {"#HBP": "Heat_Balance_Error(%)",
															 "#HBE": "Heat_Balance_Error(Btu/hr)",
															 "#HMF":"HOT_Mass_Flow_(lbm/hr)",
															 "#HSH":"HOT_Specific_Heat(Btu/lbm-F)",
															 "#HHL":"HOT_Heat_Loss_(Btu/hr)",
															 "#CMF":"COLD_Mass_Flow(lbm/hr)",
															 "#CSH":"COLD_Specific_Heat(Btu/lbm-F)",
															 "#CHG":"COLD_Heat_Gain(Btu/hr)"
														 };
					getInstData(parameterlist,function(err, res_inst){
						if (err)
						{
							console.log(err);
						}
						else {
							res.render('pages' + path.sep + 'index', {
								assets: assets,
								warnings: 0,
								alerts: 0,
								predictions: 1,
								counter: counter,
								data: HBEdetails,
								instData: res_inst
							});
						}
					});

				}
			}
		}
	});

	app.post('/live', function (req, res) {
	//	if(currTime>=endTime){
		//	res.status(404).send("Oh uh, something went wrong");
	//	}
		if(typeof req.session.passport == 'undefined'){
			res.status(440).send("Session expired! Login again");
		}
		getCalculatedValues(simpleCallback = function(){
			if(HBEdetails.length == 0 ){
				res.status(404).send("Oh uh, something went wrong");
			}
			if(HBEdetails.length == assetIDs.length){
				res.end(JSON.stringify( {data: HBEdetails,assets:assets}));
			}
		});
	});

	var getInstData = function(req,res){
		var instData = [];
		var datacount = 0;
		var output = {};
		var inst_scan_params = {
			TableName : tables.assets
		};// to do: bond to company
		options.docClient.scan(inst_scan_params, function(err,data){
			if (err) {
				 console.error("unbable to scan the query . ERROR JSON:", JSON.stringify(err, null, 2));
				 res(err,null);
			} else {

				if (data.Count == 0)
				{
					console.error("no assets availble!");
					res("no assets availble!",null);
				}
				else {
						for(var item in data.Items)
						{
							(function(item){
								var inst_query_params = {
									TableName : tables.calculatedData,
//									ExpressionAttributeNames: {"#T":"EpochTimeStamp", "#HBP": "Heat_Balance_Error(%)", "#HBE": "Heat_Balance_Error(Btu/hr)", "#DN": "DisplayName"},
//									ProjectionExpression: "AssetID, EpochTimeStamp" + "," + req.toString(),
									ExpressionAttributeNames: req,
									ProjectionExpression: "AssetID, EpochTimeStamp" + " , " + Object.keys(req).toString(),
									KeyConditionExpression: "AssetID = :v1 AND EpochTimeStamp = :v2",
								 ExpressionAttributeValues: {
										 ":v1": data.Items[item].AssetID,
										 ":v2":  data.Items[item].LastestTimeStamp
								 }
									//Select: "SPECIFIC_ATTRIBUTES"
								};
					//			console.log(inst_query_params);
								options.docClient.query(inst_query_params, function (err, dataq) {
										if (err) {
												console.error("Unable to query the table. Error JSON:", JSON.stringify(err, null, 2));
												res(err,null);
										} else {
												if (dataq.Count == 1) // verify there is actually data inside
												{
													dataq.Items[0].DisplayName = data.Items[item].DisplayName;
													instData[item] = dataq.Items[0];
													if (datacount == data.Items.length - 1)
													{
														//res.end(JSON.stringify(instData));
														output.Items = instData;
														output.Parameters = req;
														output.Count = data.Items.length;
														res(null,output);
													}
													datacount++;
												}
										}
								});
							})(item);
						}
				}
		//		for ()

		//		options.docClient.query

			}

		});
	};

	app.post('/instData', function (req, res) {
		if(typeof req.session.passport == 'undefined'){
			return res.status(440).send("Session expired! Login again.");
		}
			var parameterlist = {"#HBP": "Heat_Balance_Error(%)",
													 "#HBE": "Heat_Balance_Error(Btu/hr)",
													 "#HMF":"HOT_Mass_Flow_(lbm/hr)",
												 	 "#HSH":"HOT_Specific_Heat(Btu/lbm-F)",
												 	 "#HHL":"HOT_Heat_Loss_(Btu/hr)",
												 	 "#CMF":"COLD_Mass_Flow(lbm/hr)",
									 			 	 "#CSH":"COLD_Specific_Heat(Btu/lbm-F)",
													 "#CHG":"COLD_Heat_Gain(Btu/hr)"
												 };
			getInstData(parameterlist, function(err, res1) {
				if (err)
				{
					console.error(err);
				}
				else{
				//	new EJS({url: 'comments.ejs'}).update('element_id', '/comments.json')
						res.end(JSON.stringify(res1));
				}
			});
	});

	// Assets page routes
	app.get('/asset', function (req, res) {
		if(typeof req.session.passport == 'undefined'){
			res.status(440).send("Session expired! Login again.");
		}
			else{
				var assetid = req.query.asset;
				if(typeof assetid == 'undefined'){
					return false;
				}
				var params = {
						TableName : tables.calculatedData,
						KeyConditionExpression: "AssetID = :v1",
						ExpressionAttributeValues: {
					        ":v1": assetid
					    },
					    ScanIndexForward: false,
					    Limit: 1
				};
				options.docClient.query(params, function (err, data) {
			 	    if (err) {
				        console.error("Unable to query recent data. Error JSON:", JSON.stringify(err, null, 2));
				    } else {
				        if(data.Items.length == 1){
							res.render('pages' + path.sep + 'asset',{
								assets: assets,
								asset: assetid,
								values: data.Items[0],
								plateNames: plateNames
							});
				        }else{
				        	console.log("Data pulled not correct");
				        }
			    }
			});
			}
		});

	var latestTimeStamp = 0, deviceids, calculations, rawValues = [], latestRawValues = [], calculations = {};

	 app.post('/asset/detail', function (req, res) {
			if(typeof req.session.passport == 'undefined'){
				res.status(440).send("Session expired! Login again.");
			}
			else{
				 	var assetid = req.body.asset;
					var parameter = req.body.parameter;
					var location = req.body.location;
					if(typeof assetid == 'undefined' || typeof parameter == 'undefined'){
						return false;
					}
					 rawValues = []; calculations = {}; latestRawValues = {};
					// step 1 - get latest timestamp from assets table for given asset
					// step 2 - get device ids with given asset id and clicked parameter
					// step 3 - get last one hour raw data from given timestamp
					// step 4 - calculate values

					getLatestRecordedTimeStamp(assetid,parameter,location,getDevicesForAsset,sendData=function(){
						res.end(JSON.stringify([latestRawValues,calculations,rawValues,latestTimeStamp]));
					});
				}
		});

	 // Settings route
	 app.get('/settings', function(req,res){
			if(typeof req.session.passport == 'undefined'){
				res.status(440).send("Session expired! Login again.");
			}
		 res.render('pages' + path.sep + 'settings', {
				assets: assets
			});
	 });

	// Helper Methods
	var getCalculatedValues = function(callback) {
		 var params;
		 HBEdetails=[];
		 var curtime = new Date() / 1000;
		 for(device of assetIDs)(function(device){
			 var scan_params = {
				 	TableName: tables.assets,
					FilterExpression: "AssetID = :v1",
					ExpressionAttributeValues: {
						":v1": device
					}
			 };
			 options.docClient.scan(scan_params, function(err,data_assets){
				 if (err) {
						console.error("Unable to scan the query . ERROR JSON:", JSON.stringify(err, null, 2));
						res(err,null);
				 } else {
					 					 var obj = new Object();
										 params = {
												 	TableName : tables.calculatedData,
												    ExpressionAttributeNames: {"#T":"EpochTimeStamp", "#E": "Heat_Balance_Error(%)"},
												    ProjectionExpression: "AssetID, #T, #E",
												    KeyConditionExpression: "AssetID = :v1 AND #T BETWEEN :v2a and :v2b",
												    ExpressionAttributeValues: {
												        ":v1": device,
												        ":v2a": curtime - 3600,
												        ":v2b": curtime
												    },
												    Select: "SPECIFIC_ATTRIBUTES"
										 };
										 options.docClient.query(params, function (err, data) {
										 	    if (err) {
											        console.error("Unable to query the table. Error JSON:", JSON.stringify(err, null, 2));
											    } else {
											        //console.log("Device Details query successful");
															//console.log(data);
												        obj[device] = data.Items;
												        HBEdetails.push(obj);
											        callback();
											    }
										 });
					 }
				 });
		 })(device)
	 }

	 function getAssets(callback) {
		 HBEdetails = [], assets = {}, assetIDs = []; // to empty any previous values stored
		 var params = {
				    TableName : tables.assets,
				    ProjectionExpression: ["AssetID","DisplayName"]
				};
		 options.docClient.scan(params, function (err, data) {
			    if (err) {
			        console.error("Unable to scan the devices. Error JSON:", JSON.stringify(err, null, 2));
			    } else {
			    	//console.log("Assets scan succesful.");
			    	//assets = data.Items;
			    	for(item in data.Items){
			    		assets[data.Items[item].AssetID] = data.Items[item].DisplayName;
			    		assetIDs.push(data.Items[item].AssetID);
			    	}
				    callback(simpleCallback);
			    }
			});
		}

	 function getLatestRecordedTimeStamp(assetid,parameter,location,callback,sendData){
		 var params = {
				 TableName : tables.assets,
				 ExpressionAttributeNames: {"#T":"LastestTimeStamp"},
				 ProjectionExpression: "#T",
				 KeyConditionExpression: "AssetID = :v1",
				 ExpressionAttributeValues: {
				        ":v1": assetid
				 },
				 Select: "SPECIFIC_ATTRIBUTES"
		 }
		 options.docClient.query(params, function (err, data) {
		 	    if (err) {
			        console.error("Unable to query the assets table. Error JSON:", JSON.stringify(err, null, 2));
			    } else {
			    	   latestTimeStamp = data.Items[0].LastestTimeStamp;
			    	   //console.log("got latest timestamp "+data.Items[0].LastestTimeStamp);
			  		   callback(assetid,parameter,location,getRecentRawdata,sendData);
			    }
		 });
	 }

	 function getDevicesForAsset(assetid,parameter,location,callback,sendData){
		 var params = {
				 TableName : tables.deviceConfig,
				 ExpressionAttributeNames: { "#Ty": "Type", "#L": "Location" },
				 FilterExpression: "#Ty = :v1 and ASSETID = :v2 and #L = :v3",
				 ProjectionExpression: "DeviceID",
				 ExpressionAttributeValues: {
				        ":v1": parameter,
				        ":v2": assetid,
				        ":v3": location
				 },
				 Select: "SPECIFIC_ATTRIBUTES"
		 }
		 options.docClient.scan(params, function (err, data) {
		 	    if (err) {
			        console.error("Unable to query the assets table. Error JSON:", JSON.stringify(err, null, 2));
			    } else {
			    	deviceids = data.Items.map(function(d){ return d.DeviceID });
					callback(calculateDeviceValues,sendData);
			    }
		 });
	 }

	 function getRecentRawdata(callback,sendData){
		 rawValues = [];
		 var counter = 0;
		 if(deviceids.length == 0){
			 console.log("Length of deviceids is 0");
			 sendData();
		 }
		 deviceids.forEach(function(deviceid,index){
			 var params = {
					 TableName : tables.rawData,
					 ExpressionAttributeNames: { "#V": "Value" },
					 KeyConditionExpression: "DeviceID = :v1 and EpochTimeStamp BETWEEN :v2 and :v3",
					 ProjectionExpression: "EpochTimeStamp, #V",
					 ExpressionAttributeValues: {
					        ":v1": deviceid,
					        ":v2": latestTimeStamp - (15*60),
					        ":v3": latestTimeStamp
					 },
					 Select: "SPECIFIC_ATTRIBUTES"
			 }
			 options.docClient.query(params, function (err, data) {
			 	    if (err) {
				        console.error("Unable to query the assets table. Error JSON:", JSON.stringify(err, null, 2));
				    } else {
				    		var tempObj = {};
				    		tempObj[deviceid] = data.Items;
				    		rawValues.push(tempObj);
				    		counter++;
				    		if(counter == deviceids.length)
				    			callback(rawValues,sendData);
				    }
			 });
		 });
	 }

	 function calculateDeviceValues(values,callback){
		 	calculations = {}; latestRawValues = {};
		 	values.forEach(function(d){
		 		var key = Object.keys(d)[0];
		 		var vals = d[key];
		 		vals.map(function(val){ if(val.EpochTimeStamp == latestTimeStamp ) { latestRawValues[key] = val.Value; } });
		 		calculations[key] = {
		 				"LatestValue": Math.max.apply(Math,vals.map(function(o){return o.Value+0.5;})),
		 				"Max": Math.max.apply(Math,vals.map(function(o){return o.Value;})),
		 				"Min": Math.min.apply(Math,vals.map(function(o){return o.Value;})),
		 				"Mean": math.mean.apply(math,vals.map(function(o){return o.Value;})),
		 				"Uncertainity": math.std.apply(math,vals.map(function(o){return o.Value;})),
		 				"Std": math.std.apply(math,vals.map(function(o){return o.Value;})),
		 				"Stability": math.std.apply(math,vals.map(function(o){return o.Value;}))
		 		}
		 	});
		 	callback();
	 }

	 function getStartTime(){
/*			options.docClient.scan(params, function (err, data) {
			    if (err) {
			        console.error("Unable to scan time. Error JSON:", JSON.stringify(err, null, 2));
			    } else {
			    	if(data.Count > 0)
			    		startTime = data.Items[0].EpochTimeStamp;
			    	else
			    		startTime= 0;
			    	startTime = 1499850224;
			    	currTime=startTime;
			    }
			});*/
			startTime = today - (2*60);
			currTime=startTime;
	}
}
