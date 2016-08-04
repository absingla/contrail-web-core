/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    "jquery",
    "underscore",
    "backbone"
], function( $, _, Backbone ) {
    var NavigationComponentConfigModel = Backbone.Model.extend({
        defaults: {

            chartWidth: undefined,
            chartHeight: 100,

            duration: 100,

            xTicks: 10,
            yTicks: 2,

            margin: 5,

            marginTop: undefined,
            marginBottom: undefined,
            marginLeft: undefined,
            marginRight: undefined,

            xScale: undefined,
            yScale: undefined,
            rScale: undefined,

            axisTop: false,
            axisBottom: true,
            axisLeft: true,
            axisRight: false,

            titleTop: undefined,
            titleBottom: undefined,
            titleLeft: undefined,
            titleRight: undefined,

            // Variable names to use
            rVariableName: "r",
            xVariableName: "x",
            yVariableName: "y"
        }
    });

    return NavigationComponentConfigModel;
});
