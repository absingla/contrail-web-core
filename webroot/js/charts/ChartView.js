/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

/*
define([
    "underscore",
    "backbone",
    "contrail-list-model",
    "contrail-view",
    "d3-v4",
    "core-basedir/js/charts/models/DataModel",
    "core-basedir/js/charts/models/DataProvider",
    "core-basedir/js/charts/models/CompositeYChartConfigModel",
    "core-basedir/js/charts/views/CompositeYChartView",
    "core-basedir/js/charts/models/TooltipComponentConfigModel",
    "core-basedir/js/charts/views/TooltipView",
    "core-basedir/js/charts/models/MessageComponentConfigModel",
    "core-basedir/js/charts/views/MessageView",
    "core-basedir/js/charts/models/NavigationComponentConfigModel",
    "core-basedir/js/charts/views/NavigationView",
    "core-basedir/js/charts/models/ControlPanelConfigModel",
    "core-basedir/js/charts/views/ControlPanelView",
    "core-basedir/js/charts/BindingHandler"
], function(
    _, Backbone, ContrailListModel, ContrailView, d3,
    DataModel, DataProvider,
    CompositeYChartConfigModel, CompositeYChartView,
    TooltipComponentConfigModel, TooltipView,
    MessageComponentConfigModel, MessageView,
    NavigationComponentConfigModel, NavigationView,
    ControlPanelConfigModel, ControlPanelView,
    BindingHandler
) {
    var ChartView = ContrailView.extend({
        render: function () {
            console.log( "ChartView render." );
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
                if (_.isUndefined(self.chartDataModel)) {
                    self.chartConfig = getChartConfig(selector, viewConfig.chartOptions);
                    self.chartDataModel = new DataModel({
                        dataParser: self.chartConfig.dataParser
                    });
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

        registerConfigChangeEvent: function(eventObject) {
            var self = this;
            self.listenTo(eventObject, "change", self.updateChartConfigModel);
        },

        updateChartConfigModel: function(updatedData) {
            var self = this;
            self.chartConfigModel.set({mainChart:{accessorData: updatedData}});
        },

        isEnabledComponent: function( configName ) {
            var self = this;
            var enabled = false;
            if( _.isObject( self.chartConfig[configName] ) ) {
                if( self.chartConfig[configName].enable !== false ) {
                    enabled = true;
                }
            }
            return enabled;
        },

        renderChart: function (selector) {
            var self = this;
            var chartTemplate = contrail.getTemplate4Id( "coCharts-chart-template" );

            // TODO: can we re-use without removing elements?
            $(selector).find( ".coCharts-container" ).remove();
            $(selector).append( chartTemplate( self.chartConfig ) );

            var messageView = null;
            var tooltipView = null;
            var navigationView = null;
            var compositeYChartView = null;
            var controlPanelView = null;
            var dataProvider = new DataProvider({
                parentDataModel: self.chartDataModel
            });
            var bindingHandler = new BindingHandler( self.chartConfig.bindingHandler );
            console.log( "ChartView renderChart: ", self.chartConfig );

            // TODO: automate the component instantiation code below to be config driven
            if( self.isEnabledComponent( "message" ) ) {
                // Common Message View. will be used for rendering info messages and error
                // TODO: id should be config based
                messageView = new MessageView({
                    config: new MessageComponentConfigModel( self.chartConfig.message ),
                    id: "messageView",
                    container: $(selector).find( ".coCharts-main-container" )
                });
                messageView.render();
                bindingHandler.addComponent( "message", messageView );
                //One way to bind to message events of already created model
                messageView.registerModelDataStatusEvents( self.chartDataModel );
            }
            if( self.isEnabledComponent( "tooltip" ) ) {
                tooltipView = new TooltipView({
                    config: new TooltipComponentConfigModel( self.chartConfig.tooltip )
                });
                tooltipView.render();
                bindingHandler.addComponent( "tooltip", tooltipView );
            }
            if( self.isEnabledComponent( "navigation" ) ) {
                // TODO: id should be config based
                navigationView = new NavigationView({
                    model: dataProvider,
                    config: new NavigationComponentConfigModel( self.chartConfig.navigation ),
                    id: "navigationView",
                    el: $(selector).find( ".coCharts-navigation-container" )
                });
                //$(selector).find(".coCharts-navigation-container").append(navigationView.render().el);
                console.log( "NavigationView: ", navigationView );
                navigationView.render();
                bindingHandler.addComponent( "navigation", navigationView );
                // The remaining components dataModel will be the one fetched from the navigationView.
                dataProvider = navigationView.getFocusDataProvider();
                if( messageView ) {
                    messageView.registerComponentMessageEvent( navigationView.eventObject );
                }
            }
            if( self.isEnabledComponent( "mainChart" ) ) {
                compositeYChartView = new CompositeYChartView({
                    model: dataProvider,
                    config: new CompositeYChartConfigModel( self.chartConfig.mainChart ),
                    el: $(selector).find( ".coCharts-main-container" ),
                    id: self.chartConfig.chartId
                });
                console.log( "MainChart: ", compositeYChartView );
                compositeYChartView.render();
                bindingHandler.addComponent( "mainChart", compositeYChartView );
                if( messageView ) {
                    messageView.registerComponentMessageEvent( compositeYChartView.eventObject );
                }
                if( tooltipView ) {
                    tooltipView.registerTriggerEvent( compositeYChartView.eventObject, "showTooltip", "hideTooltip" );
                }
            }
            if( self.isEnabledComponent( "controlPanel" ) ) {
                var controlPanelView = new ControlPanelView( {
                    config: new ControlPanelConfigModel( self.chartConfig.controlPanel ),
                    el: $(selector).find( ".coCharts-control-panel-container" )
                });
                controlPanelView.render();
                bindingHandler.addComponent( "controlPanel", controlPanelView );
                // self.registerConfigChangeEvent(controlPanelView.eventObject);
            }
            bindingHandler.start();
        },

    });

    function getChartConfig(selector, chartOptions) {
        //var chartSelector = $(selector).find(".coCharts-container"),
        //    chartWidth = ($(chartSelector).width() > 100) ? $(chartSelector).width() - 10 : undefined;

        var defaultChartConfig = {
            chartId: "ChartView",
            marginTop: 20,
            marginRight: 5,
            marginBottom: 50,
            marginLeft: 50,
            height: 350,
            width: "100%",
            dataParser: null,
            navigation: {
                enable: false,
                chartHeight: 200,
                //chartWidth: chartWidth,
                xAccessor: "x",
                curve: d3.curveCatmullRom.alpha( 0.5 ),
                accessorData: {}
            },
            controlPanel: {
                enable: false,
            },
            mainChart: {
                chartHeight: 270,
                //chartWidth: chartWidth,
                //marginTop: 20,
                //marginRight: 70,
                //marginBottom: 50,
                //marginLeft: 70,
                xLabel: "X Axis",
                xAccessor: "x",
                xScale: undefined,
                curve: d3.curveCatmullRom.alpha( 0.5 ),
                //curve: d3.curveLinear,
                accessorData: {}
            },
            message: {
                noDataMessage: "No Data Found",
                dataStatusMessage: true,
                statusMessageHandler: cowm.getRequestMessage,
            },
            tooltip: {
                // TODO: tooltip config here
            }
        };
        var chartConfig = $.extend(true, {}, defaultChartConfig, chartOptions);
        return chartConfig;
    }

    return ChartView;
});
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
            // height: 350,
            handlers: [],
            components: []
            //width: "100%",
            // navigation: {
            //     enable: false,
            //     chartHeight: 200,
            //     //chartWidth: chartWidth,
            //     curve: d3.curveCatmullRom.alpha( 0.5 ),
            // },
            // controlPanel: {
            //     enable: false,
            // },
            // xyChart: {
            //     chartHeight: 270,
            //     curve: d3.curveCatmullRom.alpha( 0.5 ),
            // },
            // message: {
            //     noDataMessage: "No Data Found",
            //     dataStatusMessage: true,
            //     statusMessageHandler: cowm.getRequestMessage,
            // // },
            // tooltip: {
            //     // TODO: tooltip config here
            // }
        };
        var chartConfig = $.extend(true, {}, defaultChartConfig, chartConfig);
        return chartConfig;
    }

    return ChartView;
});