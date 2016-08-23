/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    "jquery",
    "underscore",
    "backbone",
    "d3-v4",
    "core-basedir/js/charts/views/DataView",
    "core-basedir/js/charts/models/BarChartConfigModel"
], function ($, _, Backbone, d3, DataView, BarChartConfigModel) {
    var LineChartView = DataView.extend({
        tagName: "div",
        className: "bar-chart",

        initialize: function (options) {
            /// The config model
            this.config = (options.config) ? options.config : new BarChartConfigModel();

            /// View params hold values from the config and computed values.
            this.resetParams();

            this.listenTo(this.model, "change", this.render);
            this.listenTo(this.config, "change", this.render);
            this.eventObject = _.extend({}, Backbone.Events);
        },

        getData: function () {
            return this.model.getData();
        },

        //Return number of Bar charts on axis
        getChartCount: function (yAxisNumber) {
            var self = this;
            return self.params["_y" + (yAxisNumber ? yAxisNumber : 1) + "AccessorList"].length;
        },

        //Return the Y axis accessor belongs to.
        getYAxis: function(accessor) {
            var axis = undefined;
            if (_.contains(this.params._y1AccessorList, accessor)) {
                axis = 1;
            } else if (_.contains(this.params._y2AccessorList, accessor)) {
                axis = 2;
            }
            return axis;
        },

        getBarX: function (i) {
            var self = this,
                delimiter = self.getData().length > 1 ? 1 : 0;

            return self.params.xScale(self.params.xAccessor) - this.params.chartWidth / (self.getData().length - delimiter) * i;
        },

        getBarY: function () {

        },

        getBarGap: function () {
            var self = this;
            return self.params.chartWidth / self.getData().length / 20;
        },

        getBarWidth: function (accessor) {
            var self = this;

            if (self.params.strategy === "GROUPED") {
                var axisChartCount = self.getChartCount(self.getYAxis(accessor));
                return (self.params.chartWidth / self.getData().length - self.getBarGap()) / axisChartCount ;
            } else {
                return self.params.chartWidth / self.getData().length - self.getBarGap();
            }
        },

        getBarHeight: function (value) {
            var self = this;
            if (self.params.strategy === "GROUPED") {
                return (self.params.chartHeight - self.params.y1Scale(value));
            } else {
                return self.params.chartWidth - self.getBarGap(value);
            }
        },

        updateAccessorList: function () {
            var self = this;
            _.each(this.params.accessorData, function (accessor) {
                if (accessor.y === 1) {
                    self.params._y1AccessorList.push(accessor);
                } else if (accessor.y === 2) {
                    self.params._y2AccessorList.push(accessor);
                }
            });
        },

        /**
         * Calculates the chart dimensions and margins.
         * Use the dimensions provided in the config. If not provided use all available width of container and 3/4 of this width for height.
         * This method should be called before rendering because the available dimensions could have changed.
         */
        calculateDimensions: function () {
            var self = this;
            if (!self.params.chartWidth) {
                self.params.chartWidth = self.$el.width();
            }
            if (!self.params.chartHeight) {
                self.params.chartHeight = Math.round(3 * self.params.chartWidth / 4);
            }
            var elementsThatNeedMargins = {title: 30, axis: 30};
            _.each(["Top", "Bottom", "Left", "Right"], function (side) {
                if (!self.params["margin" + side]) {
                    self.params["margin" + side] = self.params.margin;
                    _.each(elementsThatNeedMargins, function (marginAdd, key) {
                        if (self.params[key + side]) {
                            // The side margin was undefined and we need addition room (for axis, title, etc.)
                            self.params["margin" + side] += marginAdd;
                        }
                    });
                }
            });
        },

        /**
         * Calculates the [min, max] for an accessorList
         * @param accessorList
         */
        getRangeForAxis: function (accessorList) {
            var self = this,
                axisRange = [];
            _.each(accessorList, function (accessor) {
                axisRange = axisRange.concat(self.model.getRangeFor(accessor));
            });
            return d3.extent(axisRange);
        },

        /**
         * Use the scales provided in the config or calculate them to fit data in view.
         * Assumes to have the range values available in the DataProvider (model) and the chart dimensions available in params.
         */
        calculateScales: function () {
            var self = this;
            var rangeX = self.model.getRangeFor(this.params.xAccessor);
            var rangeY1 = self.getRangeForAxis(this.params._y1AccessorList);
            var rangeY2 = self.getRangeForAxis(this.params._y2AccessorList);

            if (!self.params.xScale) {
                var xMinpx = self.params.marginLeft;
                var xMaxpx = self.params.chartWidth - self.params.marginRight;
                self.params.xScale = d3.scaleLinear().domain(rangeX).range([xMinpx, xMaxpx]);//.nice( self.params.xTicks );
            }

            var yMaxpx = self.params.marginTop;
            var yMinpx = self.params.chartHeight - self.params.marginBottom;
            if (!self.params.y1Scale) {
                self.params.y1Scale = d3.scaleLinear().domain(rangeY1).range([yMinpx, yMaxpx]);//.nice( self.params.yTicks );
            }
            if (!self.params.y2Scale) {
                self.params.y2Scale = d3.scaleLinear().domain(rangeY2).range([yMinpx, yMaxpx]);//.nice( self.params.yTicks );
            }

        },

        /**
         * Renders an empty chart.
         * Changes chart dimensions if it already exists.
         */
        renderSVG: function () {
            var self = this;
            var svgs = d3.select(self.$el.get(0)).selectAll("svg").data([self.id]);
            var svg = svgs.enter().append("svg").attr("id", function (d) {
                return d;
            });
            svg.append("g")
                .attr("class", "axis x-axis")
                .attr("transform", "translate(0," + ( self.params.y1Scale.range()[1] ) + ")");
            svg.append("g")
                .attr("class", "axis y1-axis")
                .attr("transform", "translate(" + ( self.params.xScale.range()[0] ) + ",0)");
            svg.append("g")
                .attr("class", "axis y2-axis")
                .attr("transform", "translate(" + ( self.params.xScale.range()[1] ) + ",0)");
            svg.append("g")
                .attr("class", "y1bars");
            svg.append("g")
                .attr("class", "y2bars");

            self.svgSelection()
                .attr("width", self.params.chartWidth)
                .attr("height", self.params.chartHeight);
        },

        svgSelection: function () {
            var self = this;
            return d3.select(self.$el.get(0)).select("svg#" + self.id);
        },

        /**
         * Renders the axis.
         */
        renderAxis: function () {
            var self = this;
            var xAxis = d3.axisBottom(self.params.xScale)
                .tickSizeInner(self.params.y1Scale.range()[0] - self.params.y1Scale.range()[1])
                .tickPadding(5).ticks(self.params.xTicks);
            var y1Axis = d3.axisLeft(self.params.y1Scale)
                .tickSize(-(self.params.xScale.range()[1] - self.params.xScale.range()[0]))
                .tickPadding(5).ticks(self.params.y1Ticks);
            var svg = self.svgSelection().transition().ease(d3.easeLinear).duration(self.params.duration);
            svg.select(".axis.x-axis").call(xAxis);
            svg.select(".axis.y1-axis").call(y1Axis);
        },

        renderData: function () {
            var self = this;
            var data = self.getData();
            console.log("Rendering data in (" + self.id + "): ", data, self.params);
            var svg = self.svgSelection();

            var y1BarEnter = svg.select(".y1bars").selectAll(".bar").data(data).enter(),
                y2BarEnter = svg.select(".y2bars").selectAll(".bar").data(data).enter();

            // Render Y1 axis. iterate over y1AccessorList
            _.each(self.params._y1AccessorList, function (accessor) {
                y1BarEnter.append("rect")
                    .attr("class", "bar")
                    .attr("x", function (d, i) {
                        return self.params.xScale(d[self.params.xAccessor]);
                    }).attr("y", function (d, i) {
                        return self.params.y1Scale(d[accessor]);
                    }).attr("width", function (d, i) {
                        return self.getBarWidth(accessor);
                    }).attr("height", function (d, i) {
                        return self.getBarHeight(d[accessor], i);
                    }).attr("fill");
            });

            // Render Y2 axis
            _.each(self.params._y2AccessorList, function (accessor) {
                y2BarEnter.append("rect")
                    .attr("class", "bar")
                    .attr("x", function (d, i) {
                        return self.params.xScale(d[self.params.xAccessor]);
                    }).attr("y", function (d, i) {
                    return self.params.y2Scale(d[accessor]);
                }).attr("width", function (d, i) {
                    return self.getBarWidth(d);
                }).attr("height", function (d, i) {
                    return self.getBarHeight(d[accessor], i);
                });
            });
        },

        render: function () {
            var self = this;
            _.defer(function () {
                self.resetParams();
                self.updateAccessorList();
                self.calculateDimensions();
                self.calculateScales();
                self.renderSVG();
                self.renderAxis();
                self.renderData();
            });
            return self;
        }
    });

    return LineChartView;
});
