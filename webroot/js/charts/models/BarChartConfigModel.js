/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    "jquery",
    "underscore",
    "backbone",
    "d3-v4"
], function ($, _, Backbone, d3) {
    var BarChartConfigModel = Backbone.Model.extend({
        defaults: {
            /// The chart width. If not provided will be calculated by View.
            chartWidth: undefined,

            /// The chart height. If not provided will be calculated by View.
            chartHeight: undefined,

            /// Duration of chart transitions.
            duration: 100,

            xTicks: 10,
            y1Ticks: 5,
            y2Ticks: 5,

            /// General margin used for computing the side margins.
            margin: 5,

            /// Side margins. Will be computed if undefined.
            marginTop: undefined,
            marginBottom: undefined,
            marginLeft: undefined,
            marginRight: undefined,

            /// Scales can be provided as a d3 scale or undefined if they need to be calculated.
            xScale: undefined, //d3.scaleTime()
            y1Scale: undefined,
            y2Scale: undefined,

            /// Axis can be provided as a d3 axis or true if they need to be calculated.
            axisTop: false,
            axisBottom: true,
            axisLeft: true,
            axisRight: false,

            // Titles
            titleTop: undefined,
            titleBottom: undefined,
            titleLeft: undefined,
            titleRight: undefined,

            // Variable names to use
            xAccessor: "x",

            xFormatter: d3.timeFormat("%H:%M"),
            y1Formatter: d3.format(".01f"),
            y2Formatter: d3.format(".01f"),

            accessorData: {},

            //GROUPED or STACKED chart
            chartType: "none",

            //User is not supposed to update this variable.
            //In special cases, when chart is rendered part of another chart sharing axis
            //this will be set in the combination view. For example LineBarChart.
            _y1Chart: "bar",
            _y2Chart: "bar",
            _enableXAxis: "bar",

            //Default we draw one chart series with y1 axis
            _y1AccessorList: ["y"],
            _y2AccessorList: []
        }
    });

    return BarChartConfigModel;
});
