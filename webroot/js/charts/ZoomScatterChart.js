/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    'contrail-list-model',
    'contrail-view',
    'd3-v4',
    'core-basedir/js/charts/model/dataModel',
    'core-basedir/js/charts/model/dataProvider',
    'core-basedir/js/charts/model/scatterBubbleChartConfigModel',
    'core-basedir/js/charts/view/scatterBubbleChartView',
    'core-basedir/js/charts/model/navigationComponentConfigModel',
    'core-basedir/js/charts/view/navigationView',
    'core-basedir/js/charts/model/tooltipComponentConfigModel',
    'core-basedir/js/charts/view/tooltipView',
    'core-basedir/js/charts/model/variableSelectorComponentConfigModel',
    'core-basedir/js/charts/view/variableSelectorView'
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

            self.chartConfig = getChartConfig(selector, viewConfig['chartOptions']);
            
            if (self.model !== null) {

                self.chartDataModel = new DataModel();

                // if (self.model.loadedFromCache || !(self.model.isRequestInProgress())) {
                //     self.renderChart(selector, viewConfig, self.model);
                // }

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

        updateChartDataModel: function() {
            var self = this,
                viewConfig = self.attributes.viewConfig,
                data = self.model.getItems();

            if (contrail.checkIfFunction(viewConfig['parseFn'])) {
                data = viewConfig['parseFn'](data);
            }

            if (contrail.checkIfFunction(self.chartConfig['dataParser'])) {
                data = self.chartConfig['dataParser'](data);
            }

            //self.chartDataModel.set({data: data});
        },
        
        applyStaticData: function() {
            var self = this,
                staticData = {
                /**
                 * Small initial dataset. It will be replaced by a bigger random dataset after a timeout.
                 */
                dataset: [
                    { id: 1, a1: 1, b1: 1, c1: 1 },
                    { id: 2, a1: 2, b1: 1, c1: 2 },
                    { id: 3, a1: 3, b1: 2, c1: 5 },
                    { id: 4, a1: 4, b1: 3, c1: 2 },
                    { id: 5, a1: 5, b1: 9, c1: 2 },
                    { id: 6, a1: 6, b1: 7, c1: 3 },
                    { id: 7, a1: 7, b1: 2, c1: 2 },
                    { id: 8, a1: 8, b1: 3, c1: 2 },
                    { id: 9, a1: 9, b1: 9, c1: 9 },
                    { id: 10, a1: 10, b1: 6, c1: 2 }
                ],

                randomDataSet: function( n, rangeMin, rangeMax ) {
                    var dataset = [];
                    for( var i = 0; i < n; i++ ) {
                        dataset.push( {
                            id: i,
                            a1: i,
                            b1: 100 * Math.random(),
                            b2: 100 * Math.random(),
                            c1: 10 * Math.random(),
                            c2: 10 * Math.random()
                        });
                    }
                    return dataset;
                }
            };

            self.chartDataModel.set({
                data: staticData.randomDataSet( 250, 0, 1000 ), limit: { a1: [0, 100], a2: [0, 100] }
            });
        },

        renderChart: function (selector) {
            var self = this,
                viewConfig = self.attributes.viewConfig,
                chartTemplate = contrail.getTemplate4Id("coCharts-chart-template"),
                widgetConfig = contrail.checkIfExist(viewConfig.widgetConfig) ? viewConfig.widgetConfig : null;


            var data = self.chartDataModel.get('data'),
                checkEmptyDataCB = function (data) {
                    return (!data || data.length === 0 || !data.filter(function (d) { return d.values.length; }).length);
                },
                chartDataRequestState = cowu.getRequestState4Model(self.model, data, checkEmptyDataCB);


            // if (self.chartConfig.defaultDataStatusMessage && !(data.length > 0 && data[0].values.length > 0)) {
            //     var messageHandler = self.chartConfig.statusMessageHandler;
            //     self.renderMessage(messageHandler(chartDataRequestState), selector);
            // } else {
            //     self.removeMessage();
                $(selector).find(".coCharts-container").remove();
                $(selector).append(chartTemplate(self.chartConfig));
            
            self.applyStaticData();
            
            var variableSelectorConfigModel = new VariableSelectorComponentConfigModel( {
                variables: [
                    { key: "x", name: "a1", options: [ { name: "a1", description: "time" } ] },
                    { key: "y", name: "b1", options: [ { name: "b1", description: "input bytes" }, { name: "b2", description: "output bytes" } ] },
                    { key: "r", name: "c1", options: [ { name: "c1", description: "input bytes" }, { name: "c2", description: "output bytes" } ] }
                ]
            });
                var dataProvider = new DataProvider({parentDataModel: self.chartDataModel});

                // Create variable selector.
                // var variableSelectorConfigModel = new VariableSelectorComponentConfigModel( {
                //     variables: [
                //         { key: "x", name: "x", options: [ { name: "x", description: "time" } ] },
                //         { key: "y", name: "y", options: [ { name: "y", description: "input bytes" }] },
                //         { key: "r", name: "size", options: [ { name: "size", description: "input bytes" }] }
                //     ]
                // });

                var variableSelectorView = new VariableSelectorView( { config: variableSelectorConfigModel } );
                $(selector).find( "#controlPanel" ).append( variableSelectorView.render().el );

                /*
                 var lineChartConfigModel = new LineChartConfigModel( { xVariableName: "a1", yVariableName: "b1" } );
                 var lineChartView = new LineChartView( {
                 model: dataProvider,
                 config: lineChartConfigModel,
                 id: "lineChart"
                 });
                 $( "#variableSelectorContainer" ).append( lineChartView.render().el );
                 */

                // Create a chartView and append in anywhere in the DOM later.
                // TODO: The data must be available in the model when rendering a view.
                
                // var viewInSideBarConfigModel = new ScatterBubbleChartConfigModel( { xVariableName: "a1", yVariableName: "b1", rVariableName: "c1" } );
                // var viewInSideBar = new ScatterBubbleChartView( {
                //     model: dataProvider,
                //     config: viewInSideBarConfigModel,
                //     id: "sideBarScatterChart"
                // });
                // $(selector).find( "#navigationView" ).append( viewInSideBar.render().el );

                // NavigationView
                var navigationComponentConfigModel = new NavigationComponentConfigModel( { xVariableName: "a1", yVariableName: "b1" } );
                var navigationView = new NavigationView( {
                    model: dataProvider,
                    config: navigationComponentConfigModel,
                    id: "navigationView"
                });
                $(selector).find( "#navigationPanel" ).append( navigationView.render().el );

                // Create a chartView providing an available DOM element to render in.
                var mainChartDataProvider = navigationView.getFocusDataProvider();
                var mainChartViewConfigModel = new ScatterBubbleChartConfigModel( { xVariableName: "a1", yVariableName: "b1", rVariableName: "c1" } );
                var mainChartView = new ScatterBubbleChartView( {
                    model: mainChartDataProvider,
                    config: mainChartViewConfigModel,
                    el: $(selector).find(".coCharts-container"),
                    id: self.chartConfig.chartId
                });
                mainChartView.render();

                // TooltipView
                var tooltipConfig = new TooltipComponentConfigModel();
                var tooltipView = new TooltipView( { config: tooltipConfig } );
                tooltipView.registerTriggerEvent( mainChartView.eventObject, "mouseover", "mouseout" );

            //}
        },

        renderMessage: function(message, selector, chartOptions) {
            var self = this,
                message = contrail.handleIfNull(message, ""),
                selector = contrail.handleIfNull(selector, $(self.$el)),
                chartOptions = contrail.handleIfNull(chartOptions, self.chartConfig);

            var svgElement = $(selector).find('svg');
            if(!svgElement.length)
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
                .text(function(t){ return t; });
        },

        removeMessage: function(selector) {
            var self = this,
                selector = contrail.handleIfNull(selector, $(self.$el));
            $(selector).find('svg').remove();
        }
    });

    function getChartConfig(selector, chartOptions) {
        var chartSelector = $(selector).find('.chart-container');

        chartOptions.width = $(chartSelector).width() - 10;

        var defaultConfig = {
            chartId: 'zoomScatterChart',
            navigationPanelConfig: {
                enable: false
            },
            controlPanelConfig: {
                enable: false
            },
            maxCircleRadius: 10,
            maxScale: 5,
            minScale: 1 / 5,
            yLabel: 'Y Axis',
            xLabel: 'X Axis',
            yLabelFormat: chartOptions.yLabelFormat,
            xLabelFormat: chartOptions.xLabelFormat,
            xField: 'x',
            yField: 'y',
            forceX: [undefined, undefined],
            forceY: [undefined, undefined],
            colorFilterFields: 'color',
            titleKey: 'title',
            categoryKey: 'project',
            margin: {top: 20, right: 5, bottom: 50, left: 50},
            height: 275,
            width: '100%',
            dataParser: null,
            sizeFieldName: 'size',
            noDataMessage: 'No Data Found',
            doBucketize : false,
            bubbleSizeFn: null,
            defaultDataStatusMessage: true,
            statusMessageHandler: cowm.getRequestMessage
        }

        var chartViewConfig = $.extend(true, {}, defaultConfig, chartOptions);
        // var chartViewConfig = {
        //     chartId: chartOptions.chartId ? chartOptions.chartId : 'zoomScatterChart',
        //     showMenu: chartOptions.showMenu ? chartOptions.showMenu : false,
        //     maxCircleRadius: 10,
        //     maxScale: 5,
        //     minScale: 1 / 5,
        //     yLabel: chartOptions.yLabel,
        //     xLabel: chartOptions.xLabel,
        //     yLabelFormat: chartOptions.yLabelFormat,
        //     xLabelFormat: chartOptions.xLabelFormat,
        //     xField: 'x',
        //     yField: 'y',
        //     forceX: chartOptions.forceX,
        //     forceY: chartOptions.forceY,
        //     colorFilterFields: 'color',
        //     titleKey: chartOptions.titleField,
        //     categoryKey: 'project',
        //     margin: margin,
        //     height: height,
        //     width: width,
        //     dataParser: chartOptions['dataParser'],
        //     sizeFieldName: chartOptions['sizeFieldName'],
        //     noDataMessage: chartOptions['noDataMessage'],
        //     doBucketize : chartOptions['doBucketize'],
        //     bubbleSizeFn: chartOptions['bubbleSizeFn'],
        //     defaultDataStatusMessage: true,
        //     statusMessageHandler: cowm.getRequestMessage
        // };

        return chartViewConfig;
    };

    return ZoomScatterChartView;
});