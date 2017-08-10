module.exports = function(app, options) {
	require('log-timestamp');
	const path = require("path");
	var request = require("request");
	var base64 = require('base-64');
	
	// User Management Routes
	app.get('/login', function(req, res) {
		var param = req.query;
		var showCaptcha = false;
		if(req.session.attempts >= 3)
			showCaptcha = true;
		return res.render('pages' + path.sep + 'login',{
			showCaptcha : showCaptcha,
			message: param.message
		});
	});

	app.post('/login', function(req, res, next) {
		  options.passport.authenticate('local', function(err, user, info) {
			  if(req.session.attempts >= 3 ){
				  if(req.body['g-recaptcha-response'] === undefined || req.body['g-recaptcha-response'] === '' || req.body['g-recaptcha-response'] === null) {
				    return res.redirect('/login?message=Please select Capthca to confirm you are human.');
				  }
				  
				  var secretKey = "6LdeZCoUAAAAAMf-0Z95nShHHAm0djcmefFvaRt7";
				  var verificationUrl = "https://www.google.com/recaptcha/api/siteverify?secret=" + secretKey + "&response=" + req.body['g-recaptcha-response'] + "&remoteip=" + req.connection.remoteAddress;
				  
				  request(verificationUrl,function(error,response,body) { // reCaptcha verification
					    body = JSON.parse(body);
					    
					    if (body.success !== undefined && !body.success) {
					    	if(!req.session.attempts)
					    		req.session.attempts = 0;
					    	req.session.attempts += 1;
					    	return res.redirect('/login?message=Selected Captcha is invalid. Please try again');
					    }
				  });
			  }
		      if(!user || new Date(user.Expiry) >= new Date()) {
					  if(!req.session.attempts)
						  req.session.attempts = 0;
				      req.session.attempts += 1;
				      return res.redirect('/login?message='+info.message); 
			  }
			  req.logIn(user, function(err) {
				  return res.redirect('/');
			  });
		  })(req, res, next);
		});

	app.get('/logout', function(req, res) {
		req.logOut();
		req.session.destroy();
		return res.redirect('/login');
	});

	app.get('/forgotpassword', function(req, res) {
		res.render('pages' + path.sep + 'forgotPassword');
	});

/*	app.get('/forgotusername', function(req, res) {
		res.render('pages' + path.sep + 'forgotUsername');
	});*/

	app.post('/forgotpassword',
					function(req, res) {
						var emailid = req.body.email;
						if(emailid){
							sendForgotPasswordEmail(emailid);
							res.render('pages' + path.sep + 'showMessage',
											{
												title: "Forgot Password",
												message : "You shall receive an email to your registered email id soon. Click on the link provided in the email to reset your password. "
														+ "Please note that password link expires in 24 hours."
											});
						}else{
							res.render('pages' + path.sep + 'showMessage',
									{
										title: "Forgot Password",
										message : "User not found for given email id. Please try again to login."
									});
						}
					});

/*	app.post('/forgotusername',
					function(req, res) {
						var emailid = req.body.email;
						sendForgotUsernameEmail(emailid);
						res.render('pages' + path.sep + 'showMessage',
										{
											message : "You shall receive an email to your registered email id soon with the username details. Please check your email for further instructions."
										});
					});*/

	app.get('/reset-password',
					function(req, res) {
						var emailid = req.query.email;
						var code = req.query.code;
						if (emailid == '' || code == '') {
							return res.render('pages' + path.sep + 'showMessage', {
								message : "The given link is not valid!"
							});
						}						
						getUserByEmail(emailid, function(data){
							var user = data.Items[0];
							if(user){
								var params = {
										TableName : "Hx.Users",
										Key: {
											UserID : user.UserID
										},
										ExpressionAttributeNames : {
											"#C" : "VerificationCode"
										},
										FilterExpression : "#C = :v2",
										ExpressionAttributeValues : {
											":v2" : code
										},
										Select : "ALL_ATTRIBUTES"
									};
									options.docClient.scan(params,
													function(err, data) {
														if (err) {
															console.error("Unable to query Users table for user "+emailid+". (Route GET '/reset-password' ) Error JSON:", JSON.stringify(err,null,2));
														} else {
															if (data.Count < 1) {
																res.render('pages'+ path.sep + 'showMessage',
																				{
																					title: "Set New Password",
																					message : "The given link is not valid!"
																				});
															} else {
																var result = data.Items[0];
																var now = new Date();
																var expiry = new Date(result.expiry);
																if (now > expiry) {
																	res.render('pages'+ path.sep+ 'showMessage',
																					{
																						title: "Set New Password",
																						message : "The given link expired!"
																					});
																} else {
																	res.render('pages'+ path.sep+ 'setpassword',
																					{
																						email : emailid
																					});
																}
															}
														}
													});
							}else{
								res.render('pages' + path.sep + 'showMessage',
										{
											title: "Forgot Password",
											message : "User not found for given email id. Please try again to reset password."
										});
							}
				});						
						
	});

	app.post('/newpassword',
					function(req, res) {
						var email = req.body.email;
						var password = req.body.password;
						getUserByEmail(email, function(data) {
										var user = data.Items[0];
										if (user) {
											updatePassword(user.UserID, password);
											res.render('pages' + path.sep + 'showMessage',
															{
																title: "Set New Password",
																message : "Password update successful. Please login with new password to access your account."
															});
										}else{
											res.render('pages' + path.sep + 'showMessage',
													{
														title: "Forgot Password",
														message : "User not found for given email id. Please try again to reset password."
													});
										}
					});
	});

	app.post('/register', function(req, res) {
		var now = new Date();
		var expiry = new Date();
		expiry.setDate(expiry.getDate() + 1);
		var email = req.body.email;
		var password = req.body.password;	
		var params = {
				TableName : "Hx.Users",				
				ProjectionExpression: "EmailAddress",	
				Select:  "SPECIFIC_ATTRIBUTES"
			};
			options.docClient.scan(params, function(err, data) {
				if (err) {
					console.error("Unable to scan from Users table for "+email+". (getUserByEmail) Error JSON:",
							JSON.stringify(err, null, 2));
				} else {
					var emailAddresses = data.Items.map(function(d){ return data.Items[0][Object.keys(d)[0]]; });
					if(!emailAddresses.includes(email)){
						var userid = data.Count+1;
						var usersParams = {
								TableName : "Hx.Users",
								Item : {
									UserID: userid,
									EmailAddress : email,
									Password : base64.encode(password),
									Active: false,
									VerificationCode: generateVerificationCode(),
									CreatedAt: now.toString(),
									Expiry: expiry.toString()
								},
								ConditionExpression : "attribute_not_exists(EmailAddress)"
							};
							options.docClient.put(usersParams, function(err, data) {
								if (err) {
									console.error("Unable to insert user into Users table. (Route POST '/register' ) Error JSON:", JSON.stringify(err, null, 2));
									return res.render('pages' + path.sep + 'showMessage',
											{
												title: "Registration",
												message : "Unable to register with given email id. Please contact our support team at http://www.graftel.com/contact"
											});
								} else {
									completeRegistrationEmail(email);
									return res.render('pages' + path.sep + 'showMessage',
											{
												title: "Registration",
												message : "You shall receive an email to your registered email id along with verification code to complete your registration."
											});
								}
							});						
					}else{
						return res.render('pages' + path.sep + 'showMessage',
								{
									title: "Registration",
									message : "Unable to register with given email id. Please contact our support team at http://www.graftel.com/contact"
								});
					}
				}
			});	
	});

	app.get('/registration2', function(req, res) {
		var email = req.query.email;
		var code = req.query.code;
		getUserByEmail(email, function(data){
			var user = data.Items[0];
			if(user){
				if(user.VerificationCode == code && new Date(user.Expiry) >= new Date()){
					res.render('pages' + path.sep + 'registration2',
							{
								email: user.EmailAddress,
								code : user.VerificationCode
							});
				}else{ // Verification code is wrong or expired
					res.render('pages' + path.sep + 'showMessage',
							{
								title: "Registration",
								message : "The given link is not valid or expired. Please contact our support team at http://www.graftel.com/contact/"
							});
				}
			}else{ // user not found
				res.render('pages' + path.sep + 'showMessage',
						{
							title: "Registration",
							message : "The given link is not valid. Please contact our support team at http://www.graftel.com/contact/"
						});
			}
		});
	});

	app.post('/registration2', function(req, res) {
		var email = req.body.email;
		getUserByEmail(email, function(data){
			var user = data.Items[0];
			if(user){
				if(!user.Active){
					if(new Date(user.Expiry) >= new Date()){
						var params = {
								TableName : "Hx.Users",
								Key : {
									UserID : user.UserID
								},
								UpdateExpression : "SET FirstName = :fn, Active = :ac, LastName = :ln",
								ConditionExpression: "EmailAddress = :em and Password = :pw",
								ExpressionAttributeValues : {
									":fn" : req.body.firstName,
									":ln" : req.body.lastName,
									":ac" : true,
									":em" : req.body.email,
									":pw" : base64.encode(req.body.password)
								}
						};
						options.docClient.update(params,
								function(err, data) {
							if (err) {
								console.error("Unable to update registration details into the Users table for user "+ user.UserID + ". (Route POST '/registration2' ) Error JSON:",
										JSON.stringify(err, null, 2));
								res.render('pages' + path.sep + 'showMessage',
										{
											title: "Login",
											message : "Registration failed. Please contact our support team at http://www.graftel.com/contact/"
										});
							} else {
								return res.redirect('/');
							}
						});
					} else {
						res.render('pages' + path.sep + 'showMessage',
								{
									title: "Login",
									message : "The given link is not valid or expired. Please contact our support team at http://www.graftel.com/contact/"
								});
					}
				}else{
					res.redirect('/login?message='+'Your account is active. Please login to access your account.'); 
				}
			}else{
				res.render('pages' + path.sep + 'showMessage',
						{
							title: "Login",
							message : "The given link is not valid or expired. Please contact our support team at http://www.graftel.com/contact/"
						});
			}
		});
	});
	
	// helpers
	function sendForgotPasswordEmail(emailid) {
		getUserByEmail(emailid, function(data){
			var user = data.Items[0];
			if(user){
				var helper = require('sendgrid').mail;
				var VerificationCode = generateVerificationCode();
				var link = "http://localhost:5000/reset-password?email=" + emailid + "&code=" + VerificationCode;
				var now = new Date();
				var expiry = new Date();
				expiry.setDate(expiry.getDate() + 1);
				saveVerificationCode(user.UserID, emailid, VerificationCode, now, expiry);
				var fromEmail = new helper.Email('no-reply@graftel.com');
				var toEmail = new helper.Email(emailid);
				var subject = 'Reset password for Heat Exchange Monitering System';
				var bodyHtml = "Hello,<br><br>You recently requested to reset password for your Heat Exchange Monitering System"
						+ " account.<br><br>To reset your password, click the following link or copy and paste the link into your browser: <br><a href='"
						+ link
						+ "'>"
						+ link
						+ "</a>"
						+ "<br><br>After resetting your password, in order to access your account, you will need to put in your email address and password "
						+ "in the Log In section.<br><br>This password reset link will expire on "
						+ expiry
						+ "<br><br>If you did not request to have your password reset you can safely ignore this email.<br><br>"
						+ "If you need further assistance please contact our support team at http://www.graftel.com/contact/.<br><br>Thank you,<br>Graftel Team.";

				var content = new helper.Content('text/html', bodyHtml);
				var mail = new helper.Mail(fromEmail, subject, toEmail, content);
				var sg = require('sendgrid')(options.sgKey);
				var request = sg.emptyRequest({
					method : 'POST',
					path : '/v3/mail/send',
					body : mail.toJSON()
				});
				sg.API(request, function(error, response) {
					if (!(response.statusCode == 202)) {
						console.error("Error in sending email of password reset for "+emailid+". ", JSON.stringify(error, null, 2));
					}
				});
			}
		});
	}

	function completeRegistrationEmail(emailid) {
		var helper = require('sendgrid').mail;
		getUserByEmail(emailid,	function(data) {
									var user = data.Items[0];
									if (user) {
										var fromEmail = new helper.Email('no-reply@graftel.com');
										var emailid = user.EmailAddress;
										var toEmail = new helper.Email(emailid);
										var link = "http://localhost:5000/registration2?email=" + emailid + "&code=" + user.VerificationCode;
										var subject = 'Complete your registration for Heat Exchange Monitering System';
										var bodyHtml = "Hello,<br><br>Thank you for registering with Heat Exchange Monitering System."
												+ "<br><br>To complete your registration please use below link: <br><br>"
												+ '<a href="'+link+'">'+link+"</a><br><br>"
												+ "If you need further assistance please contact our support team at http://www.graftel.com/contact/.<br><br>Thank you,<br>Graftel Team.";
										var content = new helper.Content('text/html', bodyHtml);
										var mail = new helper.Mail(fromEmail, subject, toEmail, content);
										var sg = require('sendgrid')(options.sgKey);
										var request = sg.emptyRequest({
											method : 'POST',
											path : '/v3/mail/send',
											body : mail.toJSON()
										});
										sg.API(request, function(error, response) {
											if (response.statusCode == 202) {
												console.error("Error in sending email of registration setup for "+emailid+". ", JSON.stringify(error, null, 2));
											}
										})
									}
						});
	}

	function generateVerificationCode() {
		var mask = '';
		mask += 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		var result = '';
		for (var i = 16; i > 0; --i)
			result += mask[Math.round(Math.random() * (mask.length - 1))];
		return result;
	}

	function saveVerificationCode(userid, email, code, createdAt, expiry) {
		var params = {
			TableName : "Hx.Users",
			Key : {
				UserID : userid
			},
			UpdateExpression : "SET VerificationCode = :c, CreatedAt= :c1, Expiry = :e",
			ExpressionAttributeValues : {
				":c" : code,
				":c1" : createdAt.toString(),
				":e" : expiry.toString()
			}
		};
		options.docClient.update(params,
						function(err, data) {
							if (err) {
								console.error("Unable to insert verification code into the table. (saveVerificationCode) Error JSON:",
												JSON.stringify(err, null, 2));
							}
						});
	}

	function getUserByEmail(email, callback) {
		var params = {
			TableName : "Hx.Users",
			FilterExpression : "EmailAddress = :v1",
			ExpressionAttributeValues : {
				":v1" : email
			}
		};
		options.docClient.scan(params, function(err, data) {
			if (err) {
				console.error("Unable to query from Users table for "+email+". (getUserByEmail) Error JSON:",
						JSON.stringify(err, null, 2));
			} else {
				callback(data);
			}
		});
	}

	function updatePassword(userid, password) {
		var params = {
			TableName : "Hx.Users",
			Key : {
				UserID : userid
			},
			UpdateExpression : "SET Password = :val",
			ExpressionAttributeValues : {
				":val" : base64.encode(password)
			},
			ReturnValues : "NONE"
		};
		options.docClient.update(params, function(err, data) {
			if (err) {
				console.error("Unable to update password for "+userid+". (updatePassword) Error JSON:", JSON.stringify(err, null, 2));
			}
		});
	}

}