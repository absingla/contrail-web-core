/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    "jquery",
    "underscore",
    "backbone",
    "d3-v4",
    "core-basedir/js/charts/views/DataView",
    "chart-utils"
], function ($, _, Backbone, d3, DataView, chartUtils) {

    /**
    * This is the child view for CompositeYChartView.
    */
    var LineChartView = DataView.extend({
        tagName: "div",
        className: "line-chart",
        chartType: "line",
        renderOrder: 10,

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

        /**
        * Called by the parent in order to calculate maximum data extents for all of this child's axis.
        * Assumes the params.activeAccessorData for this child view is filled by the parent with the relevent yAccessors for this child only.
        * Returns an object with following structure: { y1: [0,10], x: [-10,10] }
        */
        calculateAxisDomains: function() {
            var self = this;
            var domains = { x: self.model.getRangeFor( self.params.xAccessor ) };
            domains[self.axisName] = [];
            // The domains calculated here can be overriden in the axis configuration.
            // The overrides are handled by the parent.
            _.each( self.params.activeAccessorData, function( accessor, key ) {
                var domain = self.model.getRangeFor( key );
                domains[self.axisName] = domains[self.axisName].concat( domain );
            });
            domains[self.axisName] = d3.extent( domains[self.axisName] );
            console.log( "LineChartView domains for " + self.getName() + ": ", domains );
            self.params.handledAxisNames = _.keys( domains );
            return domains;
        },

        /**
         * Called by the parent when all scales have been saved in this child's params.
         * Can be used by the child to perform any additional calculations.
         */
        calculateScales: function () {},

        /**
         * Called by the parent to allow the child to add some initialization code into the provided entering selection.
         */
        renderSVG: function( enteringSelection ) {
            enteringSelection.append( "g" ).attr( "class", "lines" );
        },

        getLineColor: function( accessorKey ) {
            var self = this;
            if (_.has(self.params.accessorData[accessorKey], "color")) {
                return self.params.accessorData[accessorKey].color;
            } else {
                var axis = self.params.accessorData[accessorKey].y;
                if (!self.params["_y" + axis + "ColorScale"]) {
                    self.params["_y" + axis + "ColorScale"] = d3.scaleOrdinal(d3.schemeCategory20);
                }
                return self.params["_y" + axis + "ColorScale"](accessorKey);
            }
        },

        getTooltipData: function( data, xPos ) {
            var self = this,
                xBisector = d3.bisector(function(d) {return d[self.params.xAccessor];}).left,
                xVal = self.params.xScale.invert(xPos),
                index = xBisector(data, xVal, 1);

            var dataItem = xVal - data[index - 1][self.params.xAccessor] > data[index][self.params.xAccessor] - xVal ? data[index] : data[index - 1];
            return dataItem;
        },

        renderData: function () {
            var self = this;
            var data = self.getData();
            var svg = self.svgSelection().select( "g.component-" + self.getName() );

            // Draw one line (path) for each Y accessor.
            // Collect linePathData - one line per Y accessor.
            var linePathData = [];
            var lines = {};
            var zeroLine = d3.line()
                .x( function ( d ) {
                    return self.params.xScale( d[self.params.xAccessor] );
                })
                .y( function ( d ) {
                    return yScale.range()[0];
                });
            var yScale = self.getYScale();
            _.each( self.params.activeAccessorData, function( accessor, key ) {
                lines[key] = d3.line()
                    .x( function ( d ) {
                        return self.params.xScale( d[self.params.xAccessor] );
                    })
                    .y( function ( d ) {
                        return yScale( d[key] );
                    })
                    //.curve( chartUtils.interpolateSankey );
                    .curve( d3.curveCatmullRom.alpha(0.5) );
                linePathData.push( key );
            });
            console.log("Rendering data in LineChartView: ", data, self.params, linePathData, self.getName() );

            var svgLines = svg.selectAll( ".line" ).data( linePathData, function( d ) { return d; } );
            svgLines.enter().append( "path" )
                .attr( "class", function( d ) { return "line line-" + d; } )
                .attr( "d", function( d ) { return zeroLine( data ) } )
                .on( "mouseover", function( d ) {
                    var pos = d3.mouse(this);//$(this).offset();
                    var offset = $(this).offset();
                    var dataItem = self.getTooltipData( data, pos[0] );
                    self.eventObject.trigger( "mouseover", dataItem, offset.left + pos[0], offset.top );
                    d3.select( this ).classed( "active", true );
                })
                .on( "mouseout", function( d ) {
                    var pos = $(this).offset();
                    self.eventObject.trigger( "mouseout", d, pos.left, pos.top );
                    d3.select( this ).classed( "active", false );
                })
                .merge( svgLines ).transition().ease( d3.easeLinear ).duration( self.params.duration )
                .attr( "stroke", function( d ) { return self.getLineColor( d ); } )
                .attr( "d", function( d ) { return lines[d]( data ) } );
            svgLines.exit().remove();

            /*
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
                        .attr("stroke", function(d, i) { return self.getLineColor(accessor);})
                        .on("mouseover", function( data ) {
                            var pos = d3.mouse(this);//$(this).offset();
                            var offset = $(this).offset();
                            var dataItem = self.getTooltipData(data, pos[0]);
                            var tooltipConfig = self.getTooltipConfig(dataItem);
                            self.eventObject.trigger("mouseover", dataItem, tooltipConfig, offset.left + pos[0], offset.top);
                            d3.select(this).classed("active", true);
                        })
                        .on("mouseout", function( d ) {
                            var pos = $(this).offset();
                            self.eventObject.trigger("mouseout", d, pos.left, pos.top);
                            d3.select(this).classed("active", false);
                        });

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

    return LineChartView;
});
