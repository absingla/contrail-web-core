var express = require('express');
var app = express();
var http = require("http");
var bodyParser = require('body-parser');
var request = require('request');

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

var nock = require('nock');


app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// hook to initialize the dynamic route at runtime
app.post('/api/dynamic', function (req, res) {
    var mockDataFile = req.body.mockDataFile;
    var responses = req.body.responses;
    var featureName = req.body.featureName;

    var dynamicController = require('./routes.js');
    var callback = function () {
        res.status(200).send();
    };
    dynamicController.init(app, responses, mockDataFile, callback, featureName);


});

// hook to remove the dynamic route at runtime
app.post('/api/remove', function (req, res) {
    console.log("Removing Handlers !");
    var dynamicController = require('./routes.js');

    dynamicController.remove(app);
    res.status(200).send();
});

app.get('*', function (req, res) {
    var str = "";

    http.get('http://localhost.com' + req.originalUrl, function (resp) {
        resp.on("data", function (data) {
            str += data;
        });
        resp.on("end", function () {
            reply();
        });
    });
    var reply = function () {
        res.end(JSON.parse(JSON.stringify(str)));
    }
});

app.post('*', function (req, res) {

    request({
        url: 'http://localhost.com' + req.originalUrl,
        method: 'post'
    }, function (err, resp) {
        if (err)
            throw err;
        res.end(JSON.parse(JSON.stringify(resp.body)));
    });
});

console.log("****Launched TesServer : Listening on port : " + 9090);
app.listen(9090);

