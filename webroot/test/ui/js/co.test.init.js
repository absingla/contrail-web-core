/*
 * Copyright (c) 2014 Juniper Networks, Inc. All rights reserved.
 */

var cowc, cowu, cowhu, cowf, cowl, cowch, cowm, cotu, cotc, covdc;

var allTestFiles = [], windowKarma = window.__karma__;

for (var file in windowKarma.files) {
    if (/\.test\.js$/.test(file)) {
        allTestFiles.push(file);
    }
}

var depArray = [
    'jquery', 'underscore', 'validation', 'core-constants', 'core-utils',
    'core-formatters', 'core-messages', 'core-views-default-config', 'core-labels', 'knockout', 'core-cache',

    'text!/base/contrail-web-core/webroot/common/ui/templates/core.common.tmpl',

    'core-basedir/js/common/chart.utils',

    'co-test-utils', 'co-test-constants',

    'layout-handler', 'joint.contrail', 'text', 'contrail-unified-1', 'contrail-unified-2', 'contrail-unified-3'

];

var testAppConfig = {
    featurePkg: '',
    featuresDisabled: '',
    webServerInfo: ''
};

var bundles = (globalObj['env'] == 'prod') ? coreBundles :  {};

requirejs.config({
    bundles: bundles
});

function setFeaturePkgAndInit(featurePkg, coreTestMockData) {
    var featurePkgObj = {};
    switch (featurePkg) {
        case 'webController':
            featurePkgObj.featurePkg = 'webControllerMockData';
            featurePkgObj.featuresDisabled = 'disabledFeatureMockData';
            featurePkgObj.webServerInfo = 'ctWebServerInfoMockData';
            break;

        case 'webStorage':
            featurePkgObj.featurePkg = 'webStorageMockData';
            featurePkgObj.featuresDisabled = 'disabledFeatureMockData';
            featurePkgObj.webServerInfo = 'sWebServerInfoMockData';
            break;

        case 'serverManager':
            featurePkgObj.featurePkg = 'serverManagerMockData';
            featurePkgObj.featuresDisabled = 'disabledFeatureMockData';
            featurePkgObj.webServerInfo = 'smWebServerInfoMockData';
            break;

        case 'testLibApi':
            return testLibApiAppInit({});

    }
    testAppConfig.featurePkg = JSON.stringify(coreTestMockData[featurePkgObj.featurePkg]);
    testAppConfig.featuresDisabled = JSON.stringify(coreTestMockData[featurePkgObj.featuresDisabled]);
    testAppConfig.webServerInfo = JSON.stringify(coreTestMockData[featurePkgObj.webServerInfo]);
    testAppConfig.featureName = featurePkg;
    testAppInit(testAppConfig);
}
/**
 * For base unit tests, since modules are not loaded via menu hash we will call this
 * manually to load the feature level packages.
 * @param featurePackages
 */
var loadFeatureApps = function (featurePackages) {
    var featureAppDefObjList= [],
        initAppDefObj, url;

    for (var key in featurePackages) {
        if(featurePackages[key] && key == FEATURE_PCK_WEB_CONTROLLER) {
            url = ctBaseDir + '/common/ui/js/controller.app.js';
            if(globalObj['loadedScripts'].indexOf(url) == -1) {
                initAppDefObj = $.Deferred();
                featureAppDefObjList.push(initAppDefObj);
                globalObj['initFeatureAppDefObjMap'][key] = initAppDefObj;
                featureAppDefObjList.push(loadUtils.getScript(url));
            }
        } else if (featurePackages[key] && key == FEATURE_PCK_WEB_SERVER_MANAGER) {
            url = smBaseDir + '/common/ui/js/sm.app.js';
            if(globalObj['loadedScripts'].indexOf(url) == -1) {
                initAppDefObj = $.Deferred();
                featureAppDefObjList.push(initAppDefObj);
                globalObj['initFeatureAppDefObjMap'][key] = initAppDefObj;
                featureAppDefObjList.push(loadUtils.getScript(url));
            }
        }  else if (featurePackages[key] && key == FEATURE_PCK_WEB_STORAGE) {
            url = strgBaseDir + '/common/ui/js/storage.app.js';
            if(globalObj['loadedScripts'].indexOf(url) == -1) {
                initAppDefObj = $.Deferred();
                featureAppDefObjList.push(initAppDefObj);
                globalObj['initFeatureAppDefObjMap'][key] = initAppDefObj;
                featureAppDefObjList.push(loadUtils.getScript(url));
            }
        }
    }

    //Where isInitFeatureAppInProgress used
    if(featureAppDefObjList.length > 0) {
        globalObj['isInitFeatureAppInProgress'] = true;
    }

    $.when.apply(window, featureAppDefObjList).done(function () {
        globalObj['isInitFeatureAppInProgress'] = false;
        globalObj['isInitFeatureAppComplete'] = true;
        globalObj['featureAppDefObj'].resolve();
        // self.featureAppDefObj.resolve();
    });
};

function testAppInit(testAppConfig) {

    function loadAjaxRequest(ajaxCfg,callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET',ajaxCfg['url']);
        xhr.send(null);
        xhr.onload(function(response) {
            callback(response);
        });

    }
    var orchPrefix = window.location.pathname;
    //Even with URL as <https://localhost:8143>,pahtname is returning as "/"
    if(orchPrefix == "/")
        orchPrefix = "";
    built_at = "";

    (function() {
        var menuXMLLoadDefObj,layoutHandlerLoadDefObj,featurePkgs;
        loadUtils = {
            getScript: function(url, callback) {
                var scriptPath = url + '?built_at=' + built_at;
                globalObj['loadedScripts'].push(url);
                return $.ajax({
                    type: "GET",
                    url: scriptPath,
                    success: callback,
                    dataType: "script",
                    cache: true
                }).fail(function() {
                    console.info("Error in fetching script",url);
                });
            },
            getCookie: function(name) {
                if(name != null) {
                    var cookies = document.cookie.split(";");
                    for (var i = 0; i < cookies.length; i++) {
                        var x = cookies[i].substr(0, cookies[i].indexOf("="));
                        var y = cookies[i].substr(cookies[i].indexOf("=") + 1);
                        x = x.replace(/^s+|s+$/g, "").trim();
                        if (x == name)
                            return unescape(y);
                    }
                }
                return false;
            },
            postAuthenticate: function(response) {
                require(['jquery'],function() {
                    //To fetch alarmtypes
                    require(['core-alarm-utils'],function() {});
                    $('#signin-container').empty();
                    //If #content-container already exists,just show it
                    if($('#content-container').length == 0) {
                        $('#app-container').html($('#app-container-tmpl').text());
                        $('#app-container').removeClass('hide');
                    } else
                        $('#app-container').removeClass('hide');
                    globalObj['webServerInfo'] = loadUtils.parseWebServerInfo(response);
                    webServerInfoDefObj.resolve();

                    // if (loadUtils.getCookie('username') != null) {
                    //     $('#user_info').text(loadUtils.getCookie('username'));
                    // }
                    // $('#user-profile').show();
                    $.when.apply(window,[menuXMLLoadDefObj,layoutHandlerLoadDefObj]).done(function(menuXML) {
                        if(globalObj['featureAppDefObj'] == null)
                            globalObj['featureAppDefObj'] = $.Deferred();
                        require(['core-bundle'],function() {
                            layoutHandler.load(menuXML);
                        });
                    });
                });
            },
            getWebServerInfo: function() {
                $.ajax({
                    url: '/api/service/networking/web-server-info',
                    type: "GET",
                    dataType: "json"
                }).done(function (response,textStatus,xhr) {
                    globalObj['webServerInfo'] = response;
                    webServerInfoDefObj.resolve();
                }).fail(function(response) {
                    console.info(response);
                    loadUtils.onAuthenticationReq();
                });
            },
            fetchMenu: function(menuXMLLoadDefObj) {
                $.ajax({
                    url: '/menu',
                    type: "GET",
                    dataType: "xml"
                }).done(function (response,textStatus,xhr) {
                    menuXML = response;
                    menuXMLLoadDefObj.resolve(menuXML);
                }).fail(function(response) {
                    console.info(response);
                    loadUtils.onAuthenticationReq();
                });
            },
            isAuthenticated: function() {
                Ajax.request(orchPrefix + '/isauthenticated',"GET",null,function(response) {
                    if(response != null && response.isAuthenticated == true) {
                        loadUtils.postAuthenticate(response);
                    } else {
                        loadUtils.onAuthenticationReq();
                    }
                    featurePkgs = response['featurePkg'];
                    require(['jquery'],function() {
                        if(globalObj['featureAppDefObj'] == null)
                            globalObj['featureAppDefObj'] = $.Deferred();
                        loadFeatureApps(featurePkgs);
                    });
                });
            },
            parseWebServerInfo: function(webServerInfo) {
                if (webServerInfo['serverUTCTime'] != null) {
                    webServerInfo['timeDiffInMillisecs'] = webServerInfo['serverUTCTime'] - new Date().getTime();
                    if (Math.abs(webServerInfo['timeDiffInMillisecs']) > globalObj['timeStampTolerance']) {
                        if (webServerInfo['timeDiffInMillisecs'] > 0) {
                            globalAlerts.push({
                                msg: infraAlertMsgs['TIMESTAMP_MISMATCH_BEHIND'].format(diffDates(new XDate(), new XDate(webServerInfo['serverUTCTime']), 'rounded')),
                                sevLevel: sevLevels['INFO']
                            });
                        } else {
                            globalAlerts.push({
                                msg: infraAlertMsgs['TIMESTAMP_MISMATCH_AHEAD'].format(diffDates(new XDate(webServerInfo['serverUTCTime']), new XDate(), 'rounded')),
                                sevLevel: sevLevels['INFO']
                            });
                        }
                    }
                }
                return webServerInfo;
            }
        }

        function fakeIsAuthenticated(response) {
            loadUtils.postAuthenticate(response);
            require(['jquery'],function() {
                if(globalObj['featureAppDefObj'] == null)
                    globalObj['featureAppDefObj'] = $.Deferred();
                if(webServerInfoDefObj == null)
                    webServerInfoDefObj = $.Deferred();
                //Ensure the global aliases (like contrail,functions in web-utils) are available before loading
                //feature packages as they are used in the callback of feature init modules without requiring them
                require(['nonamd-libs'],function() {
                    loadFeatureApps(response['featurePkg']);
                });
            });
        }

        requirejs(['text!menu.xml',
            'co-test-utils',
            'co-test-constants',
            'co-test-messages',
            'co-test-runner',
            'jquery'
        ], function (menuXML, cotu, cotc, cotm, cotr) {
            // var fakeServer = sinon.fakeServer.create();
            // fakeServer.autoRespond = true;
            // fakeServer.respondWith("GET", cotu.getRegExForUrl('/api/admin/webconfig/featurePkg/webController'),
            //     [200, {"Content-Type": "application/json"}, testAppConfig.featurePkg]);
            // fakeServer.respondWith("GET", cotu.getRegExForUrl('/api/admin/webconfig/features/disabled'),
            //     [200, {"Content-Type": "application/json"}, testAppConfig.featuresDisabled]);
            // fakeServer.respondWith("GET", cotu.getRegExForUrl('/api/service/networking/web-server-info'),
            //     [200, {"Content-Type": "application/json"}, testAppConfig.webServerInfo]);
            // fakeServer.respondWith("GET", cotu.getRegExForUrl('/menu'),
            //     [200, {"Content-Type": "application/xml"}, menuXML]);

            //Dashboard.tmpl substitute
            $("body").append(cotu.getAppContainerTmpl());

            require(['core-bundle','nonamd-libs'],function() {
            });
            menuXMLLoadDefObj = $.Deferred();
            layoutHandlerLoadDefObj = $.Deferred();
            webServerInfoDefObj = $.Deferred();
            // loadUtils.getWebServerInfo();
            // $.ajaxSetup({
            //     cache: false,
            //     crossDomain: true,
            //     //set the default timeout as 30 seconds
            //     timeout: 30000,
            //     error: function (xhr, e) {
            //         //ajaxDefErrorHandler(xhr);
            //     }
            // });
            // loadUtils.fetchMenu(menuXMLLoadDefObj);

            webServerInfoDefObj.done(function() {
                menuXMLLoadDefObj.resolve(menuXML);
            });

            fakeIsAuthenticated(JSON.parse(testAppConfig.webServerInfo));

            require(['chart-libs'],function() {});
            require(['jquery-dep-libs'],function() {});
            globalObj['layoutDefObj'] = $.Deferred();

            SVGElement.prototype.getTransformToElement = SVGElement.prototype.getTransformToElement || function(toElement) {
                    return toElement.getScreenCTM().inverse().multiply(this.getScreenCTM());
                };

            //nonamd-libs   #no dependency on jquery
            require(['backbone', 'validation', 'knockout', 'knockback'], function () {
                require(['core-bundle', 'jquery-dep-libs', 'nonamd-libs'], function () {
                    require(['validation', 'knockout', 'backbone'], function (validation, ko) {
                        window.kbValidation = validation;
                        // window.ko = ko;
                    });
                    require(['core-utils', 'core-hash-utils'], function (CoreUtils, CoreHashUtils) {
                        cowu = new CoreUtils();
                        cowhu = new CoreHashUtils();
                        require(['underscore'], function (_) {
                            _.noConflict();
                        });
                        require([
                            'layout-handler',
                            'content-handler',
                            'help-handler',
                            'contrail-load',
                            'lodash'
                        ], function (LayoutHandler, ContentHandler, HelpHandler, ChartUtils, _) {
                            window._ = _;
                            contentHandler = new ContentHandler();
                            initBackboneValidation();
                            initCustomKOBindings(window.ko);
                            //initDomEvents();

                            var cssList = cotu.getCSSList();
                            for (var i = 0; i < cssList.length; i++) {
                                $("body").append(cssList[i]);
                            }

                            layoutHandler = new LayoutHandler();
                            layoutHandlerLoadDefObj.resolve();

                            //Start Test runner.
                            requirejs(['co-test-runner'], function (cotr) {
                                var logAllTestFiles = "Test files: ";
                                for (var i = 0; i < allTestFiles.length; i++) {
                                    logAllTestFiles += "\n";
                                    logAllTestFiles += i + 1 + ") " + allTestFiles[i];
                                }
                                console.log(logAllTestFiles);

                                var testFilesIndex = 0,
                                    loadTestRunner = true,
                                    testFile = allTestFiles[testFilesIndex],
                                    karmaTestPromise = $.Deferred();

                                /**
                                 * Load a single test file and start Karma.
                                 * @param {String} testFile require path of the test file
                                 * @param {Object} testPromise promise to be resolved by Karma upon completion of test.
                                 * @param {Boolean} loadTestRunner flag to Karma initialization
                                 */
                                function loadSingleFileAndStartKarma(testFile, testPromise, loadTestRunner) {

                                    var startKarmaCB = window.__karma__.start(testPromise, loadTestRunner);

                                    //Clear Cookies if any exist
                                    if (document.cookie != '') {
                                        var cookies = document.cookie.split(";");
                                        for (var i = 0; i < cookies.length; i++) {
                                            var cookie = cookies[i].split("=");
                                            document.cookie = cookie[0] + "=;expires=Tue, 02 Dec 1890 00:00:01 UTC;";
                                        }
                                    }

                                    //clear the core cache
                                    cowch.reset();

                                    require([testFile], function (pageTestConfig) {
                                        var testSetupDefObj = $.Deferred();

                                        console.log("Loaded test file: " + testFile.split('/').pop());

                                        if (pageTestConfig) {

                                            pageTestConfig.featureName = testAppConfig.featureName;

                                            testSetupDefObj.done(function() {
                                                startKarmaCB();
                                            });

                                            //Promise gets resolved once the test setup initialization is done.
                                            //Start the Karma once setup init is done.
                                            cotr.startTestRunner(pageTestConfig, testSetupDefObj);

                                        } else { // For backward compatibility.
                                            startKarmaCB();
                                        }
                                    });
                                }

                                /**
                                 * Load next test file Or start Karma coverage.
                                 * cleanup current test run.
                                 *      - Clear registered routes from the test server
                                 *      - Pause QUnit
                                 *      - remove the current test file from require
                                 * Bump the testFilesIndex. Upon route clearing proceed with next test or coverage.
                                 */
                                function loadNextFileOrStartCoverage() {
                                    //Un-register the routes from test server. when promise is resolved, proceed with test case.
                                    var clearRoutesDefObj = cotu.clearTestServerRoutes();
                                    clearRoutesDefObj.always(function(){
                                        //Manually stop QUnit
                                        window.QUnit.config.current = {semaphore: 1};
                                        window.QUnit.config.blocking = true;
                                        //window.QUnit.stop();

                                        //Remove the test file from requirejs so Karma won't load the file again.
                                        requirejs.undef(allTestFiles[testFilesIndex]);
                                        console.log("Execution complete. Unloaded test file: " + allTestFiles[testFilesIndex].split('/').pop());
                                        console.log("----------------------------------------------------------------------------");

                                        testFilesIndex += 1;
                                        loadTestRunner = false;

                                        if (testFilesIndex < allTestFiles.length) {
                                            //console.log("Initializing QUnit and proceeding to next test.");
                                            window.QUnit.init();

                                            //A promise to be passed to karma when resolved; loop through this function
                                            var karmaTestPromise = $.Deferred();
                                            karmaTestPromise.done(loadNextFileOrStartCoverage);

                                            //Start the test execution with the current test file.
                                            loadSingleFileAndStartKarma(allTestFiles[testFilesIndex], karmaTestPromise, loadTestRunner);
                                        }
                                        else if (testFilesIndex == allTestFiles.length) {
                                            console.log("Completed; Starting Coverage.")
                                            window.__karma__.complete({
                                                coverage: window.__coverage__
                                            });
                                        }
                                    });
                                };

                                //When Karma resolves the promise; proceed with the next file or coverage.
                                karmaTestPromise.done(loadNextFileOrStartCoverage);

                                //Initial loading of the test file.
                                loadSingleFileAndStartKarma(testFile, karmaTestPromise, loadTestRunner);
                            });
                        });
                    });
                });
            });
        });
    })();
}

function testLibApiAppInit(testAppConfig) {
    require([
        'jquery',
        'co-test-utils',
        'text!/base/contrail-web-core/webroot/common/ui/templates/core.common.tmpl'
    ], function ($, cotu, CoreCommonTmpl) {

        if (document.location.pathname.indexOf('/vcenter') == 0) {
            $('head').append('<base href="/vcenter/" />');
        }

        webServerInfoDefObj = $.Deferred();
        webServerInfoDefObj.resolve();

        require(['backbone', 'validation', 'knockout', 'knockback'], function () {
            require(['core-bundle', 'jquery-dep-libs', 'nonamd-libs'], function () {
                require(['validation', 'knockout', 'backbone'], function (validation) {
                    window.kbValidation = validation;
                });
                require(['core-utils', 'core-hash-utils'], function (CoreUtils, CoreHashUtils) {
                    cowu = new CoreUtils();
                    cowhu = new CoreHashUtils();
                    require(['underscore'], function (_) {
                        _.noConflict();
                    });
                    require([
                        'layout-handler', 'content-handler', 'help-handler',
                        'contrail-load', 'lodash'
                    ], function (LayoutHandler, ContentHandler, HelpHandler, ChartUtils, _) {
                        $("body").addClass('navbar-fixed');
                        $("body").append(cotu.getPageHeaderHTML());
                        $("body").append(cotu.getSidebarHTML());
                        $("body").append(CoreCommonTmpl);

                        var cssList = cotu.getCSSList();

                        for (var i = 0; i < cssList.length; i++) {
                            $("body").append(cssList[i]);
                        }

                        console.log(allTestFiles);

                        require([allTestFiles[0]], function () {
                            requirejs.config({
                                deps: [allTestFiles[0]],
                                callback: window.__karma__.start($.Deferred(), true)
                            });
                        });

                    });
                });
            });
        });

    });

}
