/*
 * Copyright (c) 2014 Juniper Networks, Inc. All rights reserved.
 */

define([
    "lodash"
], function (_) {
    var QEParsers = function () {
        var self = this;

        self.fsQueryDataParser = function(response) {
            var chartData = [];

            _.forEach(response, function(fcValue, fcKey) {
                chartData.push({chart_group_id: fcKey, values: fcValue});
            });

            return chartData;
        };
    };

    return new QEParsers();
});
