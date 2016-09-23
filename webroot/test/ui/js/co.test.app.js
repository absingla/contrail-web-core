/*
 * Copyright (c) 2014 Juniper Networks, Inc. All rights reserved.
 */

var coreBaseDir = "/base/contrail-web-core/webroot",
    featurePkg = "testLibApi";

require([
    coreBaseDir + '/test/ui/js/co.test.app.utils.js'
], function () {
    require([coreBaseDir + '/test/ui/js/co.test.config.js'], function(testConf) {
        globalObj['env'] = testConf['env'];

        //will copy the testConfig to globalObj so window can access it later.
        globalObj['testConf'] = testConf;
        var bundles = {};
        if (globalObj['env'] == 'prod') {
            globalObj['buildBaseDir'] = '/dist';
            bundles = coreBundles;
        } else {
            globalObj['buildBaseDir'] = '';
        }
        globalObj['test-env'] = globalObj['env'] + "-test";


        requirejs.config({
            baseUrl: coreBaseDir,
            paths: getCoreAppAndCoreTestAppPaths(coreBaseDir),
            map: coreAppMap,
            shim: getCoreAppAndCoreTestAppShims(),
            waitSeconds: 0
        });


        require(['co-test-init'], function () {
            setFeaturePkgAndInit(featurePkg);
        });


        function getCoreAppAndCoreTestAppPaths(coreBaseDir) {
            var coreTestAppPathObj = {};
            var coreAppPaths = getCoreAppPaths(coreBaseDir, globalObj['buildBaseDir']);
            var coreTestAppPaths = getCoreTestAppPaths(coreBaseDir);

            for (var key in coreAppPaths) {
                if (coreAppPaths.hasOwnProperty(key)) {
                    var value = coreAppPaths[key];
                    coreTestAppPathObj[key] = value;
                }
            }

            for (var key in coreTestAppPaths) {
                if (coreTestAppPaths.hasOwnProperty(key)) {
                    var value = coreTestAppPaths[key];
                    coreTestAppPathObj[key] = value;
                }
            }

            return coreTestAppPathObj;
        };

        function getCoreAppAndCoreTestAppShims() {

            var coreTestAppShims = {};

            for (var key in coreAppShim) {
                if (coreAppShim.hasOwnProperty(key)) {
                    var value = coreAppShim[key];
                    coreTestAppShims[key] = value;
                }
            }

            for (var key in coreTestAppShim) {
                if (coreTestAppShim.hasOwnProperty(key)) {
                    var value = coreTestAppShim[key];
                    coreTestAppShims[key] = value;
                }
            }

            return coreTestAppShims;
        };

    });
});
