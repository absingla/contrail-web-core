/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    "jquery", "underscore", "backbone", "d3-v4",
    "core-basedir/js/charts/views/DataView"
], function ($, _, Backbone, d3, DataView) {
    var ScatterBubbleChartView = DataView.extend({
        tagName: "div",
        className: "scatter-bubble-chart",

        initialize: function (options) {
            var self = this;
            // TODO: Every model change will trigger a redraw. This might not be desired - dedicated redraw event?

            /// The config model
            self.config = options.config;

            /// View params hold values from the config and computed values.
            //self.resetParams();

            self.listenTo(self.model, "change", self.render);
            self.listenTo(self.config, "change", self.render);
            self.eventObject = _.extend({}, Backbone.Events);
            var throttled = _.throttle( function() {
                self.render();
            }, 100 );
            $( window ).resize( throttled );
        },

        /**
         * Calculates the chart dimensions and margins.
         * Use the dimensions provided in the config. If not provided use all available width of container and 3/4 of this width for height.
         * This method should be called before rendering because the available dimensions could have changed.
         */
        calculateDimmensions: function () {
            var self = this;
            if (!self.config._computed.chartWidth) {
                self.config._computed.chartWidth = self.$el.width();
            }
            if (!self.config._computed.chartHeight) {
                self.config._computed.chartHeight = Math.round(3 * self.config._computed.chartWidth / 4);
            }
            var elementsThatNeedMargins = {title: 30, axis: 30};
            _.each(["Top", "Bottom", "Left", "Right"], function (side) {
                if (!self.config._computed["margin" + side]) {
                    self.config._computed["margin" + side] = self.config._computed.margin;
                    _.each(elementsThatNeedMargins, function (marginAdd, key) {
                        if (self.config._computed[key + side]) {
                            // The side margin was undefined and we need addition room (for axis, title, etc.)
                            self.config._computed["margin" + side] += marginAdd;
                        }
                    });
                }
            });
        },

        /**
        * Create the usabelAccessorData that holds only the verified and enabled accessors from the accessorData structure.
        */
        updateAccessorList: function () {
            var self = this;
            data = self.getData();
            self.config._computed.usableAccessorData = {};
            self.config._computed.yAxisNames = {};
            _.each( self.config._computed.accessorData, function ( accessor, key ) {
                if( accessor.enable && _.has( data[0], key ) ) {
                    if( _.isFinite( accessor.y ) && accessor.y >= 0 && accessor.sizeAccessor && _.has( data[0], accessor.sizeAccessor ) ) {
                        var axisName = "y" + accessor.y;
                        self.config._computed.usableAccessorData[key] = accessor;
                        if( !_.has( self.config._computed.yAxisNames, axisName ) ) {
                            self.config._computed.yAxisNames[axisName] = 0;
                        }
                        self.config._computed.yAxisNames[axisName]++;
                    }
                }
            });
        },

        /**
        * Get the maximum extents (ranges) for all Y axis.
        * We can have multiple variables displayed on one Y axis so we need to calculate the maximum extent (range) for every variable
        * displayed on the Y1, Y2, ... axis.
        * We do not limit the number of possible Y axis.
        */
        getRangesForAllYAccessors: function() {
            var self = this;
            var ranges = {};
            _.each( self.config._computed.usableAccessorData, function( accessor, key ) {
                var range = [ self.model.getRangeFor( key ), self.model.getRangeFor( accessor.sizeAccessor ) ];
                var axisName = [ "y" + accessor.y, "r" + accessor.shape ];
                _.each( d3.range( 2 ), function( i ) {
                    if( !ranges[axisName[i]] ) {
                        ranges[axisName[i]] = range[i];
                    }
                    else {
                        // check if the new range extends the current one
                        if( range[i][0] < ranges[axisName[i]][0] ) {
                            ranges[axisName[i]][0] = range[i][0];
                        }
                        if( range[i][1] > ranges[axisName[i]][1] ) {
                            ranges[axisName[i]][1] = range[i][1];
                        }
                    }
                });
            });
            // Now:
            // ranges.y1 holds the maximum extent (range) for all variables displayed on the Y1 axis
            // ranges.y2 holds the maximum extent (range) for all variables displayed on the Y2 axis
            // ranges.y3 ...
            // ranges.r[shape] holds the maximum extent (range) of the shape's size.
            return ranges;
        },

        /**
         * Use the scales provided in the config or calculate them to fit data in view.
         * Assumes to have the range values available in the DataProvider (model) and the chart dimensions available in params.
         */
        calculateScales: function () {
            var self = this;
            var rangeX = self.model.getRangeFor( self.config._computed.xAccessor );
            var ranges = self.getRangesForAllYAccessors();
            // Calculate the starting and ending positions in pixels of the graph's bounding box.
            self.config._computed.rMinpx = 2;
            self.config._computed.rMaxpx = Math.max( 5, Math.min(self.config._computed.chartWidth, self.config._computed.chartHeight) ) / 25;
            self.config._computed.yMinpx = self.config._computed.chartHeight - self.config._computed.rMaxpx - self.config._computed.marginBottom;
            self.config._computed.yMaxpx = self.config._computed.rMaxpx + self.config._computed.marginTop;
            self.config._computed.xMinpx = self.config._computed.rMaxpx + self.config._computed.marginLeft;
            self.config._computed.xMaxpx = self.config._computed.chartWidth - self.config._computed.rMaxpx - self.config._computed.marginRight;
            if( !self.config._computed.xScale ) {
                self.config._computed.xScale = d3.scaleLinear().domain( rangeX ).range([self.config._computed.xMinpx, self.config._computed.xMaxpx]);//.nice( self.config._computed.xTicks );
            }
            // Create the scales for every Y range and for every R range.
            _.each( ranges, function( range, key ) {
                var scaleName = key + "Scale";
                if( !self.config._computed[scaleName] ) {
                    if( key.charAt(0) == 'r' ) {
                        self.config._computed[scaleName] = d3.scaleLinear().domain( range ).range([self.config._computed.rMinpx, self.config._computed.rMaxpx]);
                    }
                    else {
                        self.config._computed[scaleName] = d3.scaleLinear().domain( range ).range([self.config._computed.yMinpx, self.config._computed.yMaxpx]);
                    }
                }
            });
        },

        /**
         * Renders an empty chart.
         * Resizes chart dimensions if chart already exists.
         */
        renderSVG: function () {
            var self = this;
            var svgs = d3.select(self.$el.get(0)).selectAll("svg").data([self.id]);
            var svg = svgs.enter().append("svg").attr("id", function (d) {
                return d;
            });
            svg.append("g")
                .attr("class", "axis x-axis")
                .attr("transform", "translate(0," + ( self.config._computed.yMaxpx - self.config._computed.rMaxpx ) + ")");
            // TODO: Do not hardcode number of Y axis. Add Y axis depending on accessor definition (or self.config._computed.yAxisNames).
            svg.append("g")
                .attr("class", "axis y-axis y1-axis")
                .attr("transform", "translate(" + ( self.config._computed.xMinpx - self.config._computed.rMaxpx ) + ",0)");
            svg.append("g")
                .attr("class", "axis y-axis y2-axis")
                .attr("transform", "translate(" + ( self.config._computed.xMaxpx + self.config._computed.rMaxpx ) + ",0)");
            svg.append("g")
                .attr("class", "bubbles");
            self.svgSelection()
                .attr("width", self.config._computed.chartWidth)
                .attr("height", self.config._computed.chartHeight);
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
            // ticks are the mesh lines
            // TODO: Do not hardcode the number of Y axis.
            var xAxis = d3.axisBottom(self.config._computed.xScale).tickSizeInner(self.config._computed.yMinpx - self.config._computed.yMaxpx + 2 * self.config._computed.rMaxpx).tickPadding(5).ticks(self.config._computed.xTicks);
            var y1Axis = d3.axisLeft(self.config._computed.y1Scale).tickSize(-(self.config._computed.xMaxpx - self.config._computed.xMinpx + 2 * self.config._computed.rMaxpx)).tickPadding(5).ticks(self.config._computed.yTicks);
            var y2Axis = d3.axisRight(self.config._computed.y2Scale).tickSize(-(self.config._computed.xMaxpx - self.config._computed.xMinpx + 2 * self.config._computed.rMaxpx)).tickPadding(5).ticks(self.config._computed.yTicks);
            var svg = self.svgSelection().transition().ease( d3.easeLinear ).duration( self.config._computed.duration );
            svg.select(".axis.x-axis").call( xAxis );
            if( self.config._computed.y1Scale ) {
                svg.select(".axis.y1-axis").call( y1Axis );
            }
            if( self.config._computed.y2Scale ) {
                svg.select(".axis.y2-axis").call( y2Axis );
            }
        },

        getData: function () {
            return this.model.getData();
        },

        renderData: function () {
            var self = this;
            var data = self.getData();
            console.log("Rendering data in (" + self.id + "): ", data, self.config._computed);
            var svg = self.svgSelection();
            var svgBubbles = svg.select( ".bubbles" ).selectAll( ".bubble-group" ).data( data, function ( d ) {
                return d.id;
            });
            // One data element renders as one bubble-group with multiple bubbles in it - one bubble for each Y accessor.
            var svgBubblesGroupEnter = svgBubbles.enter()
                .append( "g" )
                .attr( "class", "bubble-group" );
            _.each( self.config._computed.usableAccessorData, function( accessor, key ) {
                var scaleName = "y" + accessor.y + "Scale";
                svgBubblesGroupEnter.append("circle")
                    .attr( "class", "bubble bubble-" + key )
                    .attr( "cx", function( d ) {
                        return self.config._computed.xScale(d[self.config._computed.xAccessor]);
                    })
                    .attr( "cy", function( d ) {
                        return self.config._computed[scaleName]( d[key] );
                    })
                    .attr( "r", 0 )
                    .on( "mouseover", function( d ) {
                        var pos = $(this).offset();
                        self.eventObject.trigger("mouseover", d, pos.left, pos.top);
                        d3.select(this).classed("active", true);
                    })
                    .on( "mouseout", function( d ) {
                        var pos = $(this).offset();
                        self.eventObject.trigger("mouseout", d, pos.left, pos.top);
                        d3.select(this).classed("active", false);
                    });
            });
            var svgBubblesEdit = svgBubblesGroupEnter.merge( svgBubbles ).transition().ease( d3.easeLinear ).duration( self.config._computed.duration );
            _.each( self.config._computed.usableAccessorData, function( accessor, key ) {
                var scaleYName = "y" + accessor.y + "Scale";
                var scaleRName = "r" + accessor.shape + "Scale";
                svgBubblesEdit.select( ".bubble-" + key )
                    .attr( "cx", function( d ) {
                        return self.config._computed.xScale( d[self.config._computed.xAccessor] );
                    })
                    .attr( "cy", function( d ) {
                        return self.config._computed[scaleYName]( d[key] );
                    })
                    .attr( "r", function( d ) {
                        return self.config._computed[scaleRName]( d[accessor.sizeAccessor] );
                    });
            });
            svgBubbles.exit().transition().ease( d3.easeLinear ).duration( self.config._computed.duration )
                .attr( "r", 0 )
                .remove();
        },

        render: function () {
            var self = this;
            _.defer(function () {
                //self.resetParams();
                self.updateAccessorList();
                self.calculateDimmensions();
                self.calculateScales();
                self.renderSVG();
                self.renderAxis();
                self.renderData();
            });
            return self;
        }
    });

    return ScatterBubbleChartView;
});
