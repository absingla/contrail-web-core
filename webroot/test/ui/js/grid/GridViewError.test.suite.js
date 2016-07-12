/**
 * Created by pjagadeesh on 6/22/16.
 */
/*
 * Copyright (c) 2015 Juniper Networks, Inc. All rights reserved.
 */

define([
    'underscore',
    'co-test-utils',
    'co-test-messages',
    'co-test-constants',
    'co-test-runner'
], function (_, cotu, cotm, cotc, cotr) {


    var testSuiteClass = function (viewObj, suiteConfig){

        var viewConfig = cotu.getViewConfigObj(viewObj),
            el = viewObj.el,
            gridData = $(el).data('contrailGrid'),
            gridItems = gridData._dataView.getItems(),
            gridConfig =  $.extend(true, {}, covdc.gridConfig, viewConfig.elementConfig);

        var viewConfigHeader = gridConfig.header,
            viewConfigColHeader = gridConfig.columnHeader,
            viewConfigBody = gridConfig.body,
            viewConfigFooter = gridConfig.footer;

        module(cotu.formatTestModuleMessage(cotm.TEST_GRIDVIEW_GRID, el.id));


        var gridViewErrorTestSuite = cotr.createTestSuite('GridViewErrorTest');

        /**
         * Grid Body group test cases
         */


        var pageSize = viewConfigFooter ? viewConfigFooter.pager.options.pageSize : 0;
        var bodyTestGroup = gridViewErrorTestSuite.createTestGroup('body');

        //Invalid URL in case of remote ajax datasource scenario
        bodyTestGroup.registerTest(cotr.test("Invalid URL in case of remote ajax datasource scenario", function () {
            expect(1);
            var isPresent = $($(el).find('.slick-viewport .grid-canvas')).text().trim().indexOf("Error") > -1 ?true:false;

            equal(isPresent, true, "Error message should be present");

        }, cotc.SEVERITY_HIGH));


        gridViewErrorTestSuite.run(suiteConfig.groups, suiteConfig.severity);

    };

    return testSuiteClass;
});
