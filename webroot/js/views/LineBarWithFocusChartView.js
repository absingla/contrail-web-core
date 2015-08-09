/*
 * Copyright (c) 2014 Juniper Networks, Inc. All rights reserved.
 */

define([
    'underscore',
    'contrail-view',
    'core-basedir/js/models/LineBarWithFocusChartModel',
    'contrail-list-model'
], function (_, ContrailView, LineBarWithFocusChartModel, ContrailListModel) {
    var LineBarWithFocusChartView = ContrailView.extend({
        render: function () {
            var viewConfig = this.attributes.viewConfig,
                ajaxConfig = viewConfig['ajaxConfig'],
                self = this, deferredObj = $.Deferred(),
                selector = $(self.$el);

            if (self.model === null && viewConfig['modelConfig'] != null) {
                self.model = new ContrailListModel(viewConfig['modelConfig']);
            }

            self.renderChart(selector, viewConfig, self.model);

            if (self.model !== null) {
                if (self.model.loadedFromCache || !(self.model.isRequestInProgress())) {
                    self.renderChart(selector, viewConfig, self.model);
                }

                self.model.onAllRequestsComplete.subscribe(function () {
                    self.renderChart(selector, viewConfig, self.model);
                });

                if (viewConfig.loadChartInChunks) {
                    self.model.onDataUpdate.subscribe(function () {
                        self.renderChart(selector, viewConfig, self.model);
                    });
                }
            }
        },

        renderChart: function (selector, viewConfig, chartViewModel) {
            var data = chartViewModel.getItems(),
                chartTemplate = contrail.getTemplate4Id(cowc.TMPL_CHART),
                widgetConfig = contrail.checkIfExist(viewConfig.widgetConfig) ? viewConfig.widgetConfig : null,
                chartViewConfig, chartOptions, chartModel;

            if (contrail.checkIfFunction(viewConfig['parseFn'])) {
                data = viewConfig['parseFn'](data);
            }

            chartViewConfig = getChartViewConfig(data, viewConfig);
            chartOptions = chartViewConfig['chartOptions'];
            chartModel = new LineBarWithFocusChartModel(chartOptions);
            this.chartModel = chartModel;

            if ($(selector).find("svg") != null) {
                $(selector).empty();
            }

            $(selector).append(chartTemplate(chartOptions));

            //Store the chart object as a data attribute so that the chart can be updated dynamically
            $(selector).data('chart', chartModel);

            nvd3v181.addGraph(function () {
                if (!($(selector).is(':visible'))) {
                    $(selector).find('svg').bind("refresh", function () {
                        setData2Chart(selector, chartViewConfig, chartViewModel, chartModel);
                    });
                } else {
                    setData2Chart(selector, chartViewConfig, chartViewModel, chartModel);
                }

                nvd3v181.utils.windowResize(chartModel.update);

                chartModel.dispatch.on('stateChange', function (e) {
                    nvd3v181.log('New State:', JSON.stringify(e));
                });
                return chartModel;
            });

            if (widgetConfig !== null) {
                this.renderView4Config(selector.find('.chart-container'), chartViewModel, widgetConfig, null, null, null);
            }
        }
    });

    function setData2Chart(selector, chartViewConfig, chartViewModel, chartModel) {

        var chartData = chartViewConfig.chartData,
            checkEmptyDataCB = function (data) {
                return (!data || data.length === 0 || !data.filter(function (d) { return d.values.length; }).length);
            },
            chartDataRequestState = cowu.getRequestState4Model(chartViewModel, chartData, checkEmptyDataCB),
            chartDataObj = {
                data: chartData,
                requestState: chartDataRequestState
            },
            chartOptions = chartViewConfig['chartOptions'];

        d3.select($(selector)[0]).select('svg').datum(chartDataObj).call(chartModel);

        if (chartDataRequestState !== cowc.DATA_REQUEST_STATE_SUCCESS_NOT_EMPTY) {

            var container = d3.select($(selector).find("svg")[0]),
                requestStateText = container.selectAll('.nv-requestState').data([cowm.getRequestMessage(chartDataRequestState)]),
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

        } else {
            $(selector).find('.nv-requestState').remove();
        }
    }

    function getChartViewConfig(chartData, chartOptions) {
        var chartViewConfig = {};
        var chartDefaultOptions = {
            margin: {top: 50, right: 70, bottom: 30, left: 70},
            margin2: {top: 0, right: 70, bottom: 40, left: 70},
            height: 300,
            axisLabelDistance: 5,
            y1AxisLabel: 'CPU Utilization (%)',
            y2AxisLabel: 'Memory Usage',
            y2Formatter: function (y2Value) {
                var formattedValue = formatBytes(y2Value * 1024, true);
                return formattedValue;
            },
            y1Formatter: d3.format(".01f"),
            showLegend: true
        };

        var chartOptions = $.extend(true, {}, chartDefaultOptions, chartOptions);

        var defaultForceY1 = contrail.checkIfExist(chartOptions['forceY1']) ? chartOptions['forceY1'] : [0, 5],
            defaultForceY2 = contrail.checkIfExist(chartOptions['forceY2']) ? chartOptions['forceY2'] : [0, 5],
            newForceY1 = getForceY1Axis(chartData, defaultForceY1),
            newForceY2 = getForceY2Axis(chartData, defaultForceY2);

        chartOptions['forceY1'] = newForceY1;
        chartOptions['forceY2'] = newForceY2;

        if (chartData.length > 0) {
            var values = chartData[0].values,
                brushExtent = null,
                start, end;

            if (values.length >= 25) {
                start = values[values.length - 25];
                end = values[values.length - 1];
                chartOptions['brushExtent'] = [getViewFinderPoint(start.x), getViewFinderPoint(end.x)];
            }
        }

        chartViewConfig['chartData'] = chartData;
        chartViewConfig['chartOptions'] = chartOptions;

        return chartViewConfig;
    };

    function getForceY1Axis(chartData, defaultForceY1) {
        var dataBars = chartData.filter(function (d) {
                return !d.disabled && d.bar
            }),
            dataAllBars = [], forceY1;

        for (var j = 0; j < dataBars.length; j++) {
            dataAllBars = dataAllBars.concat(dataBars[j]['values']);
        }

        forceY1 = cowu.getForceAxis4Chart(dataAllBars, "y", defaultForceY1);
        return forceY1;
    };

    function getForceY2Axis(chartData, defaultForceY2) {
        var dataLines = chartData.filter(function (d) {
                return !d.bar
            }),
            dataAllLines = [], forceY2;

        for (var i = 0; i < dataLines.length; i++) {
            dataAllLines = dataAllLines.concat(dataLines[i]['values']);
        }

        forceY2 = cowu.getForceAxis4Chart(dataAllLines, "y", defaultForceY2);
        return forceY2;
    };

    return LineBarWithFocusChartView;
});