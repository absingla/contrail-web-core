/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    "backbone",
    "contrail-list-model",
    "contrail-view",
    "d3-v4",
    "core-basedir/js/charts/models/DataModel",
    "core-basedir/js/charts/models/DataProvider",
    "core-basedir/js/charts/models/LineChartConfigModel",
    "core-basedir/js/charts/views/LineChartView",
    "core-basedir/js/charts/models/BarChartConfigModel",
    "core-basedir/js/charts/views/BarChartView",
    "core-basedir/js/charts/models/TooltipComponentConfigModel",
    "core-basedir/js/charts/views/TooltipView",
    "core-basedir/js/charts/models/MessageComponentConfigModel",
    "core-basedir/js/charts/views/MessageView",
], function (Backbone, ContrailListModel, ContrailView, d3, DataModel, DataProvider,
             LineChartConfigModel, LineChartView,
             BarChartConfigModel, BarChartView,
             TooltipComponentConfigModel, TooltipView,
             MessageComponentConfigModel, MessageView) {

    var LineBarChartView = ContrailView.extend({
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

            self.chartConfig = getChartConfig(selector, viewConfig.chartOptions);
            self.chartConfigModel = new Backbone.Model(self.chartConfig);

            if (self.model !== null) {

                self.chartDataModel = new DataModel({dataParser: self.chartConfig.dataParser});
                self.updateChartDataStatus();

                self.model.onAllRequestsComplete.subscribe(function () {
                    self.updateChartDataModel();
                    self.renderChart(selector);
                });

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
                viewConfig = self.attributes.viewConfig,
                data = self.model.getItems();

            if (contrail.checkIfFunction(viewConfig.parseFn)) {
                data = viewConfig.parseFn(data);
            }

            self.chartDataModel.setData(data);
            self.updateChartDataStatus(status);

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
            self.chartDataModel.set({dataStatus: status});

        },

        applyStaticData: {},

        renderChart: function (selector) {
            var self = this,
                chartTemplate = contrail.getTemplate4Id("coCharts-chart-template");

            $(selector).find(".coCharts-container").remove();
            $(selector).append(chartTemplate(self.chartConfig));

            //self.applyStaticData();

            //Common Message View. will be used for rendering info messages and error
            var messageView = new MessageView({
                config: self.chartConfigModel.get("message"),
                id: "messageView",
                container: $(selector).find(".coCharts-main-container")
            });

            //One of the way to bind to message events of already created model 
            messageView.registerModelDataStatusEvents(self.chartDataModel);

            var lineChartDataProvider = new DataProvider({
                parentDataModel: self.chartDataModel,
                messageEvent: messageView.eventObject,
                formatData: function(data) {
                    var lineChartData = []
                    _.each(data, function(dataItem) {
                        if (!dataItem.bar) {
                            lineChartData = lineChartData.concat(dataItem.values);
                        }
                    });
                    return lineChartData;
                }
            });

            var lineChartView = new LineChartView({
                model: lineChartDataProvider,
                config: self.chartConfigModel.get("mainChart"),
                messageEvent: messageView.eventObject,
                el: $(selector).find(".coCharts-main-container"),
                id: self.chartConfig.chartId
            });

            var barChartDataProvider = new DataProvider({
                parentDataModel: self.chartDataModel,
                messageEvent: messageView.eventObject,
                formatData: function(data) {
                    var barChartData = [];
                    _.each(data, function(dataItem) {
                        if (dataItem.bar) {
                            barChartData = barChartData.concat(dataItem.values);
                        }
                    });
                    return barChartData;
                }
            });

            var barChartView = new BarChartView({
                model: barChartDataProvider,
                config: self.chartConfigModel.get("mainChart"),
                messageEvent: messageView.eventObject,
                el: $(selector).find(".coCharts-main-container"),
                id: self.chartConfig.chartId
            });

            //Override both charts renderSVG for line bar chart svg elements.
            barChartView.renderSVG = lineBarChartSVG;
            lineChartView.renderSVG = lineBarChartSVG;

            //We will render the charts on same element
            barChartView.render();
            lineChartView.render();

            // TooltipView
            var tooltipConfig = new TooltipComponentConfigModel(self.chartConfig.tooltip);
            var tooltipView = new TooltipView({config: tooltipConfig});
            tooltipView.registerTriggerEvent(barChartView.eventObject, "mouseover", "mouseout");
            tooltipView.registerTriggerEvent(lineChartView.eventObject, "mouseover", "mouseout");
        }
    });

    function getChartConfig(selector, chartOptions) {
        var chartSelector = $(selector).find(".coCharts-container"),
            chartWidth = ($(chartSelector).width() > 100) ? $(chartSelector).width() - 10 : undefined;

        var defaultLineBarConfig = {
            chartId: "LineBarChart",
            marginTop: 20,
            marginRight: 5,
            marginBottom: 50,
            marginLeft: 50,
            height: 350,
            width: "100%",
            dataParser: null,
            navigation: {
                enable: false,
                xAccessor: "x",
                accessorData: {}
            },
            controlPanel: {
                enable: false
            },
            mainChart: {
                chartHeight: 270,
                chartWidth: chartWidth,
                marginTop: 20,
                marginRight: 5,
                marginBottom: 50,
                marginLeft: 50,
                y1Label: "Y1 Axis",
                xLabel: "X Axis",
                y1LabelFormat: d3.format(","),
                xLabelFormat: d3.format(","),
                xAccessor: "x",
                xScale: d3.scaleTime(),
                forceX: [undefined, undefined],
                forceY: [undefined, undefined],
                accessorData: {},
                y1Chart: "bar", //Default we will render bar on Y1
                y2Chart: "line", //Line on Y2
            },
            message: {
                noDataMessage: "No Data Found",
                dataStatusMessage: true,
                statusMessageHandler: cowm.getRequestMessage,
            }
        };

        var chartConfig = $.extend(true, {}, defaultLineBarConfig, chartOptions);

        chartConfig.mainChart._y1Chart = chartConfig.mainChart.y1Chart;
        chartConfig.mainChart._y2Chart = chartConfig.mainChart.y2Chart;

        //X axis will be rendered from the chart on Y1 axis.
        chartConfig.mainChart._enableXAxis = chartConfig.mainChart.y1Chart;

        //Main chart canvas has 2 charts. combining both models in to single attr.
        var lineChartConfigModel, barChartConfigModel, mainChartConfigModel;
        if (chartConfig.mainChart.y1Chart === "line" || chartConfig.mainChart.y2Chart === "line") {
            lineChartConfigModel = new LineChartConfigModel(chartConfig.mainChart);
            mainChartConfigModel = lineChartConfigModel;
        }
        if (chartConfig.mainChart.y1Chart === "bar" || chartConfig.mainChart.y2Chart === "bar") {
            barChartConfigModel = new BarChartConfigModel(chartConfig.mainChart);
            if (mainChartConfigModel instanceof Backbone.Model) {
                mainChartConfigModel.set(barChartConfigModel.attributes);
            } else {
                mainChartConfigModel = barChartConfigModel;
            }
        }
        chartConfig.mainChart = mainChartConfigModel;

        chartConfig.message = new MessageComponentConfigModel(chartConfig.message);

        return chartConfig;
    }

    function lineBarChartSVG() {
        var self = this;
        var svgs = d3.select(self.$el.get(0)).selectAll("svg").data([self.id]);
        var svg = svgs.enter().append("svg")
            .attr("class", "line-chart bar-chart")
            .attr("id", function (d) {
            return d;
        });
        svg.append("g")
            .attr("class", "axis x-axis")
            .attr("transform", "translate(0," + ( self.params.y1Scale.range()[1] ) + ")");
        svg.append("g")
            .attr("class", "axis y-axis y1-axis")
            .attr("transform", "translate(" + ( self.params.xScale.range()[0] ) + ",0)");
        svg.append("g")
            .attr("class", "axis y-axis y2-axis")
            .attr("transform", "translate(" + ( self.params.xScale.range()[1] ) + ",0)");
        svg.append("g")
            .attr("class", "bars y1-bars");
        svg.append("g")
            .attr("class", "bars y2-bars");
        svg.append("g")
            .attr("class", "lines y1-lines");
        svg.append("g")
            .attr("class", "lines y2-lines");

        self.svgSelection()
            .attr("width", self.params.chartWidth)
            .attr("height", self.params.chartHeight);
    }

    return LineBarChartView;
});
