/**
 *
 */

var sgKey = require('./sg.js').SENDGRID_API_KEY;
var express = require('express');
var bodyParser = require("body-parser");
const os = require('os');

var AWS = require("aws-sdk");
AWS.config.loadFromPath(os.homedir() + '/.aws/config.json');

var session = require('express-session');
var passport = require('passport'),
LocalStrategy = require('passport-local').Strategy;
var docClient = new AWS.DynamoDB.DocumentClient();

require('./config/passport')(passport, LocalStrategy, docClient);

var app = express();
var cookieParser = require('cookie-parser');

var root_path = process.cwd().replace(/\\/g, '/');
var views_path = root_path + "/src/views/";

app.use(bodyParser.urlencoded({ extended: false }));
app.set('view engine', 'ejs');
app.set('views', views_path);
app.use(express.static('src/public'));
app.use(express.static('src/views/partials'));
app.use(session({ secret: 'anything', cookie: { maxAge: 86400000 },resave: true, // 1 day session, TODO: add option- rolling: true
    saveUninitialized: true }));
app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());
app.locals.moment = require('moment');

/*
 * // switch to wifi - local db var config = { "accessKeyId":
 * "AKIAIVEUI3YY5KBA", "secretAccessKey":
 * "HPEk0vf3ps34L0fQxVJMqDR8yuDISX1/IYEL", "region":"us-east-1", "endpoint":
 * "http://192.168.0.100:8000" };
 *
 * var dynamodb = new AWS.DynamoDB(config);
 */
 require('./config/router')(app,{session: session, AWS: AWS, passport: passport, docClient: docClient, sgKey: sgKey});
 require('./config/user-management')(app,{session: session, AWS: AWS, passport: passport, docClient: docClient, sgKey: sgKey});
 
// starting server
var server = app.listen(5000, function () {
    console.log('Server is running on port 5000 !');
});
