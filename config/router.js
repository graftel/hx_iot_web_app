module.exports = function(app,options){
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
	today.setHours(0,0,0,0);
	today = today.getTime()/1000;
	var startTime=0;
	var params = {
			  TableName: tables.rawData,
			  FilterExpression: "EpochTimeStamp >= :val",
			  ExpressionAttributeValues: {":val" : today },
			  Limit: 1
	};
	var startTime=0;
	var currTime;
	getStartTime();	
	var counter = 120;
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
	
	// Assets page routes
	app.get('/asset', function (req, res) {
		 if(typeof req.user == 'undefined'){
				res.redirect('/login');
			}
			else{
				var asset = req.query.asset;
				if(typeof asset == 'undefined'){
					return false;
				}
				res.render('pages' + path.sep + 'asset',{
					assets: assetIDs,
					asset: asset
				});
			}
		});
	 
	 app.post('/asset/detail', function (req, res) {
		 if(typeof req.user == 'undefined'){
				return false;
			}
			else{
			 	var asset = req.body.asset;
				var tube = req.body.tube;
				if(typeof asset == 'undefined'){
					return false;
				}
				var result = { latest: {T1: 79.50, T2: 78.50, T3: 77.60, T4: 56.7} , 
							   max: {T1: 79.50, T2: 78.50, T3: 77.60, T4: 56.7}, 
							   min: {T1: 79.50, T2: 78.50, T3: 77.60, T4: 56.7}, 
							   mean: {T1: 79.50, T2: 78.50, T3: 77.60, T4: 56.7}, 
							   measurement: {T1: 79.50, T2: 78.50, T3: 77.60, T4: 56.7}, 
							   sd: {T1: 79.50, T2: 78.50, T3: 77.60, T4: 56.7}, 
							   stability: {T1: 79.50, T2: 78.50, T3: 77.60, T4: 56.7}
							 }; 			
				res.end(JSON.stringify(result));
				}
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
					        ":v2a": currTime,
					        ":v2b": currTime + counter
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
		 currTime += counter;
	 }
	 
	 function getAssets(callback) {
		 HBEdetails = [], assets = [], assetIDs = []; // to empty any previous values stored 
		 var params = {
				    TableName : tables.assets,
				    ProjectionExpression: ["AssetID","DisplayName"]
				};
		 options.docClient.scan(params, function (err, data) {
			    if (err) {
			        console.error("Unable to scan the devices. Error JSON:", JSON.stringify(err, null, 2));
			    } else {
			    	console.log("Assets scan succesful.");
			    	assets = data.Items;
			    	assetIDs.push(assets.map(function(k){return k['AssetID']; }));
			    	assetIDs = assetIDs[0];
				    callback(simpleCallback);		
			    }
			});
		}
	 
		function getStartTime(){
			options.docClient.scan(params, function (err, data) {
			    if (err) {
			        console.error("Unable to scan time. Error JSON:", JSON.stringify(err, null, 2));
			    } else {
			    	if(data.Count > 0)
			    		startTime = data.Items[0].EpochTimeStamp;
			    	else
			    		startTime= 0;
			    	currTime=startTime;
			    }
			});
		}
	 
	 
}