module.exports = function(app,options){
	
	var devicesDetails = [], deviceIDs = [];
	var startTime = 1498570765;
	var currTime = startTime;
	var endTime = 1498574189;
	var counter = 60;
	var dynamodb = new options.AWS.DynamoDB();
	
	const path = require("path");
	var functionThree;
	 
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
				  TableName: "Users",
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
	 
	app.get('/', function (req, res) {
		if(typeof req.session.passport == 'undefined'){
			res.redirect('/login');
		}
		else{
			functionTwo(functionOne);
			functionThree = function(){
				if(devicesDetails.length == deviceIDs.length){		
					res.render('pages' + path.sep + 'index', {
						assets: deviceIDs,
						warnings: 0,
						alerts: 4,
						predictions: 1,
						counter: counter,
						data: {"currTime" : currTime, "data": devicesDetails }
					});
				}
			}
		}
	});

	app.post('/live', function (req, res) {
	//	if(currTime>=endTime){
		//	res.status(404).send("Oh uh, something went wrong");
	//	}
		
		functionOne( functionThree = function(){
			if(devicesDetails.length == 0 ){
				res.status(404).send("Oh uh, something went wrong");
			}
			if(devicesDetails.length == deviceIDs.length){
				res.end(JSON.stringify({"currTime" : currTime, "data": devicesDetails }));
			}
		});
	});
	 	 
	var functionOne = function(callback) { 
		 var params;
		 devicesDetails=[];
		 
		 for(device of deviceIDs)(function(device){
		 	 var obj = new Object();
			 params = {
					 	TableName : "Hx.RawData",
					    ExpressionAttributeNames: {"#T":"EpochTimeStamp"},
					    // ProjectionExpression: "DeviceID, #T, #V",
					    KeyConditionExpression: "DeviceID = :v1 AND #T BETWEEN :v2a and :v2b",
					    ExpressionAttributeValues: {
					        ":v1": device,
					        ":v2a": currTime,
					        ":v2b": currTime + counter
					    },
					    Select: "ALL_ATTRIBUTES"
			 };
			 options.docClient.query(params, function (err, data) {
			 	    if (err) {
				        console.error("Unable to query the table. Error JSON:", JSON.stringify(err, null, 2));
				    } else {
				        console.log("Device Details query successful");
				        obj[device] = data.Items;
				        devicesDetails.push(obj);
				        callback();
				    }
			 });
		 })(device)
		 currTime += counter;
	 }
	 
	 function functionTwo(callback) {
		 devicesDetails = [];
		 deviceIDs = [];
		 var params = {
				    TableName : "Hx.DeviceConfiguration",
				    ProjectionExpression: "DeviceID"
				};
		 options.docClient.scan(params, function (err, data) {
			    if (err) {
			        console.error("Unable to scan the devices. Error JSON:", JSON.stringify(err, null, 2));
			    } else {
			    	console.log("Devices scan succesful.");
			    	var devicesList = data.Items;
			    	deviceIDs.push(devicesList.map(function(k){return k['DeviceID']; }));
			    	deviceIDs = deviceIDs[0];
				    callback(functionThree);		
			    }
			});
		}
	 
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
					assets: deviceIDs,
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
	 
}