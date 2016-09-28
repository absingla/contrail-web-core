/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

/**
 * This is mock test server.
 * the URL and it's Responses needs to be registered
 * when the server receives a request, it merely does a http.get/post
 * which is responded by the nock instances.
 */

var express = require("express");
var app = express();
//var http = require("http");
var bodyParser = require("body-parser");
var request = require("request");
var nockRouter = require("./nockRouter.js");

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

var nock = require("nock");
var DEFAULT_NOCK_DOMAIN = "test-server";
var DEFAULT_SERVER_PORT = 9090;

// For now will use the default value.
// Todo: support multi domain settings. will require updating the front-end requesting logic.
var nockDomain = DEFAULT_NOCK_DOMAIN;
// Todo: support setting the test server port. will require updating the proxy config in karma.
var serverPort = DEFAULT_SERVER_PORT;

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

/**
 * API target to register the URL's in test server.
 * Currently we are using nock router.
 */
app.post("/routes/register", function (req, res) {
    // var mockDataConfigFile = req.body.mockDataConfigFile;
    var routesConfig = req.body.routesConfig;
    var featureName = req.body.featureName;

    var callback = function (error) {
        if (!error) {
            res.status(200).send();
        } else {
            console.error("Error registering routes: ", JSON.stringify(error));
            res.status(500).send(error);
        }

    };

    nockRouter.register(nock, nockDomain, featureName, routesConfig, callback);
});

/**
 * API to clear all the existing routes.
 */
app.post("/routes/clear-all", function (req, res) {
    console.log("Removing Handlers !");
    nockRouter.clearAllRoutes(nock);
    res.status(200).send();
});

/**
 * Default catch all API target for GET method.
 * When a request hits this API, Server will fire a HTTP GET request to the current
 * nockDomain and the response will be returned back to the request.
 */
app.get("*", function (req, res) {

    request({
        url: "http://" + nockDomain + req.originalUrl,
        method: "GET"
    }, function (error, response) {
        if (!error && response.statusCode === 200) {
            res.send(response.body);
        } else {
            res.status(500).send(error);
        }
    });

});

/**
 * Default catch all API target for POST method.
 * When a request hits this API, Server will fire a HTTP POST request to the current
 * nockDomain and the response will be returned back to the request.
 */
app.post("*", function (req, res) {

    request({
        url: "http://" + nockDomain + req.originalUrl,
        method: "POST"
    }, function (error, response) {
        if (!error && response.statusCode === 200) {
            res.send(response.body);
        } else {
            res.status(500).send(error);
        }
    });
});

app.listen(serverPort);
console.log("====== Launched Test Server : Listening on port : " + serverPort + " =======");

