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
    "core-basedir/js/charts/models/CompositeYChartConfigModel",
    "core-basedir/js/charts/views/CompositeYChartView",
    "core-basedir/js/charts/views/LineChartView",
    "core-basedir/js/charts/views/BarChartView",
    "core-basedir/js/charts/models/TooltipComponentConfigModel",
    "core-basedir/js/charts/views/TooltipView",
    "core-basedir/js/charts/models/MessageComponentConfigModel",
    "core-basedir/js/charts/views/MessageView",
    "core-basedir/js/charts/views/ControlPanelView",
    "core-basedir/js/charts/models/ControlPanelConfigModel",
], function( 
    Backbone, ContrailListModel, ContrailView, d3, DataModel, DataProvider,
    CompositeYChartConfigModel, CompositeYChartView,
    LineChartView,
    BarChartView,
    TooltipComponentConfigModel, TooltipView,
    MessageComponentConfigModel, MessageView,
    ControlPanelView, ControlPanelConfigModel
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

        registerConfigChangeEvent: function(eventObject) {
            var self = this;
            self.listenTo(eventObject, "change", self.updateChartConfigModel);
        },

        updateChartConfigModel: function(updatedData) {
            self.chartConfigModel.set({mainChart:{accessorData: updatedData}});
        },

        isChartEnabled: function(chartModel, chartType) {
            var self = this,
                chartConfigModel = chartModel || self.chartConfigModel.get("mainChart");

            return (chartConfigModel.get("y1Chart") === chartType || chartConfigModel.get("y2Chart") === chartType) ? true : false;
        },

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

            // TooltipView
            var tooltipConfig = new TooltipComponentConfigModel(self.chartConfig.tooltip);
            var tooltipView = new TooltipView({config: tooltipConfig});

            var possibleChildViews = { line: LineChartView, bar: BarChartView };
            var modelConfigForChartType = {
                line: {
                    parentDataModel: self.chartDataModel,
                    messageEvent: messageView.eventObject
                    /*
                    formatData: function( data ) {
                        var lineChartData = []
                        _.each( data, function( dataItem ) {
                            if (!dataItem.bar) {
                                lineChartData = lineChartData.concat( dataItem.values );
                            }
                        });
                        return lineChartData;
                    }
                    */
                },
                bar: {
                    parentDataModel: self.chartDataModel,
                    messageEvent: messageView.eventObject
                    /*
                    formatData: function(data) {
                        var barChartData = [];
                        _.each( data, function( dataItem ) {
                            if (dataItem.bar) {
                                barChartData = barChartData.concat( dataItem.values );
                            }
                        });
                        return barChartData;
                    }
                    */
                }
            };
            /*
            var compositeYChartDataProvider = new DataProvider({
                parentDataModel: self.chartDataModel,
                messageEvent: messageView.eventObject
            });
            */
            var compositeYChartView = new CompositeYChartView({
                model: self.chartDataModel,
                config: self.chartConfigModel.get( "mainChart" ),
                messageEvent: messageView.eventObject,
                el: $(selector).find( ".coCharts-main-container" ),
                id: self.chartConfig.chartId
            });
            // Fill the possible child components.
            _.each( self.chartConfigModel.get( "mainChart" ).get( "accessorData" ), function( accessor, key ) {
                var axisName = "y" + accessor.y;
                if( accessor.chartType ) {
                    var componentName = axisName + "-" + accessor.chartType;
                    var foundComponent = _.find( compositeYChartView.components, function( component ) {
                        var found = false;
                        if( component.getName() == componentName ) {
                            found = true;
                        }
                        return found;
                    });
                    if( !foundComponent ) {
                        // The child component with this name does not exist yet. Instantiate the child component.
                        _.each( possibleChildViews, function( ChildView, chartType ) {
                            if( chartType == accessor.chartType ) {
                                var dataProvider = new DataProvider( modelConfigForChartType[accessor.chartType] );
                                foundComponent = new ChildView({
                                    model: dataProvider,
                                    config: self.chartConfigModel.get( "mainChart" ),
                                    messageEvent: messageView.eventObject,
                                    el: $(selector).find(".coCharts-main-container"),
                                    id: self.chartConfig.chartId,
                                    axisName: axisName
                                });
                                // Set any component specific params.
                                compositeYChartView.components.push( foundComponent );
                                console.log( "Found component: ", axisName, accessor.chartType, foundComponent );
                            }
                        });
                    }
                }
            });
            console.log( "compositeYChartView: ", compositeYChartView );
            compositeYChartView.render();

            tooltipView.registerTriggerEvent(compositeYChartView.eventObject, "showTooltip", "hideTooltip");

            /*
            if(self.isChartEnabled(self.chartConfigModel.get("mainChart"), "line")) {
                var lineChartDataProvider = new DataProvider();

                var lineChartView = new LineChartView({
                    model: lineChartDataProvider,
                    config: self.chartConfigModel.get("mainChart"),
                    messageEvent: messageView.eventObject,
                    el: $(selector).find(".coCharts-main-container"),
                    id: self.chartConfig.chartId
                });

                tooltipView.registerTriggerEvent(lineChartView.eventObject, "mouseover", "mouseout");
                self.chartComponents.push(lineChartView);
            }

            if (self.isChartEnabled(self.chartConfigModel.get("mainChart"), "bar")) {
                var barChartDataProvider = new DataProvider();

                var barChartView = new BarChartView({
                    model: barChartDataProvider,
                    config: self.chartConfigModel.get("mainChart"),
                    messageEvent: messageView.eventObject,
                    el: $(selector).find(".coCharts-main-container"),
                    id: self.chartConfig.chartId
                });

                //register tooltip event
                tooltipView.registerTriggerEvent(barChartView.eventObject, "mouseover", "mouseout");
                self.chartComponents.push(barChartView);
            }

            if (self.chartComponents.length !== 0) {
                self._renderChartComponents();
            }
            */

            //ControlPanel
            // var controlPanelConfigModel = new ControlPanelConfigModel(self.chartConfigModel.get("mainChart"));
            // var controlPanelView = new ControlPanelView({
            //     config: self.chartConfigModel.get("mainChart"),
            //     el: $(selector).find(".coCharts-control-panel-container")
            // });
            // controlPanelView.render();
            // self.registerConfigChangeEvent(controlPanelView.eventObject);

        },

        /*
        _renderChartComponents: function() {
            var self = this;
            _.each(self.chartComponents, function(component) {
                component.renderSVG = mainChartSVG;
                component.render();
            });
        }
        */
    });

    function getChartConfig(selector, chartOptions) {
        var chartSelector = $(selector).find(".coCharts-container"),
            chartWidth = ($(chartSelector).width() > 100) ? $(chartSelector).width() - 10 : undefined;

        var defaultChartConfig = {
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
                enable: false,
                top: false,
                right: {
                    custom: {
                        filterY: {
                            enable: true
                        }
                    },
                    expandedContainerWidth: 350,
                    expandedContainerHeight: 280
                }
            },
            mainChart: {
                chartHeight: 270,
                chartWidth: chartWidth,
                marginTop: 20,
                marginRight: 50,
                marginBottom: 50,
                marginLeft: 50,
                y1Label: "Y1 Axis",
                xLabel: "X Axis",
                y1LabelFormat: d3.format(","),
                xLabelFormat: d3.format(","),
                xAccessor: "x",
                xScale: undefined,
                forceX: [undefined, undefined],
                forceY: [undefined, undefined],
                accessorData: {}
            },
            message: {
                noDataMessage: "No Data Found",
                dataStatusMessage: true,
                statusMessageHandler: cowm.getRequestMessage,
            }
        };

        var chartConfig = $.extend(true, {}, defaultChartConfig, chartOptions);

        /*
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
        //Todo: Add Zoom scatter model
        */

        chartConfig.mainChart = new CompositeYChartConfigModel( chartConfig.mainChart );

        chartConfig.message = new MessageComponentConfigModel(chartConfig.message);

        return chartConfig;
    }

    /*
    function mainChartSVG() {
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
    */

    return ChartView;
});
