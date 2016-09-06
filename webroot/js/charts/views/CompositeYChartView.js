/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    "jquery", "underscore", "backbone", "d3-v4",
    "core-basedir/js/charts/views/DataView"
], function ($, _, Backbone, d3, DataView) {
    var CompositeYChartView = DataView.extend({
    	tagName: "div",
    	chartType: "compositeY",

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
        * Calculates the activeAccessorData that holds only the verified and enabled accessors from the accessorData structure.
        * Params: activeAccessorData, yAxisNames
        */
        calculateActiveAccessorData: function () {
            var self = this;
            data = self.getData();
            self.params.activeAccessorData = {};
            self.params.yAxisNames = [];
            _.each( self.params.accessorData, function ( accessor, key ) {
                if( accessor.enable && _.has( data[0], key ) ) {
                    if( _.isFinite( accessor.y ) && accessor.y >= 0 ) {
                        var axisName = "y" + accessor.y;
                        self.params.activeAccessorData[key] = accessor;
                        var foundAxisName = _.findWhere( self.params.yAxisNames, { name: axisName } );
                        if( !foundAxisName ) { 
                        	foundAxisName = {
                            	name: axisName,
                            	used: 0,
                            	position: ((accessor.y % 2) ? "left" : "right"),
                            	num: Math.floor( accessor.y / 2),
                            	extent: []
                            };
                            self.params.yAxisNames.push( foundAxisName );
                        }
                        foundAxisName.used++;
                    }
                }
            });
        },

        /**
         * Calculates the chart dimensions and margins.
         * Use the dimensions provided in the config. If not provided use all available width of container and 3/4 of this width for height.
         * This method should be called before rendering because the available dimensions could have changed.
         * Params: chartWidth, chartHeight, margin, marginTop, marginBottom, marginLeft, marginRight, marginInner.
         */
        calculateDimmensions: function () {
            var self = this;
            if( !self.params.chartWidth ) {
                self.params.chartWidth = self.$el.width();
            }
            if( !self.params.chartHeight ) {
                self.params.chartHeight = Math.round(3 * self.params.chartWidth / 4);
            }
            if( !self.params.margin ) {
            	self.params.margin = 5;
            }
            if( !self.params.marginInner ) {
            	self.params.marginInner = 0;
            }
            // If the side margin (ie marginLeft) was not set in config then use global margin and add extra space for
            // title and / or axis if they were defined (ie. titleLeft adds 30 pixels to the marginLeft parameter).
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
         * Params: yMinpx, yMaxpx, xMinpx, xMaxpx, xScale
         */
        calculateScales: function () {
            var self = this;
            if( !_.isArray( self.params.xRange ) || self.params.xRange.length < 2 ) {
            	self.params.xRange = self.model.getRangeFor( self.params.xAccessor );
            }
            // Calculate the starting and ending positions in pixels of the graph's bounding box.
            self.params.yMinpx = self.params.chartHeight - self.params.marginInner - self.params.marginBottom;
            self.params.yMaxpx = self.params.marginInner + self.params.marginTop;
            self.params.xMinpx = self.params.marginInner + self.params.marginLeft;
            self.params.xMaxpx = self.params.chartWidth - self.params.marginInner - self.params.marginRight;
            if( !self.params.xScale ) {
                self.params.xScale = d3.scaleLinear().domain( self.params.xRange ).range([self.params.xMinpx, self.params.xMaxpx]);//.nice( self.params.xTicks );
            }
        },

        unifyYScales: function() {
        	var self = this;
        	// Collect the extent from every component into the yAxisNames structure.
        	_.each( self.params.components, function( component ) {
        		if( component.params.yAccessor ) {
        			var yRange = component.params.yRange;
        			var axisName = "y" + self.params.activeAccessorData[component.params.yAccessor].y;
        			var foundAxisName = _.findWhere( self.yAxisNames, { name: axisName } );
        			if( foundAxisName ) {
        				foundAxisName.extent.concat( yRange );
        			}
        		}
        	});
        	// Now calculate the extents and update the scale of the appropriate components.
        	_.each( self.params.components, function( component ) {
        		if( component.params.yAccessor ) {
        			var axisName = "y" + self.params.activeAccessorData[component.params.yAccessor].y;
        			var foundAxisName = _.findWhere( self.yAxisNames, { name: axisName } );
        			if( foundAxisName ) {
        				foundAxisName.extent = d3.extent( foundAxisName.extent );
        				component.params.yScale = component.params.yScale.range( foundAxisName.extent );
        			}
        		}
        	});
        },

        /**
         * Renders the svg element with axis and component groups.
         * Resizes chart dimensions if chart already exists.
         */
        renderSVG: function () {
            var self = this;
            var svgs = d3.select(self.$el.get(0)).selectAll("svg").data([self.id]);
            var svg = svgs.enter().append("svg").attr("id", function ( d ) { return d; } );
            svg.append("g")
                .attr("class", "axis x-axis")
                .attr("transform", "translate(0," + ( self.params.yMaxpx - self.params.marginInner ) + ")");
            _.each( self.yAxisNames, function( axisName ) {
            	var translate = self.params.xMinpx - self.params.marginInner;
            	if( axisName.position == "right" ) {
            		translate = self.params.xMaxpx + self.params.marginInner;
            	}
            	svg.append("g")
                .attr("class", "axis y-axis " + axisName.name + "-axis")
                .attr("transform", "translate(" + translate + ",0)");
            });
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
            var xAxis = d3.axisBottom(self.params.xScale).tickSizeInner(self.params.yMinpx - self.params.yMaxpx + 2 * self.params.marginInner).tickPadding(5).ticks(self.params.xTicks);
            var svg = self.svgSelection().transition().ease( d3.easeLinear ).duration( self.params.duration );
            svg.select(".axis.x-axis").call( xAxis );
        },

        getData: function () {
            return this.model.getData();
        },

        renderData: function () {
            var self = this;
            // Collect array of components
            var svg = self.svgSelection()
        },

        render: function () {
            var self = this;
            _.defer(function () {
                self.resetParams();
                self.calculateActiveAccessorData();
                self.calculateDimmensions();
                self.calculateScales();
                self.renderSVG();
                self.renderAxis();
                self.renderData();
            });
            return self;
        }
    });

    return CompositeYChartView;
});
