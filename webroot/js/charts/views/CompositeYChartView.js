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
            self.components = [];

            /// View params hold values from the config and computed values.
            self.resetParams();

            self.listenTo(self.model, "change", self.render);
            self.listenTo(self.config, "change", self.render);
            self.handleWindowResize();
            self.eventObject = _.extend({}, Backbone.Events);
        },

        handleWindowResize: function() {
            var self = this;
            var throttled = _.throttle( function() {
                self.render();
            }, 100 );
            $( window ).resize( throttled );
        },

        resetParams: function() {
            // Reset parents params
            this.params = this.config.initializedComputedParameters();
            // Reset params for all children.
            // This way every child component can have access to parents config and still have its own computed params stored in config.
            _.each( this.components, function( component, i ) {
                component.resetParamsForChild( i );
            });
        },

        /**
        * Calculates the activeAccessorData that holds only the verified and enabled accessors from the accessorData structure.
        * Params: activeAccessorData, yAxisInfoArray
        */
        calculateActiveAccessorData: function () {
            var self = this;
            data = self.getData();
            self.params.activeAccessorData = {};
            self.params.yAxisInfoArray = [];
            console.log( "data: ", data );
            // Initialize the components activeAccessorData structure
            _.each( self.components, function( component ) {
                component.params.activeAccessorData = {};
                component.params.enable = false;
            });
            // Fill the activeAccessorData structure.
            _.each( self.params.accessorData, function ( accessor, key ) {
                if( _.isFinite( accessor.y ) && accessor.y >= 0 ) {
                    var axisName = "y" + accessor.y;
                    var component = self.getComponent( axisName, accessor.chartType );
                    if( component ) {
                        if( accessor.enable /*&& _.has( data[0], key )*/ ) {
                            self.params.activeAccessorData[key] = accessor;
                            var foundAxisInfo = _.findWhere( self.params.yAxisInfoArray, { name: axisName } );
                            if( !foundAxisInfo ) { 
                            	foundAxisInfo = {
                                	name: axisName,
                                	used: 0,
                                	position: ((accessor.y % 2) ? "left" : "right"),
                                	num: Math.floor( (accessor.y - 1) / 2)
                                };
                                self.params.yAxisInfoArray.push( foundAxisInfo );
                            }
                            foundAxisInfo.used++;
                            if( accessor.chartType ) {
                                // Set the activeAccessorData to the appropriate components.
                                if( component ) {
                                    component.params.activeAccessorData[key] = accessor;
                                    component.params.enable = true;
                                }
                            }
                        }
                    }
                }
            });
            console.log( "CompositeYView activeAccessorData: ", self.params.activeAccessorData );
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
         * Params: xRange, yRange, xDomain, yDomain, xScale, yScale
         */
        calculateScales: function () {
            var self = this;
            // Calculate the starting and ending positions in pixels of the chart data drawing area.
            self.params.xRange = [self.params.marginInner + self.params.marginLeft, self.params.chartWidth - self.params.marginInner - self.params.marginRight];
            self.params.yRange = [self.params.chartHeight - self.params.marginInner - self.params.marginBottom, self.params.marginInner + self.params.marginTop];
            self.saveScales();
            // Now let every component perform it's own calculations based on the provided X and Y scales.
            _.each( self.components, function( component ) {
                if( _.isFunction( component.calculateScales ) ) {
                    component.calculateScales();
                }
            });
        },

        getComponent: function( axisName, chartType ) {
            var self = this;
            var foundComponent = null;
            var componentName = axisName + "-" + chartType;
            _.each( self.components, function( component ) {
                if( component.getName() == componentName ) {
                    foundComponent = component;
                }
            });
            return foundComponent;
        },

        getComponents: function( axisName ) {
            var self = this;
            var foundComponents = [];
            _.each( self.components, function( component ) {
                if( _.contains( component.params.handledAxisNames, axisName ) ) {
                    foundComponents.push( component );
                }
            });
            return foundComponents;
        },

        /**
        * Combine the axis domains (extents) from all enabled components.
        */
        combineAxisDomains: function() {
            var self = this;
            var domains = {};
            _.each( self.components, function( component ) {
                if( component.params.enable ) {
                    var componentDomains = component.calculateAxisDomains();
                    _.each( componentDomains, function( domain, axisName ) {
                        if( !_.has( domains, axisName ) ) {
                            domains[axisName] = [domain[0], domain[1]];
                        }
                        else {
                            // check if the new domains extent extends the current one
                            if( domain[0] < domains[axisName][0] ) {
                                domains[axisName][0] = domain[0];
                            }
                            if( domain[1] > domains[axisName][1] ) {
                                domains[axisName][1] = domain[1];
                            }
                        }
                    });
                }
            });
            // Now:
            // domains.y1 holds the maximum extent (domain) for all variables displayed on the Y1 axis
            // domains.y2 holds the maximum extent (domain) for all variables displayed on the Y2 axis
            // domains.y3 ...
            // domains.r[shape] holds the maximum extent (domain) of the shape's size.
            return domains;
        },

        /**
        * Save all scales in the params and component.params structures.
        */
        saveScales: function() {
        	var self = this;
        	var domains = self.combineAxisDomains();
            _.each( domains, function( domain, axisName ) {
                var domainName = axisName + "Domain";
                if( !_.isArray( self.config.get( domainName ) ) ) {
                    self.params[domainName] = domain;
                }
                var scaleName = axisName + "Scale";
                var rangeName = axisName.charAt( 0 ) + "Range";
                if( !_.isFunction( self.config.get( scaleName ) ) && self.params[rangeName] ) {
                    // TODO: a scale type may be provided in the accessorData structure.
                    self.params[scaleName] = d3.scaleLinear().domain( self.params[domainName] ).range( self.params[rangeName] );
                }
                // Now update the scales of the appropriate components.
                _.each( self.getComponents( axisName ), function( component ) {
                    component.params[scaleName] = self.params[scaleName];
                });
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
                .attr("transform", "translate(0," + ( self.params.yRange[1] - self.params.marginInner ) + ")");
            console.log( "CompositeYChart.renderSVG yAxisInfoArray: ", self.params.yAxisInfoArray );
            _.each( self.params.yAxisInfoArray, function( axisInfo ) {
            	var translate = self.params.xRange[0] - self.params.marginInner;
            	if( axisInfo.position == "right" ) {
            		translate = self.params.xRange[1] + self.params.marginInner;
            	}
            	svg.append("g")
                .attr("class", "axis y-axis " + axisInfo.name + "-axis")
                .attr("transform", "translate(" + translate + ",0)");
            });
            // Handle component groups
            console.log( "CompositeYChartView.renderSVG components: ", self.components );
            var svgComponentGroups = self.svgSelection().selectAll( ".component-group" ).data( self.components, function( c ) {
                var id = 0;
                if( _.isObject( c ) ) {
                    id = c.getName();
                }
                else {
                    id = c;
                }
                return id;
            });
            svgComponentGroups.enter().append( "g" )
                .attr( "class", function( component ) { return "component-group component-" + component.getName() + " " + component.className; } );
            // Every component can add a one time (enter) code into it's component group.
            svgComponentGroups.enter().each( function( component ) {
                if( _.isFunction( component.renderSVG ) ) {
                     d3.select( this ).select( ".component-" + component.getName() ).call( component.renderSVG );
                }
            });
            svgComponentGroups.exit().remove();
            // Handle (re)size.
            self.svgSelection()
                .attr("width", self.params.chartWidth)
                .attr("height", self.params.chartHeight);
        },

        svgSelection: function () {
            var self = this;
            return d3.select(self.$el.get(0)).select("svg#" + self.id);
        },

        getTooltipConfig: function(dataItem) {
            var self = this,
                formattedData = {};
            _.each(dataItem, function(value, key) {
                if (_.has(self.params.accessorData[key], "tooltip")) {
                    var formattedKey = key,
                        formattedVal = value;
                    if (_.has(self.params.accessorData[key].tooltip, "nameFormatter"))
                        formattedKey = self.params.accessorData[key].tooltip.nameFormatter(key);
                    if (_.has(self.params.accessorData[key].tooltip, "valueFormatter"))
                        formattedVal = self.params.accessorData[key].tooltip.valueFormatter(value);
                    formattedData[formattedKey] = formattedVal;
                }
            });
            var tooltipConfig = self.params.getTooltipTemplateConfig(formattedData);

            return tooltipConfig;
        },

        /**
         * Renders the axis.
         */
        renderAxis: function () {
            var self = this;
            var xAxis = d3.axisBottom(self.params.xScale).tickSizeInner(self.params.yRange[0] - self.params.yRange[1] + 2 * self.params.marginInner).tickPadding(5).ticks(self.params.xTicks);
            var svg = self.svgSelection().transition().ease( d3.easeLinear ).duration( self.params.duration );
            svg.select( ".axis.x-axis" ).call( xAxis );
            // We render the yAxis here because there may be multiple components for one axis.
            // The parent has aggregated information about all Y axis.
            var referenceYScale = null;
            _.each( self.params.yAxisInfoArray, function( axisInfo ) {
                var scaleName = axisInfo.name + "Scale";
                if( axisInfo.position == "right" ) {
                    axisInfo.yAxis = d3.axisRight( self.params[scaleName] ).tickSize( -(self.params.xRange[1] - self.params.xRange[0] + 2 * self.params.marginInner) ).tickPadding(5).ticks( self.params.yTicks );
                }
                else {
                    axisInfo.yAxis = d3.axisLeft( self.params[scaleName] ).tickSize( -(self.params.xRange[1] - self.params.xRange[0] + 2 * self.params.marginInner) ).tickPadding(5).ticks( self.params.yTicks );
                }
                if( !referenceYScale ) {
                    referenceYScale = self.params[scaleName];
                }
                else {
                    // This is not the first Y axis so adjust the tick values to the first axis tick values.
                    var referenceTickValues = _.map( referenceYScale.ticks( self.params.yTicks ), function( tickValue ) {
                        return axisInfo.yAxis.scale().invert( referenceYScale( tickValue ) );
                    });
                    axisInfo.yAxis = axisInfo.yAxis.tickValues( referenceTickValues );
                }
                svg.select( ".axis.y-axis." + axisInfo.name + "-axis" ).call( axisInfo.yAxis );
            });
        },

        renderData: function () {
            var self = this;
            _.each( self.components, function( component ) {
                component.renderData();
            });
        },

        onMouseOver: function(dataItem, x, y) {
            var self = this;
            self.eventObject.trigger("showTooltip", dataItem, self.getTooltipConfig(dataItem), x, y);
        },

        onMouseOut: function(dataItem, x, y) {
            var self = this;
            self.eventObject.trigger("hideTooltip", dataItem, x, y);
        },

        startEventListeners: function() {
            var self = this;
            _.each(self.components, function(component) {
                self.listenTo(component.eventObject, "mouseover", self.onMouseOver);
                self.listenTo(component.eventObject, "mouseout", self.onMouseOut);
            });
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
                self.startEventListeners();
            });
            return self;
        }
    });

    return CompositeYChartView;
});
