/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    'core-basedir/js/lbcharts/base/utils/ClassUtil',
    'core-basedir/js/lbcharts/base/utils/StringUtil',
    'core-basedir/js/lbcharts/base/utils/ConfigUtil',
    'core-basedir/js/lbcharts/base/Component',
    'core-basedir/js/lbcharts/base/Container',
    'core-basedir/js/lbcharts/base/Chart',
    'core-basedir/js/lbcharts/base/BarChartStrategy',
    
    'core-basedir/js/lbcharts/BarChart',
    'core-basedir/js/lbcharts/LineChart',
    'core-basedir/js/lbcharts/BarChartManager',
    'core-basedir/js/lbcharts/components/BrushMask',
    'core-basedir/js/lbcharts/components/Tooltip',
    'core-basedir/js/lbcharts/components/Crosshair',
    'core-basedir/js/lbcharts/strategy/BarChartGroupedStrategy',
    'core-basedir/js/lbcharts/strategy/BarChartStackedStrategy'
    
], function (ClassUtil, StringUtil, ConfigUtil, Component, Container, Chart, BarChartStrategy,
             BarChart, LineChart, BarChartManager, BrushMask, Tooltip, Crosshair,
             BarChartGroupedStrategy, BarChartStackedStrategy) {
    
    /**
     * Define library namespace.
     */
    var coCharts = {};

    coCharts.utils = {};
    coCharts.components = {};
    coCharts.charts = {};
    coCharts.examples = {};
    
    coCharts.utils.ClassUtil = ClassUtil;
    coCharts.utils.StringUtil = StringUtil;
    coCharts.utils.ConfigUtil = ConfigUtil;
    
    coCharts.Component = Component;
    coCharts.Container = Container;
    coCharts.Chart = Chart;
    
    coCharts.components.BrushMask = BrushMask;
    coCharts.components.Tooltip = Tooltip;
    coCharts.components.Crosshair = Crosshair;
    
    coCharts.BarChart = BarChart;
    coCharts.LineChart = LineChart;
    
    coCharts.BarChartStrategy = BarChartStrategy;
    coCharts.BarChartGroupedStrategy = BarChartGroupedStrategy;
    coCharts.BarChartStackedStrategy = BarChartStackedStrategy;
    coCharts.BarChartManager = BarChartManager;
    
    return coCharts;
});