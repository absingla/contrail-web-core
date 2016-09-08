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

    /**
    * This is the child view for CompositeYChartView.
    */
    var LineChartView = DataView.extend({
        tagName: "div",
        className: "line-chart",
        chartType: "line",

        initialize: function ( options ) {
            // TODO: Every model change will trigger a redraw. This might not be desired - dedicated redraw event?

            /// The config model
            this.config = options.config;
            this.axisName = options.axisName;

            /// View params hold values from the config and computed values.
            this.resetParams();

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

        calculateActiveAccessorData: function () {},

        /**
         * Calculates the chart dimensions and margins.
         * Use the dimensions provided in the config. If not provided use all available width of container and 3/4 of this width for height.
         * This method should be called before rendering because the available dimensions could have changed.
         */
        calculateDimensions: function () {},

        /**
        * Calculates maximum data extents for all axis.
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
                domains[self.axisName] = domains[self.axisName].concat( domain );
            });
            domains[self.axisName] = d3.extent( domains[self.axisName] );
            console.log( "LineChartView domains for " + self.getName() + ": ", domains );
            return domains;
        },

        /**
         * Use the scales provided in the config or calculate them to fit data in view.
         * Assumes to have the range values available in the DataProvider (model) and the chart dimensions available in params.
         */
        calculateScales: function () {},

        /**
         * Renders an empty chart.
         * Resizes chart dimensions if chart already exists.
         */
        renderSVG: function () {},

        /**
         * Renders the axis.
         */
        /*
        renderAxis: function () {
            var self = this;
            var xAxis = d3.axisBottom(self.params.xScale)
                .tickSizeInner( self.params.yMinpx - self.params.yMaxpx )
                .tickPadding( 5 ).ticks( self.params.xTicks )
                .tickFormat( self.params.xFormatter );

            var y1Axis = d3.axisLeft(self.params.y1Scale)
                .tickSize( -(self.params.xMaxpx - self.params.xMinpx) )
                .tickPadding( 5 ).ticks( self.params.y1Ticks )
                .tickFormat( self.params.y1Formatter );

            var y2Axis = d3.axisRight(self.params.y2Scale)
                .tickSize( -(self.params.xMaxpx - self.params.xMinpx) )
                .tickPadding( 5 ).ticks( self.params.y2Ticks )
                .tickFormat( self.params.y2Formatter );

            var svg = self.svgSelection().transition().ease( d3.easeLinear ).duration( self.params.duration );

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
        */

        getLineColor: function( accessor ) {
            var self = this;
            if (_.has(self.params.accessorData[accessor], "color")) {
                return self.params.accessorData[accessor].color;
            } else {
                var axis = self.params.accessorData[accessor].y;
                if (!self.params["_y" + axis + "ColorScale"]) {
                    self.params["_y" + axis + "ColorScale"] = d3.scaleOrdinal(d3.schemeCategory20);
                }
                return self.params["_y" + axis + "ColorScale"](accessor);
            }
        },

        /*
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
        */
        /**
         * Calculates the [min, max] for an accessorList
         * @param accessorList
         */
         /*
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
        */
        /*
        getLineY: function(accessor, dataItem, index) {
            var self = this,
                axis =  self.getYAxis(accessor);
            return self.params["y" + axis + "Scale"](dataItem[accessor]);
        },
        */

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
            // Collect linePathData - one item per Y accessor.
            var linePathData = [];
            var lines = {};
            var yScaleName = self.axisName + "Scale";
            _.each( self.params.activeAccessorData, function( accessor, key ) {
                lines[key] = d3.line()
                    .x( function ( d ) {
                        return self.params.xScale( d[self.params.xAccessor] );
                    })
                    .y( function ( d, i ) {

                        return self.params[yScaleName]( d[key] );
                    });
                linePathData.push( key );
            });
            console.log("Rendering data in (" + self.id + "): ", data, self.params, linePathData, self.getName() );

            var svgLines = svg.selectAll( ".line" ).data( linePathData, function( d ) { return d; } );
            svgLines.enter().append( "path" )
                .attr( "class", function( d ) { return "line line-" + d; } )
                .on( "mouseover", function( d ) {
                    var pos = d3.mouse(this);//$(this).offset();
                    var offset = $(this).offset();
                    var dataItem = self.getTooltipData( data, pos[0] );
                    var tooltipConfig = self.getTooltipConfig( dataItem );
                    self.eventObject.trigger( "mouseover", dataItem, tooltipConfig, offset.left + pos[0], offset.top );
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
                self.resetParams();
                /*
                self.updateAccessorList();
                self.calculateDimensions();
                self.calculateScales();
                self.renderSVG();
                self.renderAxis();
                */
                self.renderData();
            });
            return self;
        }
    });

    return LineChartView;
});
