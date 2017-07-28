module.exports = function(app, options) {

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
				    return res.redirect('/login?message=Captcha should be selected');
				  }
				  
				  var secretKey = "6LdeZCoUAAAAAMf-0Z95nShHHAm0djcmefFvaRt7";
				  var verificationUrl = "https://www.google.com/recaptcha/api/siteverify?secret=" + secretKey + "&response=" + req.body['g-recaptcha-response'] + "&remoteip=" + req.connection.remoteAddress;
				  
				  request(verificationUrl,function(error,response,body) { // reCaptcha verification
					    body = JSON.parse(body);
					    
					    if (body.success !== undefined && !body.success) {
					    	if(!req.session.attempts)
					    		req.session.attempts = 0;
					    	req.session.attempts += 1;
					    	return res.redirect('/login?message=Invalid captcha');
					    }
				  });
			  }
		      if(!user) {
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

	app.get('/forgotusername', function(req, res) {
		res.render('pages' + path.sep + 'forgotUsername');
	});

	app.post('/forgotpassword',
					function(req, res) {
						var emailid = req.body.email;
						sendForgotPasswordEmail(emailid);
						res.render('pages' + path.sep + 'forgotPasswordMessage',
										{
											message : "You shall receive an email to your registered email id soon. Click on the link provided in the email to reset your password. "
													+ "Please note that password link expires in 24 hours."
										});
					});

	app.post('/forgotusername',
					function(req, res) {
						var emailid = req.body.email;
						sendForgotUsernameEmail(emailid);
						res.render('pages' + path.sep + 'forgotPasswordMessage',
										{
											message : "You shall receive an email to your registered email id soon with the username details. Please check your email for further instructions."
										});
					});

	app.get('/reset-password',
					function(req, res) {
						var emailid = req.query.email;
						var code = req.query.code;
						if (emailid == '' || code == '') {
							return res.render('pages' + path.sep + 'forgotPasswordMessage', {
								message : "The given link is not valid!"
							});
						}						
						getUserByEmail(emailid, function(data){
							var user = data.Items[0];
							if(user){
								var params = {
										TableName : "Hx.ConfirmationCode",
										ExpressionAttributeNames : {
											"#e" : "email",
											"#C" : "code"
										},
										KeyConditionExpression : "#e = :v1",
										FilterExpression : "#C = :v2",
										ExpressionAttributeValues : {
											":v1" : emailid,
											":v2" : code
										},
										Select : "ALL_ATTRIBUTES"
									};
									options.docClient.query(params,
													function(err, data) {
														if (err) {
															console.error("Unable to query from Confirmation code table. Error JSON:", JSON.stringify(err,null,2));
														} else {
															if (data.Count < 1) {
																res.render('pages'+ path.sep + 'forgotPasswordMessage',
																				{
																					message : "The given link is not valid!"
																				});
															} else {
																var result = data.Items[0];
																var now = new Date();
																var expiry = new Date(result.expiry);
																if (now > expiry) {
																	res.render('pages'+ path.sep+ 'forgotPasswordMessage',
																					{
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
											res.render('pages' + path.sep + 'forgotPasswordMessage',
															{
																message : "Password update successful. Please login with new password to access your account."
															});
										}
					});
	});

	app.post('/register', function(req, res) {
		var username = req.body.username;
		var password = req.body.password;
		var params = {
			TableName : "Hx.Users",
			Item : {
				UserName : username,
				Password : base64.encode(password)
			},
			ConditionExpression : "attribute_not_exists(UserName)"
		};
		options.docClient.put(params, function(err, data) {
			if (err) {
				console.error("Unable to insert user into the table. Error JSON:", JSON.stringify(err, null, 2));
			} else {
				console.log("Inserted User Successfully.");
			}
		});
		res.redirect('/login');
	});

	// helpers
	function sendForgotPasswordEmail(emailid) {
		getUserByEmail(emailid, function(data){
			var user = data.Items[0];
			if(user){
				var helper = require('sendgrid').mail;
				var confirmationCode = generateConfirmationCode();
				var link = "http://localhost:5000/reset-password?email=" + emailid + "&code=" + confirmationCode;
				var now = new Date();
				var expiry = new Date();
				expiry.setDate(expiry.getDate() + 1);
				saveConfirmationCode(emailid, confirmationCode, now, expiry);
				var fromEmail = new helper.Email('no-reply@graftel.com');
				var toEmail = new helper.Email(emailid);
				var subject = 'Reset password for Heat Exchange Monitering System';
				var bodyHtml = "Hello,<br><br>You recently requested to reset password for your Heat Exchange Monitering System"
						+ " account.<br><br>To reset your password, click the following link or copy and paste the link into your browser: <br><a href='"
						+ link
						+ "'>"
						+ link
						+ "</a>"
						+ "<br><br>After resetting your password, in order to access your account, you will need to put in your username and password "
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
					if (response.statusCode == 202) {
						console.log("Password reset mail sent.");
					} else {
						console.log("Error in sending email of password reset.");
					}
				});
			}
		});
	}

	function sendForgotUsernameEmail(emailid) {
		var helper = require('sendgrid').mail;
		getUserByEmail(emailid,	function(data) {
									var user = data.Items[0];
									if (user) {
										var fromEmail = new helper.Email('no-reply@graftel.com');
										var toEmail = new helper.Email(emailid);
										var subject = 'Reset Username for Heat Exchange Monitering System';
										var bodyHtml = "Hello,<br><br>You recently requested for username details for your Heat Exchange Monitering System"
												+ " account.<br><br>The username set for this email id is: <b>"
												+ user.UserName
												+ "</b><br><br>If you did not request to have your username details, you can safely ignore this email.<br><br>"
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
												console.log("Password reset mail sent.");
											} else {
												console.log("Error in sending email.");
											}
										})
									}
						});
	}

	function generateConfirmationCode() {
		var mask = '';
		mask += 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		var result = '';
		for (var i = 16; i > 0; --i)
			result += mask[Math.round(Math.random() * (mask.length - 1))];
		return result;
	}

	function saveConfirmationCode(email, code, createdAt, expiry) {
		var params = {
			TableName : "Hx.ConfirmationCode",
			Item : {
				email : email,
				code : code,
				created_at : createdAt.toString(),
				expiry : expiry.toString()
			}
		};
		options.docClient.put(params,
						function(err, data) {
							if (err) {
								console.error("Unable to insert confirmation code into the table. Error JSON:",
												JSON.stringify(err, null, 2));
							} else {
								console.log("Inserted Code Successfully.");
								return;
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
				console.error("Unable to query from Users table. Error JSON:",
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
				console.error("Unable to update password. Error JSON:", JSON.stringify(err, null, 2));
			} else {
				console.error("Password updated");
				return;
			}
		});
	}

}