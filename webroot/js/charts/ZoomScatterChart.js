/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    'contrail-list-model',
    'contrail-view',
    'd3-v4',
    'core-basedir/js/charts/models/dataModel',
    'core-basedir/js/charts/models/dataProvider',
    'core-basedir/js/charts/models/scatterBubbleChartConfigModel',
    'core-basedir/js/charts/views/scatterBubbleChartView',
    'core-basedir/js/charts/models/navigationComponentConfigModel',
    'core-basedir/js/charts/views/navigationView',
    'core-basedir/js/charts/models/tooltipComponentConfigModel',
    'core-basedir/js/charts/views/tooltipView',
    'core-basedir/js/charts/models/variableSelectorComponentConfigModel',
    'core-basedir/js/charts/views/variableSelectorView'
], function (ContrailListModel, ContrailView, d3, DataModel, DataProvider,
             ScatterBubbleChartConfigModel, ScatterBubbleChartView,
             NavigationComponentConfigModel, NavigationView,
             TooltipComponentConfigModel, TooltipView,
             VariableSelectorComponentConfigModel, VariableSelectorView) {

    var ZoomScatterChartView = ContrailView.extend({
        render: function () {
            var self = this,
                viewConfig = self.attributes['viewConfig'],
                selector = $(self.$el),
                modelMap = contrail.handleIfNull(self.modelMap, {});

            if (contrail.checkIfExist(viewConfig.modelKey) && contrail.checkIfExist(modelMap[viewConfig.modelKey])) {
                self.model = modelMap[viewConfig.modelKey]
            }

            if (self.model === null && viewConfig['modelConfig'] != null) {
                self.model = new ContrailListModel(viewConfig['modelConfig']);
            }

            if (self.model !== null) {

                self.chartDataModel = new DataModel();
                
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

        updateChartDataModel: function () {
            var self = this,
                viewConfig = self.attributes.viewConfig,
                data = self.model.getItems();

            if (contrail.checkIfFunction(viewConfig['parseFn'])) {
                data = viewConfig['parseFn'](data);
            }

            if (contrail.checkIfFunction(self.chartConfig['dataParser'])) {
                data = self.chartConfig['dataParser'](data);
            }

            self.chartDataModel.set({data: data});

            console.log(data);
        },

        applyStaticData: function () {
            var self = this,
                staticData = {
                    /**
                     * Small initial dataset. It will be replaced by a bigger random dataset after a timeout.
                     */
                    dataset: [
                        {id: 1, a1: 1, b1: 1, c1: 1},
                        {id: 2, a1: 2, b1: 1, c1: 2},
                        {id: 3, a1: 3, b1: 2, c1: 5},
                        {id: 4, a1: 4, b1: 3, c1: 2},
                        {id: 5, a1: 5, b1: 9, c1: 2},
                        {id: 6, a1: 6, b1: 7, c1: 3},
                        {id: 7, a1: 7, b1: 2, c1: 2},
                        {id: 8, a1: 8, b1: 3, c1: 2},
                        {id: 9, a1: 9, b1: 9, c1: 9},
                        {id: 10, a1: 10, b1: 6, c1: 2}
                    ],

                    randomDataSet: function (n, rangeMin, rangeMax) {
                        var dataset = [];
                        for (var i = 0; i < n; i++) {
                            dataset.push({
                                id: i,
                                name: i,
                                x: i,
                                y: 100 * Math.random(),
                                flowCnt: 10 * Math.random(),
                                c1: 10 * Math.random(),
                                c2: 10 * Math.random()
                            });
                        }
                        return dataset;
                    }
                };

            self.chartDataModel.set({
                data: staticData.randomDataSet(250, 0, 1000), limit: {a1: [0, 100], a2: [0, 100]}
            });
        },

        renderChart: function (selector) {
            var self = this,
                viewConfig = self.attributes.viewConfig,
                chartTemplate = contrail.getTemplate4Id("coCharts-chart-template");
            
            var data = self.chartDataModel.get('data'),
                checkEmptyDataCB = function (data) {
                    return (!data || data.length === 0 || !data.filter(function (d) {
                        return d.length;
                    }).length);
                },
                chartDataRequestState = cowu.getRequestState4Model(self.model, data, checkEmptyDataCB);

            //Todo create a message view and register model and data providers for error
            //render the message view.

            // if (self.chartConfig.defaultDataStatusMessage && !(data.length > 0 && data[0].values.length > 0)) {
            //     var messageHandler = self.chartConfig.statusMessageHandler;
            //     self.renderMessage(messageHandler(chartDataRequestState), selector);
            // } 
            
            $(selector).find(".coCharts-container").remove();
            $(selector).append(chartTemplate(self.chartConfig));
            self.chartConfig = getChartConfig(selector, viewConfig['chartOptions']);

            //self.applyStaticData();

            //var chartConfigDataOptions = generateChartConfigModelOptions(self.chartConfig);
            var dataProvider = new DataProvider({parentDataModel: self.chartDataModel});

            //Todo Instead of variable selector view we will render a control panel with actions
            //One of the action will be filter/variable selection
            //each action will be defined using config
            var variableSelectorConfigModel = new VariableSelectorComponentConfigModel(self.chartConfig.controlPanel.filter);
            var variableSelectorView = new VariableSelectorView({config: variableSelectorConfigModel});
            $(selector).find(".coCharts-control-panel-container").append(variableSelectorView.render().el);

            // NavigationView
            var navigationComponentConfigModel = new NavigationComponentConfigModel(self.chartConfig.navigation);
            var navigationView = new NavigationView({
                model: dataProvider,
                config: navigationComponentConfigModel,
                id: "navigationView"
            });
            $(selector).find(".coCharts-navigation-container").append(navigationView.render().el);

            // Create a chartView providing an available DOM element to render in.
            var mainChartDataProvider = navigationView.getFocusDataProvider();
            var mainChartViewConfigModel = new ScatterBubbleChartConfigModel(self.chartConfig.mainChart);
            var mainChartView = new ScatterBubbleChartView({
                model: mainChartDataProvider,
                config: mainChartViewConfigModel,
                el: $(selector).find(".coCharts-main-container"),
                id: self.chartConfig.chartId
            });
            mainChartView.render();

            // TooltipView
            var tooltipConfig = new TooltipComponentConfigModel(self.chartConfig.tooltip);
            var tooltipView = new TooltipView({config: tooltipConfig});
            tooltipView.registerTriggerEvent(mainChartView.eventObject, "mouseover", "mouseout");
        },

        renderMessage: function (message, selector, chartOptions) {
            var self = this,
                message = contrail.handleIfNull(message, ""),
                selector = contrail.handleIfNull(selector, $(self.$el)),
                chartOptions = contrail.handleIfNull(chartOptions, self.chartConfig);

            var svgElement = $(selector).find('svg');
            if (!svgElement.length)
                $('<svg style="height:300px;" class="row-fluid"></svg>').appendTo(selector);

            var container = d3.select($(selector).find("svg")[0]),
                requestStateText = container.selectAll('.nv-requestState').data([message]),
                textPositionX = $(selector).width() / 2,
                textPositionY = chartOptions.margin.top + $(selector).find('.nv-focus').heightSVG() / 2 + 10;

            requestStateText
                .enter().append('text')
                .attr('class', 'nvd3 nv-requestState')
                .attr('dy', '-.7em')
                .style('text-anchor', 'middle');

            requestStateText
                .attr('x', textPositionX)
                .attr('y', textPositionY)
                .text(function (t) {
                    return t;
                });
        },

        removeMessage: function (selector) {
            var self = this,
                selector = contrail.handleIfNull(selector, $(self.$el));
            $(selector).find('svg').remove();
        }
    });

    function getChartConfig(selector, chartOptions) {
        var chartSelector = $(selector).find('.coCharts-container');

        var defaultZoomScatterConfig = {
            chartId: 'zoomScatterChart',
            navigation: {
                enable: false,
                xAccessor: 'x',
                accessorData: {}
            },
            controlPanel: {
                enable: false
            },
            mainChart: {
                chartHeight: 270,
                chartWidth: $(chartSelector).width() - 10,
                marginTop: 20,
                marginRight: 5,
                marginBottom: 50,
                marginLeft: 50,
                maxCircleRadius: 10,
                maxScale: 5,
                minScale: 1 / 5,
                yLabel: 'Y Axis',
                xLabel: 'X Axis',
                yLabelFormat: d3.format(','),
                xLabelFormat: d3.format(','),
                xAccessor: 'x',
                sizeAccessor: 'size',
                forceX: [undefined, undefined],
                forceY: [undefined, undefined],
                accessorData: {}
            },
            marginTop: 20, 
            marginRight: 5, 
            marginBottom: 50,
            marginLeft: 50,
            height: 350,
            width: '100%',
            dataParser: null,
            noDataMessage: 'No Data Found',
            defaultDataStatusMessage: true,
            statusMessageHandler: cowm.getRequestMessage,
        };

        var chartConfig = $.extend(true, {}, defaultZoomScatterConfig, chartOptions);

        //For now we will deduce yAccessor from the accessorData.
        //Todo multiple accessor support on each Y axis: Y1 & Y2
        chartConfig.navigation.yAccessor = Object.keys(chartConfig.navigation.accessorData)[0];
        chartConfig.mainChart.yAccessor = Object.keys(chartConfig.mainChart.accessorData)[0];
        chartConfig.mainChart.sizeAccessor = chartConfig.mainChart.accessorData[chartConfig.mainChart.yAccessor]["sizeAccessor"];
        
        return chartConfig;
    };
    
    return ZoomScatterChartView;
});