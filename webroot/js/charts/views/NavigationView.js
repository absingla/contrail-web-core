/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    "jquery",
    "underscore",
    "backbone",
    "d3-v4",
    "core-basedir/js/charts/views/DataView",
    "core-basedir/js/charts/models/DataProvider",
    "core-basedir/js/charts/models/CompositeYChartConfigModel",
    "core-basedir/js/charts/views/CompositeYChartView"
], function(
    $, _, Backbone, d3, DataView, DataProvider,
    CompositeYChartConfigModel, CompositeYChartView
) {
    var NavigationView = DataView.extend({
        tagName: "div",
        className: "navigation-view",

        initialize: function (options) {
            var self = this;
            self.config = options.config;
            //self.resetParams();
            self.template = contrail.getTemplate4Id( "coCharts-navigation-panel" );

            // NavigationView does not react itself to model changes. Instead it listens to compositeYChartView render events
            // and updates itself every time the compositeYChartView renders itself.
            self.isModelChanged = false;
            self.listenTo( self.model, "change", self.modelChanged );
            self.listenTo( self.config, "change", self.modelChanged );
            self.eventObject = _.extend( {}, Backbone.Events );

            self.focusDataProvider = new DataProvider( {parentDataModel: self.model} );
            self.brush = null;

            self.compositeYChartView = null;
        },

        events: {
            "click .prev>a": "prevChunkSelected",
            "click .next>a": "nextChunkSelected"
        },

        modelChanged: function() {
            this.isModelChanged = true;
        },

        handleModelChange: function (e) {
            var self = this;
            var x = self.params.xAccessor;
            var rangeX = self.model.getRangeFor( x );
            // Fetch the previous data window position
            var prevWindowXMin = undefined;
            var prevWindowXMax = undefined;
            var prevWindowSize = undefined;
            if( self.config.has( "focusDomain" ) ) {
                var prevFocusDomain = self.config.get( "focusDomain" );
                if( _.isArray( prevFocusDomain[x] ) ) {
                    prevWindowXMin = prevFocusDomain[x][0];
                    prevWindowXMax = prevFocusDomain[x][1];
                    prevWindowSize = prevWindowXMax - prevWindowXMin;
                }
            }
            // Try to keep the same data window. Move it if exceeds data range.
            if( !_.isUndefined(prevWindowXMin) && !_.isUndefined(prevWindowXMax) ) {
                var xMin = prevWindowXMin;
                var xMax = prevWindowXMax;
                if (xMin < rangeX[0]) {
                    xMin = rangeX[0];
                }
                if (xMin > rangeX[1] - prevWindowSize) {
                    xMin = rangeX[1] - prevWindowSize;
                }
                if (xMax > rangeX[1]) {
                    xMax = rangeX[1];
                }
                if (xMax < rangeX[0] + prevWindowSize) {
                    xMax = rangeX[0] + prevWindowSize;
                }
                var newFocusDomain = {};
                newFocusDomain[x] = [xMin, xMax];
                if( xMin != prevWindowXMin || xMax != prevWindowXMax ) {
                    self.focusDataProvider.setRangeFor( newFocusDomain );
                    self.config.set( { focusDomain: newFocusDomain }, { silent: true } );
                }

                var brushGroup = self.svgSelection().select( "g.brush" ).transition().ease( d3.easeLinear ).duration( self.params.duration );
                self.brush.move( brushGroup, [self.params.xScale(xMin), self.params.xScale(xMax)] );
            }
            else {
                self.removeBrush();
            }
        },

        removeBrush: function() {
            var self = this;
            var svg = self.svgSelection();
            svg.select( "g.brush" ).remove();
            self.brush = null;
        },

        prevChunkSelected: function () {
            var range = this.model.getRange();
            var x = this.params.xAccessor;
            var rangeDiff = range[x][1] - range[x][0];
            var queryLimit = {};
            queryLimit[x] = [range[x][0] - rangeDiff * 0.5, range[x][1] - rangeDiff * 0.5];
            this.model.setQueryLimit( queryLimit );
            // TODO: show some waiting screen?
        },

        nextChunkSelected: function () {
            var range = this.model.getRange();
            var x = this.params.xAccessor;
            var rangeDiff = range[x][1] - range[x][0];
            var queryLimit = {};
            queryLimit[x] = [range[x][0] + rangeDiff * 0.5, range[x][1] + rangeDiff * 0.5];
            this.model.setQueryLimit( queryLimit );
            // TODO: show some waiting screen?
        },

        getFocusDataProvider: function () {
            return this.focusDataProvider;
        },

        initializeAndRenderCompositeYChartView: function() {
            var self = this;
            self.compositeYChartView = new CompositeYChartView({
                model: self.model,
                config: self.config,
                el: self.el,
                id: self.id
            });
            self.listenTo( self.compositeYChartView.eventObject, "rendered", self.chartRendered );
            self.compositeYChartView.render();
            /*
            if( tooltipView ) {
                tooltipView.registerTriggerEvent( compositeYChartView.eventObject, "showTooltip", "hideTooltip" );
            }
            */
        },

        /**
        * This method will be called when the chart is rendered.
        */
        chartRendered: function() {
            var self = this;
            self.params = self.compositeYChartView.params;
            if( self.isModelChanged ) {
                self.handleModelChange();
                self.isModelChanged = false;
            }
            self.renderBrush();
            self.renderPageLinks();
        },

        /**
        * This needs to be called after compositeYChartView render.
        */
        renderBrush: function () {
            var self = this;
            console.log( "NavigationView renderBrush: ", self.params );
            var x = self.params.xAccessor;
            if( !self.brush ) {
                var svg = self.svgSelection();
                self.brush = d3.brushX()
                    .extent( [[self.params.xRange[0], self.params.yRange[1]], [self.params.xRange[1], self.params.yRange[0]]] )
                    .handleSize( 10 )
                    .on( "brush", function () {
                        var dataWindow = d3.event.selection;
                        var xMin = self.params.xScale.invert( dataWindow[0] );
                        var xMax = self.params.xScale.invert( dataWindow[1] );
                        var focusDomain = {};
                        focusDomain[x] = [xMin, xMax];
                        self.config.set( { focusDomain: focusDomain }, { silent: true } );
                        self.focusDataProvider.setRangeFor( focusDomain );
                        self.eventObject.trigger( "windowChanged", xMin, xMax );
                    });
                svg.append( "g" ).attr( "class", "brush" ).call( self.brush );
            }
        },

        renderPageLinks: function () {
            var self = this;
            if( !self.$el.find( ".page-links" ).length ) {
                $( "<div>" ).appendTo( self.$el ).addClass( "page-links" );
            }
            self.$el.find( ".page-links" ).html( self.template() );
        },

        render: function () {
            var self = this;
            if( !self.compositeYChartView ) {
                // One time compositeYChartView initialization.
                self.initializeAndRenderCompositeYChartView();
                // From this moment the compositeYChartView is independent from NavigationView. It will react to config / model changes on it's own.
            }
            return self;
        }
    });

    return NavigationView;
});
