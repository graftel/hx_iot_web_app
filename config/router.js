module.exports = function(app,options){
	require('log-timestamp');
	var dynamodb = new options.AWS.DynamoDB();
	var math = require('mathjs');	
	const path = require("path");

	// declarations
	var tables = {
			company: "Hx.Company",
			users: "Hx.Users",
			assets: "Hx.Assets",
			deviceConfig: "Hx.DeviceConfiguration",
			rawData: "Hx.RawData",
			calculatedData: "Hx.CalculatedData",
			alerts: "Hx.Alerts",
			settings: "Hx.Settings"
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
	
	var settingOptions = [ "Ave_COLD_Inlet(F)",
							"Ave_COLD_Outlet(F)",
							"Ave_HOT_Inlet(F)",
							"Ave_HOT_Outlet(F)",
							"COLD_Avg_Temperature(F)",
							"COLD_DT(F)",
							"COLD_Density(lbm/ft3)",
							"COLD_Flow(gpm)",
							"COLD_Heat_Gain(Btu/hr)",
							"COLD_Mass_Flow(lbm/hr)",
							"COLD_Specific_Heat(Btu/lbm-F)",
							"HOT_Avg_Temperature(F)",
							"HOT_DT(F)",
							"HOT_Density_(lbm/ft3)",
							"HOT_Flow(gpm)",
							"HOT_Heat_Loss_(Btu/hr)",
							"HOT_Mass_Flow_(lbm/hr)",
							"HOT_Specific_Heat(Btu/lbm-F)",
							"Heat_Balance_Error(%)",
							"Heat_Balance_Error(Btu/hr)"
						 ];
	var HBEdetails = [], assets=[], assetIDs = [],mainParameter;
	var today = new Date();
	today = today.getTime()/1000;

	var startTime=0;
	var currTime;
	getStartTime();
	var simpleCallback;
	
	// Dashboard page routes
	app.get('/', function (req, res) {
		req.session.attempts = 0;
		if(typeof req.session.passport == 'undefined'){
			return res.redirect('/login');
		}
		else{
			var currentUserID = req.user.userid;
			getMainParameter(currentUserID);
			getAssets(getCalculatedValues);
			simpleCallback = function(){
				if(HBEdetails.length == assetIDs.length){
					var parameterlist = {	"#HBP": "Heat_Balance_Error(%)",
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
							console.error("Unable to get Instant data for Dashboard .(Route: GET '/' ) ERROR JSON:", JSON.stringify(err, null, 2));
						}
						else {
							return res.render('pages' + path.sep + 'index', {
								assets: assets,
								warnings: 0,
								alerts: 0,
								predictions: 1,
								mainParameter: mainParameter,
								data: HBEdetails,
								instData: res_inst
							});
						}
					});

				}
			}
		}
	});

	app.post('/getHBEdata', function (req, res) {
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
				 console.error("Unable to scan Instant data for Dashboard. (Route: POST /getHBEdata : var getInstData) ERROR JSON:", JSON.stringify(err, null, 2));
				 res(err,null);
			} else {

				if (data.Count == 0)
				{
					console.error("No assets available! (Route: POST /getHBEdata : var getInstData)");
					res("No assets availble!",null);
				}
				else {
						for(var item in data.Items)
						{
							(function(item){
								var inst_query_params = {
									TableName : tables.calculatedData,
									ExpressionAttributeNames: req,
									ProjectionExpression: "AssetID, EpochTimeStamp" + " , " + Object.keys(req).toString(),
									KeyConditionExpression: "AssetID = :v1 AND EpochTimeStamp = :v2",
								 ExpressionAttributeValues: {
										 ":v1": data.Items[item].AssetID,
										 ":v2":  data.Items[item].LastestTimeStamp
								 }
								};
								options.docClient.query(inst_query_params, function (err, dataq) {
										if (err) {
												console.error("Unable to query the table calculatedData for asset "+ data.Items[item].AssetID +". (Route: POST /getHBEdata : var getInstData) Error JSON:", JSON.stringify(err, null, 2));
												res(err,null);
										} else {
												if (dataq.Count == 1) // verify there is actually data inside
												{
													dataq.Items[0].DisplayName = data.Items[item].DisplayName;
													instData[item] = dataq.Items[0];													
												}else{
													instData[item] = { };													
												}
												if (datacount == data.Items.length - 1)
												{
													output.Items = instData;
													output.Parameters = req;
													output.Count = data.Items.length;
													res(null,output);
												}
												datacount++;
										}
								});
							})(item);
						}
				}
			}

		});
	};

	app.post('/instData', function (req, res) {
		if(typeof req.session.passport == 'undefined'){
			return res.status(440).send("Session expired! Login again.");
		}
			var parameterlist = {	"#HBP": "Heat_Balance_Error(%)",
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
					console.error("Unable to get Instant data for Dashboard: (Route: POST '/instData') ", JSON.stringify(err, null, 2));
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
				var calculatedDataParams = {
						TableName : tables.calculatedData,
						KeyConditionExpression: "AssetID = :v1",
						ExpressionAttributeValues: {
					        ":v1": assetid
					    },
					    ScanIndexForward: false,
					    Limit: 1
				};
				options.docClient.query(calculatedDataParams, function (err, data) {
			 	    if (err) {
				        console.error("Unable to query calculatedData for AssetID:"+assetid+". (Route: GET '/asset') Error JSON:", JSON.stringify(err, null, 2));
				    } else {
				        if(data.Items.length == 1){
							res.render('pages' + path.sep + 'asset',{
								assets: assets,
								asset: assetid,
								values: data.Items[0],
								plateNames: plateNames
							});
				        }else{
				        	console.error("Error with data of calculatedData for AssetID:"+assetid+" (Route: '/asset')");
				        	return res.redirect("/"); // TO DO: add error message to Dashboard
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
						return res.status(404).send("Oh uh, something went wrong");
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
			}else{
		 var userid = req.user.userid;
		 var params = {
				 TableName : tables.settings,
				 ProjectionExpression: ["Dashboard"],
				 KeyConditionExpression: "UserId = :v1",
				 ExpressionAttributeValues: {
				        ":v1": userid
				 },
				 Select: "SPECIFIC_ATTRIBUTES"
		 }
		 options.docClient.query(params, function (err, data) {
		 	    if (err) {
			        console.error("Unable to query the assets table. (getLatestRecordedTimeStamp) Error JSON:", JSON.stringify(err, null, 2));
			    } else {
			    	if(data.Count > 0)
			    		var mainParam = data.Items[0].Dashboard ;
			    	else
			    		var mainParam = 'Heat_Balance_Error(%)';
			    	res.render('pages' + path.sep + 'settings', {
						assets: assets,
						settingOptions: settingOptions,
						mainParam: mainParam
					});
			    }
		 });
		}
	 });
	 
	 app.post('/settings', function(req,res){
			var mainParam = req.body["main-param"];
			var userid = req.user.userid;
			if(userid){
				var settingsParams = {
					    TableName : tables.settings,
					    Key : {
							UserId : userid
						},
						UpdateExpression : "SET Dashboard = :v",
						ExpressionAttributeValues : {
							":v" : mainParam
						}
					};
			 options.docClient.update(settingsParams, function (err, data) {
				    if (err) {
				        console.error("Unable to scan the assets table.(getAssets) Error JSON:", JSON.stringify(err, null, 2));
				    } else {
				    	return res.redirect('/settings');
				    }
				});
			}
	 });
	 
	 app.get('/manageassets', function(req,res){
	    if(typeof req.session.passport == 'undefined'){
				res.status(440).send("Session expired! Login again.");
		}else{
			var devicedetails={};
			var renderPage = function(){
				res.render('pages' + path.sep + 'manageAssets', {
					assets: assets,
					devicedetails: devicedetails
				});
			};
			getAssets( function(){
				for(let asset of assetIDs){
					 var params = {
							 TableName : tables.deviceConfig,
							 ExpressionAttributeNames: { "#Ty": "Type", "#L": "Location", "#LD": "Location_Display", "#U": "Unit", "#O": "Orientation" },
							 FilterExpression: "ASSETID = :v2",
							 ProjectionExpression: ["DeviceID","#Ty","#L","#LD", "#U","#O"],
							 ExpressionAttributeValues: {
							        ":v2": asset
							 },
							 Select: "SPECIFIC_ATTRIBUTES"
					 }
					 options.docClient.scan(params, function (err, data) {
					 	    if (err) {
						        console.error("Unable to query the assets table. Error JSON:", JSON.stringify(err, null, 2));
						    } else {
						    	devicedetails[asset] = data.Items;
						    	if(Object.keys(devicedetails).length == assetIDs.length){
						    		renderPage();
						    	}						    		
						    }
					 }); // end of scan function
				} // end of for loop
			}); // end of getAssets call
			}
	 });
	 
	 app.post('/asset/add', function(req,res){
		 if(typeof req.session.passport == 'undefined'){
				res.status(440).send("Session expired! Action failed. Please login again and continue.");
		}else{
			var assetid = req.body["assetid"];
			var displayName = req.body["display-name"];
			var deviceData = req.body;
			delete deviceData["assetid"];
			delete deviceData["display-name"];
			var assetsParams = {
					TableName : tables.assets,
					Item : {
						AssetID: assetid,
						DisplayName: displayName,
						AddTimeStamp: Math.floor((new Date).getTime()/1000),
						LastestTimeStamp: Math.floor((new Date).getTime()/1000)
					},
					ConditionExpression : "attribute_not_exists(AssetID)"
				};
				options.docClient.put(assetsParams, function(err, data) {
					if (err) {
						console.error("Unable to add new asset to Assets table. (Route POST '/asset/add' ) Error JSON:", JSON.stringify(err, null, 2));
						return res.redirect('/manageassets');
					}else{
						var items = formatNewDevicesFormData(deviceData, assetid);
						batchInsertNewDevices(items);
					}	
				});
		}
	 });
	 
	 app.post('/asset/manage', function(req,res){
		    if(typeof req.session.passport == 'undefined'){
					res.status(440).send("Session expired! Login again.");
			}else{
				var inputs = req.body;
				var assetid = inputs["assetid"];
				var displayName = inputs["display-name"];
				delete inputs["assetid"];
				delete inputs["display-name"];
				var values = {};
				Object.keys(inputs).forEach(function(key){
					var temp = key.split("-");
					values[temp[0]] = values[temp[0]] || {};
					values[temp[0]][temp[1]] = inputs[key];					
				});
				var deviceConfigParams = {  "RequestItems": { } };
				deviceConfigParams["RequestItems"][tables.deviceConfig] = [];				
				var items = [];
				Object.keys(values).forEach(function(deviceid){
					var item = { 								
									DeviceID: deviceid,
									ASSETID: assetid,						
									Type: values[deviceid]["Type"],
									Location: values[deviceid]["Location"],
									Location_Display: values[deviceid]["Location_Display"],
									Unit: values[deviceid]["Unit"],
									Orientation: values[deviceid]["Orientation"]					
								};
					items.push(item);					
				});
				batchInsertNewDevices(items);
				return res.redirect('/manageassets');
			}
		 });
	 
	 app.post('/device/delete', function(req,res){
		    if(typeof req.session.passport == 'undefined'){
					res.status(440).send("Session expired! Login again.");
			}else{
				var deviceid = req.body.deviceid;
				var type = req.body.type;
				if(deviceid){
					var params = {
						    TableName: tables.deviceConfig,
						    Key:{
						    	DeviceID: deviceid,
						    	Type: type
						    }						    
						};
						options.docClient.delete(params, function(err, data) {
						    if (err) {
						        console.error("Unable to delete item. (POST /device/delete) Error JSON:", JSON.stringify(err, null, 2));
						        res.status(404).send("Delete failed");
						    } else {
						        res.end("success");
						    }
						});
				}				
			}
		 });

	 app.get('/asset/delete', function(req,res){
		    if(typeof req.session.passport == 'undefined'){
					res.status(440).send("Session expired! Login again.");
			}else{
				console.log(req.query);
				return res.redirect('/manageassets');
			}
		 });

	// Helper Methods
	var getCalculatedValues = function(callback) {
		 var params;
		 HBEdetails=[];
		 var curtime = new Date() / 1000;
		 for(device of assetIDs)(
			function(device){
				var assetsParams = {
				 	TableName: tables.assets,
					FilterExpression: "AssetID = :v1",
					ExpressionAttributeValues: {
						":v1": device
						}
					};
			 options.docClient.scan(assetsParams, function(err,data_assets){
				 if (err) {
						console.error("Unable to scan Assets table for AssetID:"+device+". ERROR JSON:", JSON.stringify(err, null, 2));
						res(err,null);
				 } else {
					 					 var obj = new Object();
					 					 var calculatedDataParams = {
												 	TableName : tables.calculatedData,
												    ExpressionAttributeNames: {"#T":"EpochTimeStamp", "#E": mainParameter},
												    ProjectionExpression: "AssetID, #T, #E",
												    KeyConditionExpression: "AssetID = :v1 AND #T BETWEEN :v2a and :v2b",
												    ExpressionAttributeValues: {
												        ":v1": device,
												        ":v2a": curtime - 3600,
												        ":v2b": curtime
												    },
												    Select: "SPECIFIC_ATTRIBUTES"
										 };
										 options.docClient.query(calculatedDataParams, function (err, data) {
										 	    if (err) {
											        console.error("Unable to query calculatedData table for Asset "+device+". (getCalculatedValues) Error JSON:", JSON.stringify(err, null, 2));
											    } else {
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
		 var assetsParams = {
				    TableName : tables.assets,
				    ProjectionExpression: ["AssetID","DisplayName"]
				};
		 options.docClient.scan(assetsParams, function (err, data) {
			    if (err) {
			        console.error("Unable to scan the assets table.(getAssets) Error JSON:", JSON.stringify(err, null, 2));
			    } else {
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
			        console.error("Unable to query the assets table. (getLatestRecordedTimeStamp) Error JSON:", JSON.stringify(err, null, 2));
			    } else {
			    	   latestTimeStamp = data.Items[0].LastestTimeStamp;
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
	 
	 function getMainParameter(userid){
		 var settingsParams = {
				 TableName : tables.settings,
				 ProjectionExpression: "Dashboard",
				 KeyConditionExpression: "UserId = :v1",
				 ExpressionAttributeValues: {
				        ":v1": userid
				 },
				 Select: "SPECIFIC_ATTRIBUTES"
		 };
		 options.docClient.query(settingsParams, function (err, data) {
		 	    if (err) {
			        console.error("Unable to query the settings table. (getMainParameter) Error JSON:", JSON.stringify(err, null, 2));
			    } else {
			    	if(data.Count > 0)
			    		mainParameter = data.Items[0].Dashboard;
			    	else
			    		mainParameter = 'Heat_Balance_Error(%)'; 
			    }
		 });
	 }
	 
	 function formatNewDevicesFormData(deviceData, assetid){
		 var keys = Object.keys(deviceData);
			var indexes = [];
			keys.map(function(key){ var index = key.split("-")[0]; if(indexes.indexOf(index) === -1 )  indexes.push(index)});
			var items = [];
			indexes.forEach(function(index){
				var item = {};
				item["DeviceID"] = deviceData[index+"-DeviceID"];
				item["Type"] = deviceData[index+"-Type"];
				item["Location"] = deviceData[index+"-Location"];
				item["Location_Display"] = deviceData[index+"-Location_Display"];
				item["Unit"] = deviceData[index+"-Unit"];
				item["Orientation"] = deviceData[index+"-Orientation"];
				item["ASSETID"] = assetid;
				items.push(item);
			});
			return items;
	 }
	 
	 function batchInsertNewDevices(items){
		 var deviceConfigParams = {  "RequestItems": { } };
			deviceConfigParams["RequestItems"][tables.deviceConfig] = [];				
			
			items.forEach(function(item){
				var tempObj = {};
				tempObj["PutRequest"] = { "Item": {} };
				tempObj["PutRequest"]["Item"] = item;
				deviceConfigParams["RequestItems"][tables.deviceConfig].push(tempObj);
			});
			options.docClient.batchWrite(deviceConfigParams, function(err, data) {
				if (err) {
					console.error("Unable to insert into the Devices table. (Function batchInsertNewDevices ) Error JSON:", JSON.stringify(err, null, 2));
				}
			});
	 }
}
