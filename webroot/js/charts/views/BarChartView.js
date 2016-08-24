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

        getBarX: function (accessor, dataItem, i) {
            var self = this,
                data = self.getData(),
                xValue = dataItem[self.params.xAccessor],
                delimiter = data.length > 1 ? 1 : 0;

            if (self.params.xScale && (self.params.chartType === "GROUPED" || self.params.chartType === "none")) {
                var barWidth = self.getBarWidth(accessor),
                    axisNum = self.getYAxis(accessor),
                    chartIndex = self.params["_y" + axisNum + "AccessorList"].indexOf(accessor),
                    axisChartCount = self.getChartCount(axisNum);
                return self.params.xScale(xValue) - barWidth * axisChartCount / (data.length - delimiter) * i + barWidth * chartIndex;
            } else if (self.params.chartType === "STACKED") {
                return self.params.xScale(xValue) - this.params.chartWidth / (data.length - delimiter) * i;
            }

        },

        getBarY: function (accessor, dataItem, i) {
            var self = this,
                axisNum = self.getYAxis(accessor);
            if (self.params.chartType === "GROUPED" || self.params.chartType === "none") {
                return self.params["y" + axisNum + "Scale"](dataItem[accessor]);
            } else if(self.params.chartType === "STACKED") {
                //Todo get bar y when stacked
            }
        },

        getBarGap: function () {
            var self = this;
            return self.params.chartWidth / self.getData().length / 20;
        },

        getBarWidth: function (accessor) {
            var self = this,
                data = self.getData();

            if (self.params.chartType === "GROUPED") {
                var axisChartCount = self.getChartCount(self.getYAxis(accessor));
                return (self.params.chartWidth / data.length - self.getBarGap()) / axisChartCount ;
            } else {
                return self.params.chartWidth / data.length - self.getBarGap();
            }
        },

        getBarHeight: function (accessor, dataItem) {
            var self = this;
            if (self.params.chartType === "GROUPED" || self.params.chartType === "none") {
                return (self.params.chartHeight - self.params.y1Scale(dataItem[accessor]));
            } else if(self.params.chartType === "STACKED") {
                //Todo get bar height when stacked
            }
        },

        getBarColor: function(accessor) {
            var self = this;
            if (self.params.accessorData[accessor].color) {
                return self.params.accessorData[accessor].color;
            } else {
                var axis = self.getYAxis(accessor);
                if (!self.params["_y" + axis + "ColorScale"]) {
                    self.params["_y" + axis + "ColorScale"] = d3.scaleOrdinal(d3.schemeCategory20);
                }
                return self.params["_y" + axis + "ColorScale"](accessor);
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
                var containerWidth = (self.$el.width() > 0) ? self.$el.width() : 500;
                if (self.params.marginLeft) {
                    self.params.chartWidth = containerWidth - self.params.marginLeft;
                }
                if (self.params.marginRight) {
                    self.params.chartWidth -= self.params.marginRight;
                }
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

        getDomainForAccessor: function(accessor) {
            var self = this,
                accessorDomain = [],
                data = self.getData();

            _.each(data, function(dataItem) {
                accessorDomain.push(dataItem[accessor]);
            });
            return accessorDomain;
        },

        /**
         * Use the scales provided in the config or calculate them to fit data in view.
         * Assumes to have the range values available in the DataProvider (model) and the chart dimensions available in params.
         */
        calculateScales: function () {
            var self = this;
            var rangeY1 = self.getRangeForAxis(this.params._y1AccessorList);
            var rangeY2 = self.getRangeForAxis(this.params._y2AccessorList);

            var xMinpx = self.params.marginLeft;
            var xMaxpx = self.params.chartWidth - self.params.marginRight;
            if (!self.params.xScale) {
                var xDomain = self.getDomainForAccessor(self.params.xAccessor);
                self.params.xScale = d3.scaleBand().domain(xDomain).range([xMinpx, xMaxpx]);//.nice( self.params.xTicks );
            } else {
                var rangeX = self.model.getRangeFor(this.params.xAccessor);
                self.params.xScale.domain(rangeX).range([xMinpx, xMaxpx]);
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
            var y2Axis = d3.axisLeft(self.params.y2Scale)
                .tickSize(-(self.params.xScale.range()[1] - self.params.xScale.range()[0]))
                .tickPadding(5).ticks(self.params.y2Ticks);
            var svg = self.svgSelection().transition().ease(d3.easeLinear).duration(self.params.duration);
            svg.select(".axis.x-axis").call(xAxis);
            svg.select(".axis.y1-axis").call(y1Axis);
            svg.select(".axis.y2-axis").call(y2Axis);
        },

        renderData: function () {
            var self = this;
            var data = self.getData();
            console.log("Rendering data in (" + self.id + "): ", data, self.params);
            var svg = self.svgSelection();

            var y1BarEnter = svg.select(".y1bars").selectAll(".bar").data(data).enter(),
                y2BarEnter = svg.select(".y2bars").selectAll(".bar").data(data).enter();

            function renderBars(barsEnterSelection, accessorList) {
                _.each(accessorList, function (accessor) {
                    barsEnterSelection.append("rect")
                        .attr("class", "bar")
                        .attr("x", function (d, i) {
                            // console.log("X: " + self.getBarX(accessor, d, i));
                            return self.getBarX(accessor, d, i);})
                        .attr("y", function (d, i) {
                            // console.log("Y: " + self.getBarY(accessor, d, i));
                            return self.getBarY(accessor, d, i);})
                        .attr("width", function (d, i) {
                            // console.log("width: " + self.getBarWidth(accessor) );
                            return self.getBarWidth(accessor);})
                        .attr("height", function (d, i) {
                            // console.log("height: " + self.getBarHeight(accessor, d, i));
                            return self.getBarHeight(accessor, d, i);})
                        .attr("fill", function(d, i) { return self.getBarColor(accessor);});
                });
            }
            // Render Y1 bars
            renderBars(y1BarEnter, self.params._y1AccessorList);
            // Render Y2 bars
            renderBars(y2BarEnter, self.params._y2AccessorList);
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
