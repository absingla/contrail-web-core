/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    "jquery",
    "underscore",
    "backbone",
    "d3-v4",
    "core-basedir/js/charts/views/LineChartView",
    "core-basedir/js/charts/models/DataProvider"
], function ($, _, Backbone, d3, LineChartView, DataProvider) {

    var NavigationView = LineChartView.extend({
        tagName: "div",
        className: "navigation-view line-chart",

        initialize: function (options) {
            var self = this;
            self.config = options.config;
            self.resetParams();
            self.template = contrail.getTemplate4Id("coCharts-navigation-panel");
            self.listenTo(self.model, "change", self.modelChanged);
            self.listenTo(self.config, "change", self.render);
            self.eventObject = _.extend({}, Backbone.Events);
            var throttled = _.throttle( function() {
                self.render();
            }, 100 );
            $( window ).resize( throttled );

            self.focusDataProvider = new DataProvider({parentDataModel: self.model});
            self.brush = null;
        },

        events: {
            "click .prev>a": "prevChunkSelected",
            "click .next>a": "nextChunkSelected"
        },

        modelChanged: function (e) {
            var self = this;
            var x = this.params.xAccessor;
            var rangeX = self.model.getRangeFor(x);
            // Fetch the previous data window position
            var prevWindowXMin = self.params.windowXMin;
            var prevWindowXMax = self.params.windowXMax;
            var prevWindowSize = prevWindowXMax - prevWindowXMin;
            // Prepare the scales for setting the new window position.
            self.resetParams();
            self.calculateDimmensions();
            self.calculateScales();
            // Try to keep the same data window. Move it if exceeds data range.
            if (!_.isUndefined(prevWindowXMin) && !_.isUndefined(prevWindowXMax)) {
                var xMin = prevWindowXMin;
                var xMax = prevWindowXMax;
                if (xMin < rangeX[0]) {
                    xMin = rangeX[0];
                }
                if (xMin > rangeX[1] - prevWindowSize) {
                    xMin = rangeX[1] - prevWindowSize;
                }
                if (xMax > rangeX[1]) {
                    xMax = rangeX[1];
                }
                if (xMax < rangeX[0] + prevWindowSize) {
                    xMax = rangeX[0] + prevWindowSize;
                }
                //var newFocusRange = _.extend( {}, range, { x: [xMin, xMax] } );
                var newFocusRange = {};
                newFocusRange[x] = [xMin, xMax];
                self.focusDataProvider.setRangeFor(newFocusRange);

                var brushGroup = self.svgSelection().select("g.brush").transition().ease(d3.easeLinear).duration(self.params.duration);
                self.brush.move(brushGroup, [self.params.xScale(xMin), self.params.xScale(xMax)]);
            }
            self.render();
        },

        prevChunkSelected: function () {
            var range = this.model.getRange();
            var x = this.params.xAccessor;
            var rangeDiff = range[x][1] - range[x][0];
            var queryLimit = {};
            queryLimit[x] = [range[x][0] - rangeDiff * 0.5, range[x][1] - rangeDiff * 0.5];
            this.model.setQueryLimit(queryLimit);
            // TODO: show some waiting screen?
        },

        nextChunkSelected: function () {
            var range = this.model.getRange();
            var x = this.params.xAccessor;
            var rangeDiff = range[x][1] - range[x][0];
            var queryLimit = {};
            queryLimit[x] = [range[x][0] + rangeDiff * 0.5, range[x][1] + rangeDiff * 0.5];
            this.model.setQueryLimit(queryLimit);
            // TODO: show some waiting screen?
        },

        getFocusDataProvider: function () {
            return this.focusDataProvider;
        },

        renderBrush: function () {
            var self = this;
            var x = self.params.xAccessor;
            if (!self.brush) {
                var svg = self.svgSelection();
                self.brush = d3.brushX()
                    .extent([[0, 0], [self.params.chartWidth, self.params.chartHeight]])
                    .handleSize(10)
                    .on("brush", function () {
                        var dataWindow = d3.event.selection;
                        var xMin = self.params.xScale.invert(dataWindow[0]);
                        var xMax = self.params.xScale.invert(dataWindow[1]);
                        self.params.windowXMin = xMin;
                        self.params.windowXMax = xMax;
                        //var focusRange = _.extend( {}, self.focusDataProvider.getRange(), { x: [xMin, xMax] } );
                        var focusRange = {};
                        focusRange[x] = [xMin, xMax];
                        self.focusDataProvider.setRangeFor(focusRange);
                        self.eventObject.trigger("windowChanged", xMin, xMax);
                    });
                svg.append("g").attr("class", "brush").call(self.brush);
            }
        },

        renderPageLinks: function () {
            var self = this;
            if (!self.$el.find(".page-links").length) {
                $("<div>").appendTo(self.$el).addClass("page-links");
            }
            self.$el.find(".page-links").html(self.template());
        },

        render: function () {
            var self = this;
            _.defer(function () {
                self.resetParams();
                self.calculateDimmensions();
                self.calculateScales();
                self.renderSVG();
                self.renderAxis();
                self.renderData();
                // TODO: navigation view should just append brush into svg and append page links into svg container.
                self.renderBrush();
                self.renderPageLinks();
            });
            return self;
        }
    });

    return NavigationView;
});
