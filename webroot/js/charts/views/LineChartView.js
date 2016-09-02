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
    var LineChartView = DataView.extend({
        tagName: "div",
        className: "line-chart",

        initialize: function (options) {
            // TODO: Every model change will trigger a redraw. This might not be desired - dedicated redraw event?

            /// The config model
            this.config = options.config;

            /// View params hold values from the config and computed values.
            this.resetParams();

            this.listenTo(this.model, "change", this.render);
            this.listenTo(this.config, "change", this.render);
            this.eventObject = _.extend({}, Backbone.Events);
        },

        /**
         * Calculates the chart dimensions and margins.
         * Use the dimensions provided in the config. If not provided use all available width of container and 3/4 of this width for height.
         * This method should be called before rendering because the available dimensions could have changed.
         */
        calculateDimensions: function () {
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
        * Create the usableAccessorData that holds only the verified and enabled accessors from the accessorData structure.
        */
        updateAccessorList: function () {
            var self = this;
            data = self.getData();
            self.params.usableAccessorData = {};
            self.params.yAxisNames = {};
            _.each( self.params.accessorData, function ( accessor, key ) {
                if( accessor.enable && _.has( data[0], key ) ) {
                    if( _.isFinite( accessor.y ) && accessor.y >= 0 ) {
                        var axisName = "y" + accessor.y;
                        self.params.usableAccessorData[key] = accessor;
                        if( !_.has( self.params.yAxisNames, axisName ) ) {
                            self.params.yAxisNames[axisName] = 0;
                        }
                        self.params.yAxisNames[axisName]++;
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
            _.each( self.params.usableAccessorData, function( accessor, key ) {
                var range = self.model.getRangeFor( key );
                var axisName = "y" + accessor.y;
                if( !ranges[axisName] ) {
                    // A range for this axis was not computed yet.
                    ranges[axisName] = range;
                }
                else {
                    // A range for this axis was computed before, check if the new range extends the current one.
                    if( range[0] < ranges[axisName][0] ) {
                        ranges[axisName][0] = range[0];
                    }
                    if( range[1] > ranges[axisName][1] ) {
                        ranges[axisName][1] = range[1];
                    }
                }
            });
            // Now:
            // ranges.y1 holds the maximum extent (range) for all variables displayed on the Y1 axis
            // ranges.y2 holds the maximum extent (range) for all variables displayed on the Y2 axis
            // ranges.y3 ...
            return ranges;
        },

        /**
         * Use the scales provided in the config or calculate them to fit data in view.
         * Assumes to have the range values available in the DataProvider (model) and the chart dimensions available in params.
         */
        calculateScales: function () {
            var self = this;
            var rangeX = self.model.getRangeFor(this.params.xAccessor);
            var ranges = self.getRangesForAllYAccessors();
            // Calculate the starting and ending positions in pixels of the graph's bounding box.
            self.params.yMinpx = self.params.chartHeight - self.params.marginBottom;
            self.params.yMaxpx = self.params.marginTop;
            self.params.xMinpx = self.params.marginLeft;
            self.params.xMaxpx = self.params.chartWidth - self.params.marginRight;
            if( !self.params.xScale ) {
                self.params.xScale = d3.scaleLinear().domain( rangeX ).range([self.params.xMinpx, self.params.xMaxpx]);//.nice( self.params.xTicks );
            }
            // TODO: handle stacked line charts.
            /*
            if (self.params.forceY1) {
                if (!_.isUndefined(self.params.forceY1[0]))
                    rangeY1[0] = self.params.forceY1[0];
                //For stacked bar charts, we can not force the max.
                if (!_.isUndefined(self.params.forceY1[1]))
                    rangeY1[1] = self.params.forceY1[1];
            }
            if (self.params.forceY2) {
                if (!_.isUndefined(self.params.forceY2[0]))
                    rangeY2[0] = self.params.forceY2[0];
                if (!_.isUndefined(self.params.forceY2[1]))
                    rangeY2[1] = self.params.forceY2[1];
            }
            */
            // Create the scales for every Y range. ie y1Scale, y2Scale, ....
            _.each( ranges, function( range, key ) {
                var scaleName = key + "Scale";
                if( !self.params[scaleName] ) {
                    self.params[scaleName] = d3.scaleLinear().domain( range ).range( [self.params.yMinpx, self.params.yMaxpx] );
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
                .attr("transform", "translate(0," + ( self.params.yMaxpx ) + ")");
            // TODO: Do not hardcode number of Y axis. Add Y axis depending on accessor definition.
            svg.append("g")
                .attr("class", "axis y-axis y1-axis")
                .attr("transform", "translate(" + ( self.params.xMinpx ) + ",0)");
            svg.append("g")
                .attr("class", "axis y-axis y2-axis")
                .attr("transform", "translate(" + ( self.params.xMaxpx ) + ",0)");
            svg.append("g")
                .attr("class", "lines");

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

        getData: function () {
            return this.model.getData();
        },

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

        getTooltipData: function(data, xPos) {
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
            var svg = self.svgSelection();

            // Draw one line (path) for each Y accessor.
            // Collect linePathData.
            var linePathData = [];
            var lines = {};
            _.each( self.params.usableAccessorData, function( accessor, key ) {
                lines[key] = d3.line()
                    .x( function ( d ) {
                        return self.params.xScale( d[self.params.xAccessor] );
                    })
                    .y( function ( d, i ) {
                        var scaleYName = "y" + accessor.y + "Scale";
                        return self.params[scaleYName]( d[key] );
                    });
                linePathData.push( key );
            });
            console.log("Rendering data in (" + self.id + "): ", data, self.params, self.params.usableAccessorData, linePathData );

            var svgLines = svg.select( ".lines" ).selectAll( ".line" ).data( linePathData, function( d ) { return d; } );
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
