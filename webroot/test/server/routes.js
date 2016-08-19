var express = require('express');
var app = express();
var http = require("http");

var nock = require('nock');
var utils = require('./test.utils.js')

function init(app, responses, mockDataFile, callback, featureName) {

    var PATH = '';

    if (featureName.indexOf('webController') >= 0) {
        PATH = 'contrail-web-controller/webroot/';
    }
    else if (featureName.indexOf('serverManager') >= 0) {
        PATH = 'contrail-web-server-manager/webroot/';
    }
    else if (featureName.indexOf('webStorage') >= 0) {
        PATH = 'contrail-web-storage/webroot/';
    }
    else {
        PATH = ''
        console.log("No Feature specified");
    }

    var mockData = require('../../../../' + PATH + mockDataFile);

    for (var i = 0; i < responses.length; i++) {
        var response = responses[i];

        var urlRegExp = utils.regExpString2regExp(response.url);
        if (response.method == undefined)
            response.method = 'GET';

        if (response.method.indexOf('GET') >= 0) {
            nock('http://localhost.com').get(urlRegExp).times(10).reply(200, mockData.methods[response.fnName]());
        }
        else if (response.method.indexOf('POST') >= 0) {
            nock('http://localhost.com').post(urlRegExp).times(10).reply(200, mockData.methods[response.fnName]());
        }
        else
            console.log("Didn't match any methods")
    }
    callback();
}

function remove(app) {
    nock.cleanAll();
}

module.exports = {
    init: init,
    remove: remove
};
