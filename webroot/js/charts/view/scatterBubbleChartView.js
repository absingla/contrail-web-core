/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    'jquery', 'underscore', 'backbone', 'd3-v4',
    'core-basedir/js/charts/view/dataView'
], function( $, _, Backbone, d3, DataView ) {
    var ScatterBubbleChartView = DataView.extend({
        tagName: "div",
        className: "scatter-bubble-chart",

        initialize: function( options ) {
            // TODO: Every model change will trigger a redraw. This might not be desired - dedicated redraw event?

            /// The config model
            this.config = options.config;

            /// View params hold values from the config and computed values.
            this.resetParams();

            this.listenTo( this.model, 'change', this.render );
            this.listenTo( this.config, 'change', this.render );
            this.eventObject = _.extend( {}, Backbone.Events );
        },

        /**
         * Calculates the chart dimmensions and margins.
         * Use the dimmensions provided in the config. If not provided use all available width of container and 3/4 of this width for height.
         * This method should be called before rendering because the available dimmensions could have changed.
         */
        calculateDimmensions: function() {
            var self = this;
            if( !self.params.chartWidth ) {
                self.params.chartWidth = self.$el.width();
            }
            if( !self.params.chartHeight ) {
                self.params.chartHeight = Math.round( 3 * self.params.chartWidth / 4 );
            }
            var elementsThatNeedMargins = { title: 30, axis: 30 };
            _.each( [ 'Top', 'Bottom', 'Left', 'Right' ], function( side ) {
                if( !self.params[ 'margin' + side ] ) {
                    self.params[ 'margin' + side ] = self.params.margin;
                    _.each( elementsThatNeedMargins, function( marginAdd, key ) {
                        if( self.params[ key + side ] ) {
                            // The side margin was undefined and we need addition room (for axis, title, etc.)
                            self.params[ 'margin' + side ] += marginAdd;
                        }
                    });
                }
            });
        },

        /**
         * Use the scales provided in the config or calculate them to fit data in view.
         * Assumes to have the range values available in the DataProvider (model) and the chart dimmensions available in params.
         */
        calculateScales: function() {
            var self = this;
            var rangeR = self.model.getRangeFor( this.params.sizeAccessor );
            var rangeX = self.model.getRangeFor( this.params.xAccessor );
            var rangeY = self.model.getRangeFor( this.params.yAccessor );
            if( !self.params.rScale ) {
                var rMinpx = 2;
                var rMaxpx = Math.max( rMinpx, Math.min( self.params.chartWidth, self.params.chartHeight ) ) / 25;
                self.params.rScale = d3.scaleLinear().domain( rangeR ).range( [ rMinpx, rMaxpx ] );//.nice();
            }
            if( !self.params.xScale ) {
                var xMinpx = self.params.rScale.range()[1] + self.params.marginLeft;
                var xMaxpx = self.params.chartWidth - self.params.rScale.range()[1] - self.params.marginRight;
                self.params.xScale = d3.scaleLinear().domain( rangeX ).range( [ xMinpx, xMaxpx ] );//.nice( self.params.xTicks );
            }
            if( !self.params.yScale ) {
                var yMaxpx = self.params.rScale.range()[1] + self.params.marginTop;
                var yMinpx = self.params.chartHeight - self.params.rScale.range()[1] - self.params.marginBottom;
                self.params.yScale = d3.scaleLinear().domain( rangeY ).range( [ yMinpx, yMaxpx ] );//.nice( self.params.yTicks );
            }
        },

        /**
         * Renders an empty chart.
         * Changes chart dimmensions if it already exists.
         */
        renderSVG: function() {
            var self = this;
            var svgs = d3.select( self.$el.get( 0 ) ).selectAll( "svg" ).data( [ self.id ] );
            var svg = svgs.enter().append( "svg" ).attr( "id", function( d ) { return d; } );
            svg.append( "g" )
                .attr( "class", "axis x-axis" )
                .attr( "transform", "translate(0," + ( self.params.yScale.range()[1] - self.params.rScale.range()[1] ) + ")");
            svg.append( "g" )
                .attr( "class", "axis y-axis" )
                .attr( "transform", "translate(" + ( self.params.xScale.range()[0] - self.params.rScale.range()[1] ) + ",0)");
            svg.append( "g" )
                .attr( "class", "bubbles" );
            self.svgSelection()
                .attr( "width", self.params.chartWidth )
                .attr( "height", self.params.chartHeight );
        },

        svgSelection: function() {
            var self = this;
            return d3.select( self.$el.get( 0 ) ).select( "svg#" + self.id );
        },

        /**
         * Renders the axis.
         */
        renderAxis: function() {
            var self = this;
            //var xAxis = d3.svg.axis().scale( self.params.xScale ).orient( "bottom" ).innerTickSize( self.params.yScale.range()[0] - self.params.yScale.range()[1] + 2 * self.params.rScale.range()[1] ).tickPadding( 5 );
            //var yAxis = d3.svg.axis().scale( self.params.yScale ).orient( "left" ).tickSize( -(self.params.xScale.range()[1] - self.params.xScale.range()[0] + 2 * self.params.rScale.range()[1]) ).tickPadding( 5 );
            var xAxis = d3.axisBottom( self.params.xScale ).tickSizeInner( self.params.yScale.range()[0] - self.params.yScale.range()[1] + 2 * self.params.rScale.range()[1] ).tickPadding( 5 ).ticks( self.params.xTicks );
            var yAxis = d3.axisLeft( self.params.yScale ).tickSize( -(self.params.xScale.range()[1] - self.params.xScale.range()[0] + 2 * self.params.rScale.range()[1]) ).tickPadding( 5 ).ticks( self.params.yTicks );
            var svg = self.svgSelection().transition().ease( d3.easeLinear ).duration( self.params.duration );
            svg.select( ".axis.x-axis" ).call( xAxis );
            svg.select( ".axis.y-axis" ).call( yAxis );
        },

        getData: function() {
            return this.model.getData();
        },

        renderData: function() {
            var self = this;
            var data = self.getData();
            console.log( "Rendering data in (" + self.id + "): ", data, self.params );
            var svg = self.svgSelection();
            var svgBubbles = svg.select( ".bubbles" ).selectAll( ".bubble" ).data( data, function( d ) { return d.id; } );
            var svgBubblesEnter = svgBubbles.enter();
            svgBubblesEnter.append( "circle" )
                .attr( "class", "bubble" )
                .attr( "cx", function( d ) { return self.params.xScale( d[self.params.xAccessor] ); } )
                .attr( "cy", function( d ) { return self.params.yScale( d[self.params.yAccessor] ); } )
                .attr( "r", 0 )
                .on( "mouseover", function( d ) {
                    var pos = $( this ).offset();
                    self.eventObject.trigger( "mouseover", d, pos.left, pos.top );
                    d3.select( this ).classed( "active", true );
                })
                .on( "mouseout", function( d ) {
                    var pos = $( this ).offset();
                    self.eventObject.trigger( "mouseout", d, pos.left, pos.top );
                    d3.select( this ).classed( "active", false );
                });
            var svgBubblesEdit = svg.selectAll( ".bubble" ).transition().ease( d3.easeLinear ).duration( self.params.duration );
            svgBubblesEdit
                .attr( "cx", function( d ) { return self.params.xScale( d[self.params.xAccessor] ); } )
                .attr( "cy", function( d ) { return self.params.yScale( d[self.params.yAccessor] ); } )
                .attr( "r",  function( d ) { return self.params.rScale( d[self.params.sizeAccessor] ); } );
            svgBubbles.exit().transition().ease( d3.easeLinear ).duration( self.params.duration )
                .attr( "r", 0 )
                .remove();
        },

        render: function() {
            var self = this;
            _.defer( function() {
                self.resetParams();
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
