/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    "jquery",
    "underscore",
    "backbone",
    "core-basedir/js/charts/models/BaseConfigModel"
], function( $, _, Backbone, BaseConfigModel ) {
    var CompositeYChartConfigModel = BaseConfigModel.extend({
        defaults: {
            /// The chart width. If not provided will be caculated by View.
            chartWidth: undefined,

            /// The chart height. If not provided will be caculated by View.
            chartHeight: undefined,

            /// Duration of chart transitions.
            duration: 100,

            xTicks: 10,
            yTicks: 10,

            /// General margin used for computing the side margins.
            margin: 5,

            /// Side margins. Will be computed if undefined.
            marginTop: undefined,
            marginBottom: undefined,
            marginLeft: undefined,
            marginRight: undefined,
            marginInner: undefined,

            /// Scales can be provided as a d3 scale or undefined if they need to be calculated.
            xScale: undefined,
            xRange: undefined,

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

            // x variable name
            xAccessor: "x"
        }
    });

    return CompositeYChartConfigModel;
});
