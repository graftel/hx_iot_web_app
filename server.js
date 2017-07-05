/**
 * 
 */

var express = require('express');
var bodyParser = require("body-parser");

var AWS = require("aws-sdk");
AWS.config.loadFromPath('C:/Users/web2/.aws/config.json');

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
app.use(session({ secret: 'anything', cookie: { maxAge: 600000 },resave: true,
    saveUninitialized: true }));
app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());

/*
 * // switch to wifi - local db var config = { "accessKeyId":
 * "AKIAIVEUI3YY5KBA", "secretAccessKey":
 * "HPEk0vf3ps34L0fQxVJMqDR8yuDISX1/IYEL", "region":"us-east-1", "endpoint":
 * "http://192.168.0.100:8000" };
 * 
 * var dynamodb = new AWS.DynamoDB(config);
 */
 require('./config/router')(app,{session: session, AWS: AWS, passport: passport, docClient: docClient});
// starting server
var server = app.listen(5000, function () {
    console.log('Server is running on port 5000 !');
});