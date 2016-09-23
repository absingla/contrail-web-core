/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

/**
 * This is mock test server.
 * the URL and it's Responses needs to be registered
 * when the server receives a request, it merely does a http.get/post
 * which is responded by the nock instances.
 */

var express = require('express');
var app = express();
var http = require("http");
var bodyParser = require('body-parser');
var request = require('request');
var routes = require('./routes.js');

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

    var callback = function () {
        console.log("routes added!");
        res.status(200).send();
    };

    routes.register(nock, responses, mockDataFile, callback, featureName);
});

// hook to remove the dynamic route at runtime
app.post('/api/remove', function (req, res) {
    console.log("Removing Handlers !");
    var routes = require('./routes.js');
    routes.remove(nock);
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

app.listen(9090);
console.log("****Launched TesServer : Listening on port : " + 9090);

