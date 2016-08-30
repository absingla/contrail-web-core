/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    "jquery",
    "underscore",
    "backbone",
    "d3-v4",
    "core-basedir/js/charts/views/DataView"
], function ($, _, Backbone, d3, DataView) {
    var LineChartView = DataView.extend({
        tagName: "div",
        className: "line-chart",

        initialize: function (options) {
            // TODO: Every model change will trigger a redraw. This might not be desired - dedicated redraw event?

            /// The config model
            this.config = options.config;

            /// View params hold values from the config and computed values.
            this.resetParams();

            this.listenTo(this.model, "change", this.render);
            this.listenTo(this.config, "change", this.render);
            this.eventObject = _.extend({}, Backbone.Events);
        },

        updateAccessorList: function () {
            var self = this;
            self.params._y1AccessorList = [];
            self.params._y2AccessorList = [];
            _.each(this.params.accessorData, function (accessor, key) {
                if (accessor.y === 1) {
                    self.params._y1AccessorList.push(key);
                } else if (accessor.y === 2) {
                    self.params._y2AccessorList.push(key);
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
         * Use the scales provided in the config or calculate them to fit data in view.
         * Assumes to have the range values available in the DataProvider (model) and the chart dimensions available in params.
         */
        calculateScales: function () {
            var self = this;
            var rangeX = self.model.getRangeFor(this.params.xAccessor);
            var rangeY1 = self.getRangeForAxis(this.params._y1AccessorList);
            var rangeY2 = self.getRangeForAxis(this.params._y2AccessorList);

            if (!self.params.xScale) {
                self.params.xScale = d3.scaleLinear();
            }
            var xMinpx = self.params.marginLeft;
            var xMaxpx = self.params.chartWidth - self.params.marginLeft - self.params.marginRight;
            self.params.xScale.domain(rangeX).range([xMinpx, xMaxpx]);//.nice( self.params.xTicks );

            if (!self.params.y1Scale) {
                self.params.y1Scale = d3.scaleLinear();
            }
            if (!self.params.y2Scale) {
                self.params.y2Scale = d3.scaleLinear();
            }
            var yMaxpx = self.params.marginTop;
            var yMinpx = self.params.chartHeight - self.params.marginBottom - self.params.marginTop;
            self.params.y1Scale.domain(rangeY1).range([yMinpx, yMaxpx]);//.nice( self.params.yTicks );
            self.params.y2Scale.domain(rangeY2).range([yMinpx, yMaxpx]);
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
                .attr("class", "axis y-axis y1-axis")
                .attr("transform", "translate(" + ( self.params.xScale.range()[0] ) + ",0)");
            svg.append("g")
                .attr("class", "axis y-axis y2-axis")
                .attr("transform", "translate(" + ( self.params.xScale.range()[1] ) + ",0)");
            svg.append("g")
                .attr("class", "lines y1-lines");
            svg.append("g")
                .attr("class", "lines y2-lines");

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
            var y1Axis = d3.axisLeft(self.params.y1Scale);
            var y2Axis = d3.axisRight(self.params.y2Scale);

            y1Axis.tickSize(-(self.params.xScale.range()[1] - self.params.xScale.range()[0]))
                .tickPadding(5).ticks(self.params.y1Ticks);
            y2Axis.tickSize(-(self.params.xScale.range()[1] - self.params.xScale.range()[0]))
                .tickPadding(5).ticks(self.params.y2Ticks);

            var svg = self.svgSelection().transition().ease(d3.easeLinear).duration(self.params.duration);

            if (self.params._enableXAxis === "line") {
                svg.select(".axis.x-axis").call(xAxis);
            }
            if (self.params._y1Chart === "line") {
                var y1TickValues = y1Axis.scale().ticks(y1Axis.ticks()[0]);
                self.config.set({
                    y1AxisYCoordinates: y1TickValues.map(function(yVal){ return y1Axis.scale()(yVal);})
                });
                svg.select(".axis.y1-axis").call(y1Axis);
            }
            if (self.params._y2Chart === "line") {
                //Y2 axis ticks position should match Y1 axis.
                //If Y1 coordinates exist, find the corresponding coordinates on Y2 Axis scale.
                if (self.params.y1AxisYCoordinates) {
                     var tickValues = self.params.y1AxisYCoordinates.map(function(d){return y2Axis.scale().invert(d)});
                    y2Axis.tickValues(tickValues);
                }
                svg.select(".axis.y2-axis").call(y2Axis);
            }
        },

        getData: function () {
            return this.model.getData();
        },

        getLineColor: function(accessor) {
            var self = this;
            if (_.has(self.params.accessorData[accessor], "color")) {
                return self.params.accessorData[accessor].color;
            } else {
                var axis = self.getYAxis(accessor);
                if (!self.params["_y" + axis + "ColorScale"]) {
                    self.params["_y" + axis + "ColorScale"] = d3.scaleOrdinal(d3.schemeCategory20);
                }
                return self.params["_y" + axis + "ColorScale"](accessor);
            }
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

        /**
         * Calculates the [min, max] for an accessorList
         * @param accessorList
         */
        getRangeForAxis: function (accessorList) {
            var self = this,
                axisRanges = [],
                domain = [undefined, undefined];

            if (accessorList.length > 0) {
                _.each(accessorList, function (accessor) {
                    axisRanges = axisRanges.concat(self.model.getRangeFor(accessor));
                });
                domain = d3.extent(axisRanges);
            }

            return domain;
        },

        getLineY: function(accessor, dataItem, index) {
            var self = this,
                axis =  self.getYAxis(accessor);
            return self.params["y" + axis + "Scale"](dataItem[accessor]);
        },


        renderData: function () {
            var self = this;
            var data = self.getData();
            var svg = self.svgSelection();

            function renderLine(axisLine, data, accessorList) {
                var lines = [];
                _.each(accessorList, function (accessor, index) {
                    // Bars for each accessor will be grouped under a bar-group.
                    index += 1;

                    var line = d3.line()
                        .x(function (d) {
                            return self.params.xScale(d[self.params.xAccessor]);
                        })
                        .y(function (d, i) {
                            return self.getLineY(accessor, d, i);
                        });
                    lines.push(line);

                    axisLine.append("g")
                        .attr("class", "line-group-" + index)
                        .append("path")
                        .attr("class", "line")
                        .attr("stroke", function(d, i) { return self.getLineColor(accessor);});

                    var svgLine = axisLine.select(".line-group-" + index).selectAll(".line").datum(data);
                    svgLine.attr("d", line);

                });
            }

            console.log("Rendering data in (" + self.id + "): ", data, self.params);
            if (self.params._y1Chart === "line") {
                renderLine(svg.select(".y1-lines"), data, self.params._y1AccessorList);
            }
            if (self.params._y2Chart === "line") {
                renderLine(svg.select(".y2-lines"), data, self.params._y2AccessorList);
            }
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
