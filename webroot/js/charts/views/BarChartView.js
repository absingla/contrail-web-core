/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    "jquery",
    "underscore",
    "backbone",
    "d3-v4",
    "core-basedir/js/charts/views/DataView"
], function( $, _, Backbone, d3, DataView ) {
    var BarChartView = DataView.extend({
        tagName: "div",
        className: "bar-chart",
        chartType: "bar",

        initialize: function ( options ) {
            /// The config model
            this.config = options.config;
            this.axisName = options.axisName;

            // The child's params are reset by parent.

            // TODO: should child react to model and config changes?
            //this.listenTo(this.model, "change", this.render);
            //this.listenTo(this.config, "change", this.render);
            this.eventObject = _.extend({}, Backbone.Events);
        },

        /**
        * Returns the unique name of this component so it can identify itself for the parent.
        * The component's name is of the following format: [axisName]-[chartType] ie. "y1-line".
        */
        getName: function() {
            return this.axisName + "-" + this.chartType;
        },

        getYScale: function() {
            return this.params[this.axisName + "Scale"];
        },

        /*
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
                data = this.params._renderData || self.getData(),
                xValue = dataItem[self.params.xAccessor],
                delimiter = data.length > 1 ? 1 : 0;

            if (self.params.xScale && (self.params.chartType === "GROUPED" || self.params.chartType === "none")) {
                var barWidth = self.getBarWidth(accessor),
                    axisNum = self.getYAxis(accessor),
                    chartIndex = self.params["_y" + axisNum + "AccessorList"].indexOf(accessor),
                    axisChartCount = self.getChartCount(axisNum);
                return self.params.xScale(xValue) - barWidth * axisChartCount / (data.length - delimiter) * i + barWidth * chartIndex;
            } else if (self.params.chartType === "STACKED") {
                return self.params.xScale(xValue) ;//- this.params.chartWidth / (data.length - delimiter) * i;
            }

        },

        getBarY: function (accessor, dataItem, i) {
            var self = this,
                axisNum = self.getYAxis(accessor);
            if (self.params.chartType === "GROUPED" || self.params.chartType === "none") {
                return self.params["y" + axisNum + "Scale"](dataItem[accessor]);
            } else if(self.params.chartType === "STACKED") {
                var barY = self.params._chartCanvasHeight - self.getBarHeight(accessor, dataItem),
                    chartIndex = self.params["_y" + axisNum + "AccessorList"].indexOf(accessor),
                    axisChartCount = self.getChartCount(axisNum);

                for (var j = 0; j < axisChartCount; j ++) {
                    if (j === chartIndex) {
                        break;
                    }
                    barY -= self.getBarHeight(this.params["_y" + axisNum + "AccessorList"][j], dataItem);
                }
                return barY;
            }
        },

        getBarGap: function () {
            var self = this,
                data = this.params._renderData || self.getData();
            return self.params.chartWidth / data.length / 20;
        },

        getBarWidth: function (accessor) {
            var self = this,
                data = this.params._renderData || self.getData();

            if (self.params.chartType === "GROUPED" || self.params.chartType === "none") {
                var axisChartCount = self.getChartCount(self.getYAxis(accessor));
                return ((self.params.chartWidth / data.length ) - self.getBarGap()) / axisChartCount ;
            } else {
                return ((self.params.chartWidth / data.length) - self.getBarGap());
            }
        },

        getBarHeight: function (accessor, dataItem) {
            var self = this,
                axisNum = self.getYAxis(accessor);
            return (self.params._chartCanvasHeight - self.params["y" + axisNum +"Scale"](dataItem[accessor]));
        },
        */

        getBarColor: function( accessor, key ) {
            var self = this;
            if( _.has( accessor, "color") ) {
                return accessor.color;
            } else {
                var axis = accessor.y;
                if( !self.params["_y" + axis + "ColorScale"] ) {
                    self.params["_y" + axis + "ColorScale"] = d3.scaleOrdinal(d3.schemeCategory20);
                }
                return self.params["_y" + axis + "ColorScale"](key);
            }
        },

        /*
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

        // Accessor in the axis accessor list may not be present in the Data.
        // From the accessorList Return only the accessor that's present in the data
        getAccessorListForRender: function(accessorList) {
            var self = this,
                data = self.getData(),
                accessorList4Render = [];
            _.each(accessorList, function(accessor) {
                if (_.has(data[0], accessor))
                    accessorList4Render.push(accessor);
            });
            return accessorList4Render;
        },
        */

        /**
         * Calculates the chart dimensions and margins.
         * Use the dimensions provided in the config. If not provided use all available width of container and 3/4 of this width for height.
         * This method should be called before rendering because the available dimensions could have changed.
         */
         /*
        calculateDimensions: function () {
            var self = this;
            if (!self.params.chartWidth) {
                self.params.chartWidth = (self.$el.width() > 0) ? self.$el.width() : 500;
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

            self.params._chartCanvasWidth = self.params.chartWidth - self.params.marginLeft - self.params.marginRight;
            self.params._chartCanvasHeight = self.params.chartHeight - self.params.marginTop - self.params.marginBottom;
        },
        */

        /**
         * Calculates the [min, max] for an accessorList
         * @param accessorList
         */
        /*
        getRangeForAxis: function (accessorList) {
            var self = this,
                data = self.getData(),
                axisRanges = [],
                domain = [undefined, undefined];

            if (self.params.chartType === "GROUPED" || self.params.chartType === "none") {
                _.each(accessorList, function (accessor) {
                    axisRanges = axisRanges.concat(self.model.getRangeFor(accessor));
                });
                domain = d3.extent(axisRanges);
            } else if (self.params.chartType === "STACKED") {
                domain = [Infinity, - Infinity];
                _.each(data, function(dataItem) {
                    var accessorValSum = 0;
                    _.each(accessorList, function(accessor) {
                        domain[0] = Math.min(dataItem[accessor], domain[0]);
                        accessorValSum += dataItem[accessor];
                        domain[1] = Math.max(accessorValSum, domain[1]);
                    });
                });
            }
            return domain;
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
        */

        /**
         * Use the scales provided in the config or calculate them to fit data in view.
         * Assumes to have the range values available in the DataProvider (model) and the chart dimensions available in params.
         */
         /*
        calculateScales: function () {
            var self = this;

            var xMinpx = self.params.marginLeft;
            var xMaxpx = self.params._chartCanvasWidth;
            if (!self.params.xScale) {
                var xDomain = self.getDomainForAccessor(self.params.xAccessor);
                self.params.xScale = d3.scaleBand().domain(xDomain).range([xMinpx, xMaxpx]);//.nice( self.params.xTicks );
            } else {
                var rangeX = self.model.getRangeFor(this.params.xAccessor);
                self.params.xScale.domain(rangeX).range([xMinpx, xMaxpx]);
            }

            var rangeY1 = self.getRangeForAxis(this.params._y1AccessorList);
            var rangeY2 = self.getRangeForAxis(this.params._y2AccessorList);

            if (self.params.forceY1) {
                if (!_.isUndefined(self.params.forceY1[0]))
                    rangeY1[0] = self.params.forceY1[0];
                //For stacked bar charts, we can not force the max.
                if (!_.isUndefined(self.params.forceY1[1]) && self.params.chartType !== "stacked")
                    rangeY1[1] = self.params.forceY1[1];
            }

            if (self.params.forceY2) {
                if (!_.isUndefined(self.params.forceY2[0]))
                    rangeY2[0] = self.params.forceY2[0];
                if (!_.isUndefined(self.params.forceY2[1]) && self.params.chartType !== "stacked")
                    rangeY2[1] = self.params.forceY2[1];
            }

            var yMaxpx = self.params.marginTop;
            var yMinpx = self.params._chartCanvasHeight;
            if (!self.params.y1Scale) {
                self.params.y1Scale = d3.scaleLinear().domain(rangeY1).range([yMinpx, yMaxpx]);//.nice( self.params.yTicks );
            }
            if (!self.params.y2Scale) {
                self.params.y2Scale = d3.scaleLinear().domain(rangeY2).range([yMinpx, yMaxpx]);//.nice( self.params.yTicks );
            }
        },
        */

        /**
        * Called by the parent in order to calculate maximum data extents for all of this child's axis.
        * Assumes the params.activeAccessorData for this child view is filled by the parent with the relevent yAccessors for this child only.
        * Returns an object with following structure: { y1: [0,10], x: [-10,10] }
        */
        calculateAxisDomains: function() {
            var self = this;
            var domains = { x: self.model.getRangeFor( self.params.xAccessor ) };
            domains[self.axisName] = [];
            // TODO: a range may by specified in the accessorData config. No need for calculating it then.
            _.each( self.params.activeAccessorData, function( accessor, key ) {
                var domain = self.model.getRangeFor( key );
                // TODO: handle stacked.
                domains[self.axisName] = domains[self.axisName].concat( domain );
            });
            domains[self.axisName] = d3.extent( domains[self.axisName] );
            console.log( "BarChartView domains for " + self.getName() + ": ", domains );
            self.params.handledAxisNames = _.keys( domains );
            return domains;
        },

        /**
         * Called by the parent when all scales have been saved in this child's params.
         * Can be used by the child to perform any additional calculations.
         */
        calculateScales: function () {
            var self = this;
            var xValues = _.pluck( self.getData(), self.params.xAccessor );
            self.params.bandScale = d3.scaleBand().domain( xValues ).rangeRound( self.params.xScale.range() ).paddingInner( 0.1 ).paddingOuter( 0 );
        },

        /**
         * Renders an empty chart.
         * Changes chart dimensions if it already exists.
         */
        renderSVG: function () {
        },

        renderData: function () {
            var self = this;
            var data = self.getData();
            var yScale = self.getYScale();

            // Create a flat data structure
            var flatData = [];
            var i;
            var numOfAccessors = _.keys( self.params.activeAccessorData ).length;
            var innerBandScale = d3.scaleBand().domain( d3.range( numOfAccessors ) ).range( [0, self.params.bandScale.step()] ).paddingInner( 0.1 ).paddingOuter( 0 );
            _.each( data, function( d ) {
                i = 0;
                var x = d[self.params.xAccessor];
                _.each( self.params.activeAccessorData, function( accessor, key ) {
                    var y = d[key];
                    var obj = _.extend({}, d, {
                        id: x + "-" + key,
                        className: "bar bar-" + key,
                        x: self.params.bandScale( x ) + innerBandScale( i ),
                        y: yScale( y ),
                        h: yScale.range()[0] - yScale( y ),
                        w: innerBandScale.step(),
                        color: self.getBarColor( accessor, key )
                    });
                    flatData.push( obj );
                    i++;
                });
            });
            // Render the flat data structure
            console.log("Rendering data in BarChartView: ", flatData, self.params, self.getName() );
            var svgBarGroups = self.svgSelection().select( "g.component-" + self.getName() ).selectAll( ".bar" ).data( flatData, function( d ) { return d.id; } );
            svgBarGroups.enter().append( "rect" )
                .attr( "class", function( d ) { return d.className; } )
                .attr( "x", function( d ) { return d.x; } )
                .attr( "y", yScale.range()[0] )
                .attr( "height", 0 )
                .attr( "width", function( d ) { return d.w; } )
                .on("mouseover", function( d ) {
                    var pos = $(this).offset();
                    self.eventObject.trigger("mouseover", d, pos.left, pos.top);
                    d3.select(this).classed("active", true);
                })
                .on("mouseout", function( d ) {
                    var pos = $(this).offset();
                    self.eventObject.trigger("mouseout", d, pos.left, pos.top);
                    d3.select(this).classed("active", false);
                })
                .merge( svgBarGroups ).transition().ease( d3.easeLinear ).duration( self.params.duration )
                .attr( "fill", function( d ) { return d.color; } )
                .attr( "x", function( d ) { return d.x; } )
                .attr( "y", function( d ) { return d.y; } )
                .attr( "height", function( d ) { return d.h; } )
                .attr( "width", function( d ) { return d.w; } );
            svgBarGroups.exit().remove();

            /*
            this.params._renderData = data;
            function renderBars(axisBar, data, accessorList) {
                accessorList = self.getAccessorListForRender(accessorList);
                _.each(accessorList, function (accessor, index) {
                    // Bars for each accessor will be grouped under a bar-group.
                    index += 1;
                    axisBar.append("g")
                        .attr("class", "bar-group-" + index);
                    var barGroupEnter = axisBar.select(".bar-group-" + index)
                        .selectAll(".bar").data(data).enter();
                    barGroupEnter.append("rect")
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
                        .attr("fill", function(d, i) { return self.getBarColor(accessor);})
                        .on("mouseover", function( d ) {
                            var pos = $(this).offset();
                            var tooltipConfig = self.getTooltipConfig(d);
                            self.eventObject.trigger("mouseover", d, tooltipConfig, pos.left, pos.top);
                            d3.select(this).classed("active", true);
                        })
                        .on("mouseout", function( d ) {
                            var pos = $(this).offset();
                            self.eventObject.trigger("mouseout", d, pos.left, pos.top);
                            d3.select(this).classed("active", false);
                        });
                });
            }
            console.log("Rendering data in (" + self.id + "): ", data, self.params);
            var svg = self.svgSelection();
            if (self.params._y1Chart === "bar") {
                // Render Y1 bars
                renderBars(svg.select(".y1-bars"), data, self.params._y1AccessorList);
            }
            if (self.params._y2Chart === "bar") {
                // Render Y2 bars
                renderBars(svg.select(".y2-bars"), data, self.params._y2AccessorList);
            }
            */
        },

        render: function () {
            var self = this;
            _.defer(function () {
                self.renderData();
            });
            return self;
        }
    });

    return BarChartView;
});
