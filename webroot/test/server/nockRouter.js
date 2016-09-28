/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

var utils = require("./utils.js");

var DEFAULT_RESPONSE_CODE = 200,
    DEFAULT_HITS = 10,
    DEFAULT_RESPONSE_DATA = "";
/**
 * Register set of routes with the instance of nock.
 * @param nock  {Nock instance}
 * @param domain {domain name used in nock route}
 * @param featureName {Feature repo name used in path calculation}
 * @param routesConfig {config Object with mockDataFiles and routes}
 * mockDataFiles = array of mockDataFile paths with key of the file used in route mock data definition.
 * routes = array of route objects
 * route = {
 *      method: //HTTP method. GET/POST
 *      hits: // Number of times the url will send a response.
 *      url: // url string to match
 *      urlMatch: // string to generate a RegExp match
 *      urlRegexp: // a RegExp made toString()
 *      response: {
 *         data: // data payload to be used while responding.
 *               // define of the form mockDataFileKey.mockDataAttr
 *               // file key must be defined in the mockDataFiles.
 *         code: // response code to be sent
 *     }
 * }
 * @param callback {function to be executed after completion}
 */
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
        console.log("Nock registration Exception!!");
        clearAllRoutes(nock);
        error = ex;
    } finally {
        callback(error);
    }
}

/**
 * Removes all the route configurations from the nock instance.
 * @param nock
 */
function clearAllRoutes(nock) {
    nock.cleanAll();
}

module.exports = {
    register: register,
    clearAllRoutes: clearAllRoutes
};
