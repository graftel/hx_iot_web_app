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
					res.render('pages' + path.sep + 'index', {
						assets: assets,
						warnings: 0,
						alerts: 4,
						predictions: 1,
						counter: counter,
						data: HBEdetails
					});
				}
			}
		}
	});

	app.post('/live', function (req, res) {
	//	if(currTime>=endTime){
		//	res.status(404).send("Oh uh, something went wrong");
	//	}

		getCalculatedValues(simpleCallback = function(){
			if(HBEdetails.length == 0 ){
				res.status(404).send("Oh uh, something went wrong");
			}
			if(HBEdetails.length == assetIDs.length){
				res.end(JSON.stringify( HBEdetails ));
			}
		});
	});

	app.post('/getInstantData', function (req, res) {
	//	if(currTime>=endTime){
		//	res.status(404).send("Oh uh, something went wrong");
	//	}

		getCalculatedValues(simpleCallback = function(){
			if(HBEdetails.length == 0 ){
				res.end(null);
			}
			if(HBEdetails.length == assetIDs.length){
				res.end(JSON.stringify( HBEdetails ));
			}
		});
	});

	// Assets page routes
	app.get('/asset', function (req, res) {
		 if(typeof req.user == 'undefined'){
				res.redirect('/login');
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
								values: data.Items[0]
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
		 if(typeof req.user == 'undefined'){
				return false;
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
		 res.render('pages' + path.sep + 'settings');
	 });

	// Helper Methods
	var getCalculatedValues = function(callback) {
		 var params;
		 HBEdetails=[];

		 for(device of assetIDs)(function(device){
		 	 var obj = new Object();
			 params = {
					 	TableName : tables.calculatedData,
					    ExpressionAttributeNames: {"#T":"EpochTimeStamp", "#E": "Heat_Balance_Error(%)"},
					    ProjectionExpression: "AssetID, #T, #E",
					    KeyConditionExpression: "AssetID = :v1 AND #T BETWEEN :v2a and :v2b",
					    ExpressionAttributeValues: {
					        ":v1": device,
					        ":v2a": currTime - counter,
					        ":v2b": currTime
					    },
					    Select: "SPECIFIC_ATTRIBUTES"
			 };
			 options.docClient.query(params, function (err, data) {
			 	    if (err) {
				        console.error("Unable to query the table. Error JSON:", JSON.stringify(err, null, 2));
				    } else {
				        console.log("Device Details query successful");
				        obj[device] = data.Items;
				        HBEdetails.push(obj);
				        callback();
				    }
			 });
		 })(device)
		 currTime += 10*60;
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
			    	console.log("Assets scan succesful.");
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
			    	   console.log("got latest timestamp "+data.Items[0].LastestTimeStamp);
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
