/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

var utils = require("./utils.js");

var DEFAULT_RESPONSE_CODE = 200,
    DEFAULT_HITS = 10,
    DEFAULT_RESPONSE_DATA = "";

function register(nock, domain, featureName, routesConfig, callback) {
    var PATH = "", error = undefined;

    if (featureName.indexOf("webController") >= 0) {
        PATH = "contrail-web-controller/webroot/";
    } else if (featureName.indexOf("serverManager") >= 0) {
        PATH = "contrail-web-server-manager/webroot/";
    } else if (featureName.indexOf("webStorage") >= 0) {
        PATH = "contrail-web-storage/webroot/";
    } else {
        console.log("No Feature specified");
    }

    var mockDataFiles = routesConfig.mockDataFiles,
        mockData = {};

    // Loop through each mockDataFiles. create a map with same key with value that of 'require'd file
    for (var file in mockDataFiles) {
        if (mockDataFiles.hasOwnProperty(file)) {
            mockData[file] = require("../../../../" + PATH + mockDataFiles[file]);
        }
    }

    try {
        for (var i = 0; i < routesConfig.routes.length; i++) {
            var route = routesConfig.routes[i];
            var urlExp = route.urlRegex ? utils.regExpString2regExp(route.urlRegex) : route.urlMatch ? RegExp(route.urlMatch) : route.url;
            var responseData;

            // Try splitting the data and check if it's in the form mockDataFileKey.mockDataAttr
            try {
                var mockDataFileKey = route.response.data.split(".")[0],
                    mockDataAttr = route.response.data.split(".")[1];

                if (mockData.hasOwnProperty(mockDataFileKey)) {
                    responseData = mockData[mockDataFileKey][mockDataAttr] || DEFAULT_RESPONSE_DATA;
                } else {
                    responseData = route.response.data;
                }

            } catch (ex) {
                responseData = route.response.data;
            }

            if (route.method === undefined) {
                route.method = "GET";
            }

            if (route.method.indexOf("GET") >= 0) {
                nock("http://" + domain)
                    .get(urlExp)
                    .times(route.hits || DEFAULT_HITS)
                    .reply(route.code || DEFAULT_RESPONSE_CODE, JSON.stringify(responseData));
            } else if (route.method.indexOf("POST") >= 0) {
                nock("http://" + domain)
                    .post(urlExp)
                    .times(route.hits || DEFAULT_HITS)
                    .reply(route.response.code || DEFAULT_RESPONSE_CODE, JSON.stringify(responseData));
            } else {
                console.log("Use any of the supported methods: {GET, POST}");
            }
        }
    } catch (ex) {
        clearAllRoutes(nock);
        error = ex;
    } finally {
        callback(error);
    }
}

function clearAllRoutes(nock) {
    nock.cleanAll();
}

module.exports = {
    register: register,
    clearAllRoutes: clearAllRoutes
};
