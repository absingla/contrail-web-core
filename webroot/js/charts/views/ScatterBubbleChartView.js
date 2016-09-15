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
        chartType: "scatterBubble",

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

        getBubbleColor: function( accessor, key ) {
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

        /**
        * Called by the parent in order to calculate maximum data extents for all of this child's axis.
        * Assumes the params.activeAccessorData for this child view is filled by the parent with the relevent yAccessors for this child only.
        * Returns an object with following structure: { y1: [0,10], x: [-10,10] }
        */
        calculateAxisDomains: function() {
            var self = this;
            var domains = { x: self.model.getRangeFor( self.params.xAccessor ) };
            domains[self.axisName] = [];
            // TODO: a domain may by specified in the accessorData config or in params. No need for calculating it then.
            _.each( self.params.activeAccessorData, function( accessor, key ) {
                var domain = self.model.getRangeFor( key );
                domains[self.axisName] = domains[self.axisName].concat( domain );
                if( accessor.sizeAccessor && accessor.shape ) {
                    var sizeAxisName = "r" + accessor.shape;
                    if( !domains[sizeAxisName] ) {
                        domains[sizeAxisName] = [];
                    }
                    domains[sizeAxisName] = domains[sizeAxisName].concat( self.model.getRangeFor( accessor.sizeAccessor ) );
                }
            });
            _.each( domains, function( domain, key ) {
                domains[key] = d3.extent( domain );
            });
            console.log( "ScatterBubbleChartView domains for " + self.getName() + ": ", domains );
            self.params.handledAxisNames = _.keys( domains );
            return domains;
        },

        /**
         * Called by the parent when all scales have been saved in this child's params.
         * Can be used by the child to perform any additional calculations.
         */
        calculateScales: function () {
            // Calculate the r scales. Calculatation done by parent based on shape domains.
            // A scatter bubble chart adds additional axis - one for every bubble shape - for example rcircle, rsquare, ...
            /*
            var self = this;
            _.each( self.params.activeAccessorData, function( accessor, key ) {
                if( accessor.sizeAccessor ) {
                    var scaleName = "r" + accessor.sizeAccessor + "Scale";
                    var sizeDomainName = "r" + accessor.sizeAccessor + "Domain";
                    var innerRange = [ 2, Math.max( 2, self.params.innerMargin ) ];
                    self.params[scaleName] = d3.scaleLinear().domain( self.params[sizeDomainName] ).range( innerRange );
                }
            });
            */
        },

        /**
         * Called by the parent to allow the child to add some initialization code into the provided entering selection.
         */
        renderSVG: function ( enteringSelection ) {
            enteringSelection.append( "g" ).attr( "class", "bubbles" );
        },

        /***
        * Shape drawing functions. The draw on the entering and edit selections. One drawing function per accessor shape.
        */
        shapeEnterFunctions: { circle: "shapeEnterCircle" },
        shapeEditFunctions: { circle: "shapeEditCircle" },
        
        shapeEnterCircle: function( d, selection ) {
            selection.append( "circle" )
                .attr( "class", d.className )
                .attr( "cx", d.x )
                .attr( "cy", d.y )
                .attr( "r", 0 );
        },

        shapeEditCircle: function( d, selection ) {
            selection
                .attr( "cx", d.x )
                .attr( "cy", d.y )
                .attr( "r", d.r );
        },

        renderData: function () {
            var self = this;
            var data = self.getData();
            var yScale = self.getYScale();

            // Create a flat data structure
            var flatData = [];
            _.each( data, function( d ) {
                var x = d[self.params.xAccessor];
                _.each( self.params.activeAccessorData, function( accessor, key ) {
                    var y = d[key];
                    var rScaleName = "r" + accessor.shape + "Scale";
                    var obj = _.extend({}, d, {
                        id: x + "-" + key,
                        className: "bubble bubble-" + key,
                        selectClassName: ".bubble-" + key,
                        x: self.params.xScale( x ),
                        y: yScale( y ),
                        shape: accessor.shape,
                        r: self.params[rScaleName]( d[accessor.sizeAccessor] ),
                        color: self.getBubbleColor( accessor, key )
                    });
                    flatData.push( obj );
                });
            });
            console.log( "Rendering data in ScatterBubbleChart: ", flatData, self.params, self.getName() );
            var svg = self.svgSelection();
            var svgBubbles = self.svgSelection().select( "g.component-" + self.getName() ).selectAll( ".bubble" ).data( flatData, function( d ) { return d.id; } );
            svgBubbles.enter()
                .each( function( d ) {
                    self[self.shapeEnterFunctions[d.shape]]( d, d3.select( this ) );
                });
            svgBubbles = self.svgSelection().select( "g.component-" + self.getName() ).selectAll( ".bubble" ).data( flatData, function( d ) { return d.id; } );
            svgBubbles.transition().ease( d3.easeLinear ).duration( self.params.duration )
            /*
                .attr( "cx", function( d ) { return d.x; } )
                .attr( "cy", function( d ) { return d.y; } )
                .attr( "r", function( d ) { return d.r; } );
            */
                .each( function( d ) {
                    self[self.shapeEditFunctions[d.shape]]( d, d3.select( this ) );
                });
            /*
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
                        var tooltipConfig = self.getTooltipConfig(d);
                        self.eventObject.trigger("mouseover", d, tooltipConfig, pos.left, pos.top);
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
                        return self.params[scaleRName]( d[accessor.sizeAccessor] );
                    });
            });
            */
            svgBubbles.exit().transition().ease( d3.easeLinear ).duration( self.params.duration )
                .attr( "r", 0 )
                .remove();
        },

        render: function () {
            var self = this;
            _.defer(function () {
                self.renderData();
            });
            return self;
        }
    });

    return ScatterBubbleChartView;
});
