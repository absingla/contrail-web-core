/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

var tty = require('tty.js'),
    term = require('term.js'),
    express = require('express');

var ttyConfig = {
    "port": 7143,
    "https": {
        "key": "./keys/cs-key.pem",
        "cert": "./keys/cs-cert.pem"
    },
    "hostname": "127.0.0.1",
    "shell": "bash",
    "static": "./webroot/terminal",
    "localOnly": false,
    "cwd": ".",
    "syncSession": false,
    "sessionTimeout": 600000,
    "log": true,
    "io": { "log": true },
    "debug": true,
    "term": {
        "termName": "xterm",
        "scrollback": 1000,
        "visualBell": false,
        "popOnBell": false,
        "cursorBlink": false,
        "screenKeys": false
    }
};

tty.createServer.prototype.initMiddleware = function() {
    var self = this,
        conf = this.conf;

    this.use(function(req, res, next) {
        var setHeader = res.setHeader;
        res.setHeader = function(name) {
            switch (name) {
                case 'Cache-Control':
                case 'Last-Modified':
                case 'ETag':
                    return;
            }
            return setHeader.apply(res, arguments);
        };
        next();
    });

    this.use(function(req, res, next) {
        return self._auth(req, res, next);
    });

    this.use(term.middleware());

    if (conf.static) {
        this.use(express.static(conf.static));
    }

    this.use(this.app.router);
};

tty.createServer.prototype.initRoutes = function() {
    var self = this;
    this.get('/options.js', function(req, res, next) {
        return self.handleOptions(req, res, next);
    });

    this.get('/terminal', function(req, res, next) {
        checkAndRedirect(req, res, 'webroot/terminal/term.html');
    });
};

tty.createServer(ttyConfig).listen();

checkAndRedirect = function(req, res, sendFile) {
    res.sendfile(sendFile);
    return;
}