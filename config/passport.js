module.exports = function(passport, LocalStrategy, docClient) {
	var base64 = require('base-64');
	passport.use(new LocalStrategy({
	    usernameField: 'email',
	    passwordField: 'password'
	  },function(email, password, done) {
		var params = {
			TableName : "Hx.Users",
			FilterExpression : "EmailAddress = :em AND Password = :pw",
			ExpressionAttributeValues : {
				":em" : email,
				":pw" : base64.encode(password)
			},
			Select : "ALL_ATTRIBUTES"
		};
		docClient.scan(params, function(err, data) {
			if (err) {
				console.error("Unable to query the Users table. Error JSON:", JSON
						.stringify(err, null, 2));
			} else {
				if (data.Items.length > 0)
					return done(null, {
						user : email,
						userid: data.Items[0].UserID
					});
				else
					return done(null, false, {
						message : 'Incorrect email or password.'
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