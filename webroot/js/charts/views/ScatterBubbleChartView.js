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
            self.resetParams();

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
        * Create the _y1AccessorList and _y2AccessorList arrays containing the variable names used to display values on
        * the y1 and y2 axis.
        */
        updateAccessorList: function () {
            var self = this;
            data = self.getData();
            self.params.usableAccessorData = {};
            _.each( self.params.accessorData, function ( accessor, key ) {
                if( accessor.enable && _.has( data[0], key ) ) {
                    if( (accessor.y == 1 || accessor.y == 2) && accessor.sizeAccessor && _.has( data[0], accessor.sizeAccessor ) ) {
                        self.params.usableAccessorData[key] = accessor;
                    }
                }
            });
        },

        /**
         * Use the scales provided in the config or calculate them to fit data in view.
         * Assumes to have the range values available in the DataProvider (model) and the chart dimensions available in params.
         */
        calculateScales: function () {
            var self = this;
            var rangeX = self.model.getRangeFor( self.params.xAccessor );
            var ranges = {};
            // Get the maximum extents for all axis.
            _.each( self.params.usableAccessorData, function( accessor, key ) {
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
            self.params.rMinpx = 2;
            self.params.rMaxpx = Math.max( 5, Math.min(self.params.chartWidth, self.params.chartHeight) ) / 25;
            self.params.yMinpx = self.params.chartHeight - self.params.rMaxpx - self.params.marginBottom;
            self.params.yMaxpx = self.params.rMaxpx + self.params.marginTop;
            self.params.xMinpx = self.params.rMaxpx + self.params.marginLeft;
            self.params.xMaxpx = self.params.chartWidth - self.params.rMaxpx - self.params.marginRight;
            if (!self.params.xScale) {
                self.params.xScale = d3.scaleLinear().domain( rangeX ).range([self.params.xMinpx, self.params.xMaxpx]);//.nice( self.params.xTicks );
            }
            // Create the scales for every Y range and for every R range.
            _.each( ranges, function( range, key ) {
                var scaleName = key + "Scale";
                if( !self.params[scaleName] ) {
                    if( key.charAt(0) == 'r' ) {
                        self.params[scaleName] = d3.scaleLinear().domain( range ).range([self.params.rMinpx, self.params.rMaxpx]);
                    }
                    else {
                        self.params[scaleName] = d3.scaleLinear().domain( range ).range([self.params.yMinpx, self.params.yMaxpx]);
                    }
                }
            });
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
                .attr("transform", "translate(0," + ( self.params.yMaxpx - self.params.rMaxpx ) + ")");
            svg.append("g")
                .attr("class", "axis y-axis y1-axis")
                .attr("transform", "translate(" + ( self.params.xMinpx - self.params.rMaxpx ) + ",0)");
            svg.append("g")
                .attr("class", "axis y-axis y2-axis")
                .attr("transform", "translate(" + ( self.params.xMaxpx + self.params.rMaxpx ) + ",0)");
            svg.append("g")
                .attr("class", "bubbles");
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
            // ticks are the mesh lines
            var xAxis = d3.axisBottom(self.params.xScale).tickSizeInner(self.params.yMinpx - self.params.yMaxpx + 2 * self.params.rMaxpx).tickPadding(5).ticks(self.params.xTicks);
            var y1Axis = d3.axisLeft(self.params.y1Scale).tickSize(-(self.params.xMaxpx - self.params.xMinpx + 2 * self.params.rMaxpx)).tickPadding(5).ticks(self.params.yTicks);
            var y2Axis = d3.axisRight(self.params.y2Scale).tickSize(-(self.params.xMaxpx - self.params.xMinpx + 2 * self.params.rMaxpx)).tickPadding(5).ticks(self.params.yTicks);
            var svg = self.svgSelection().transition().ease(d3.easeLinear).duration(self.params.duration);
            svg.select(".axis.x-axis").call( xAxis );
            if( self.params.y1Scale ) {
                svg.select(".axis.y1-axis").call( y1Axis );
            }
            if( self.params.y2Scale ) {
                svg.select(".axis.y2-axis").call( y2Axis );
            }
        },

        getData: function () {
            return this.model.getData();
        },

        renderData: function () {
            var self = this;
            var data = self.getData();
            console.log("Rendering data in (" + self.id + "): ", data, self.params);
            var svg = self.svgSelection();
            var svgBubbles = svg.select( ".bubbles" ).selectAll( ".bubble-group" ).data( data, function ( d ) {
                return d.id;
            });
            var svgBubblesGroupEnter = svgBubbles.enter()
                .append( "g" )
                .attr( "class", "bubble-group" );
            _.each( self.params.usableAccessorData, function( accessor, key ) {
                var scaleName = "y" + accessor.y + "Scale";
                svgBubblesGroupEnter.append("circle")
                    .attr( "class", "bubble bubble-" + key )
                    .attr( "cx", function( d ) {
                        return self.params.xScale(d[self.params.xAccessor]);
                    })
                    .attr( "cy", function( d ) {
                        return self.params[scaleName]( d[key] );
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
            var svgBubblesEdit = svgBubblesGroupEnter.merge( svgBubbles ).transition().ease( d3.easeLinear ).duration( self.params.duration );
            _.each( self.params.usableAccessorData, function( accessor, key ) {
                var scaleYName = "y" + accessor.y + "Scale";
                var scaleRName = "r" + accessor.shape + "Scale";
                svgBubblesEdit.select( ".bubble-" + key )
                    .attr( "cx", function( d ) {
                        return self.params.xScale( d[self.params.xAccessor] );
                    })
                    .attr( "cy", function( d ) {
                        return self.params[scaleYName]( d[key] );
                    })
                    .attr( "r", function( d ) {
                        return self.params[scaleRName]( d[self.params.sizeAccessor] );
                    });
            });
            svgBubbles.exit().transition().ease( d3.easeLinear ).duration( self.params.duration )
                .attr( "r", 0 )
                .remove();
        },

        render: function () {
            var self = this;
            _.defer(function () {
                self.resetParams();
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
