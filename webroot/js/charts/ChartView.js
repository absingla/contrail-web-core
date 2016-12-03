/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */
define([
    "d3v4",
    "contrail-list-model",
    "contrail-view",
    "contrail-charts"
], function(
    d3,
    ContrailListModel,
    ContrailView,
    contrailCharts
) {
    var ChartView = ContrailView.extend({
        render: function () {
            var self = this,
                viewConfig = self.attributes.viewConfig,
                selector = $(self.$el),
                modelMap = contrail.handleIfNull(self.modelMap, {});

            if (contrail.checkIfExist(viewConfig.modelKey) && contrail.checkIfExist(modelMap[viewConfig.modelKey])) {
                self.model = modelMap[viewConfig.modelKey];
            }
            if (self.model === null && viewConfig.modelConfig !== null) {
                self.model = new ContrailListModel(viewConfig.modelConfig);
            }

            if (self.model !== null) {
                if (_.isUndefined(self.chartView)) {
                    self.chartConfig = updateChartConfig(viewConfig.chartOptions);
                    self.chartView = new contrailCharts.charts[self.chartConfig.type]();
                    // self.chartDataModel = new DataModel({
                    //     dataParser: self.chartConfig.dataParser
                    // });
                }
                //Model might be already present in cache Or requests might be already complete.
                if (self.model.loadedFromCache || !(self.model.isRequestInProgress())) {
                    console.log( "loaded from cache" );
                    self.updateChartDataModel();
                }
                //Subscribe to Future/Current request completion.
                self.model.onAllRequestsComplete.subscribe(function () {
                    console.log( "onAllRequestsComplete" );
                    self.updateChartDataModel();
                });
                //Todo loadChartInChunks option needs to be moved in to mainChart chartOptions.
                if (viewConfig.loadChartInChunks) {
                    self.model.onDataUpdate.subscribe(function () {
                        self.updateChartDataModel();
                    });
                }
                self.renderChart(selector);
            }
        },

        updateChartDataModel: function (status) {
            var self = this,
                data = self.model.getItems();
            console.log(data);
            if (data.length) self.chartView.setData(data, self.chartConfig.dataConfig);
            //self.updateChartDataStatus(status);

        },

        updateChartDataStatus: function() {
            var self = this,
                status;
            if (self.model.isRequestInProgress()) {
                status = cowc.DATA_REQUEST_STATE_FETCHING;
            } else if (self.model.error === true) {
                status = cowc.DATA_REQUEST_STATE_ERROR;
            } else if (self.model.empty === true) {
                status = cowc.DATA_REQUEST_STATE_SUCCESS_EMPTY;
            } else {
                status = cowc.DATA_REQUEST_STATE_SUCCESS_NOT_EMPTY;
            }
            self.chartView.chartDataModel.set({dataStatus: status});
        },

        renderChart: function (selector) {
            var self = this;
            var chartTemplate = contrail.getTemplate4Id("coCharts-chart-template");
            $(selector).find(".coCharts-container").remove();
            $(selector).append(chartTemplate(self.chartConfig));
            console.log("Chart Config!!!!>>>", self.chartConfig);
            self.chartView.setConfig(self.chartConfig);
            console.log( "ChartView render." );
            self.chartView.render();
        }
    });

    function updateChartConfig(chartConfig) {
        var defaultChartConfig = {
            chartId: "ChartView",
            marginTop: 20,
            marginRight: 5,
            marginBottom: 50,
            marginLeft: 50,
            handlers: [],
            components: []
        };
        var chartConfig = $.extend(true, {}, defaultChartConfig, chartConfig);
        return chartConfig;
    }

    return ChartView;
});