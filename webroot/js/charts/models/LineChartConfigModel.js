/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    "jquery",
    "underscore",
    "backbone"
], function( $, _, Backbone ) {
    var LineChartConfigModel = Backbone.Model.extend({
        defaults: {
            /// The chart width. If not provided will be caculated by View.
            chartWidth: undefined,

            /// The chart height. If not provided will be caculated by View.
            chartHeight: undefined,

            /// Duration of chart transitions.
            duration: 100,

            xTicks: 10,
            y1Ticks: 10,
            y2Ticks: 10,

            /// General margin used for computing the side margins.
            margin: 5,

            /// Side margins. Will be computed if undefined.
            marginTop: undefined,
            marginBottom: undefined,
            marginLeft: undefined,
            marginRight: undefined,

            /// Scales can be provided as a d3 scale or undefined if they need to be calculated.
            xScale: undefined,
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

            //User is not supposed to update this variable.
            //In special cases, when chart is rendered part of another chart sharing axis
            //this will be set in the combination view. For example LineBarChart.
            _y1Chart: "line",
            _y2Chart: "line",
            _enableXAxis: "line",

            //Default we draw one chart series with y1 axis
            _y1AccessorList: ["y"],
            _y2AccessorList: []
        }
    });

    return LineChartConfigModel;
});
