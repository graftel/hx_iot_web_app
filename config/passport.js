module.exports = function(passport, LocalStrategy, docClient) {
	
	passport.use(new LocalStrategy(function(username, password, done) {
		var params = {
			TableName : "Users",
			KeyConditionExpression : "UserName = :un",
			FilterExpression : "Password = :pw",
			ExpressionAttributeValues : {
				":un" : username,
				":pw" : password
			},
			Select : "ALL_ATTRIBUTES"
		};
		docClient.query(params, function(err, data) {
			if (err) {
				console.error("Unable to query the Users table. Error JSON:", JSON
						.stringify(err, null, 2));
			} else {
				if (data.Items.length > 0)
					return done(null, {
						user : username
					});
				else
					return done(null, false, {
						message : 'Incorrect password.'
					});
			}
		});
	}));
	
	passport.serializeUser(function(user, done) {
		done(null, user);
	});
	
	passport.deserializeUser(function(user, done) {
		done(null, user);
	});
}