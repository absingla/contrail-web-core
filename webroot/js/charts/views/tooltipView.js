/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define( [
    'jquery', 'underscore', 'backbone', 'd3-v4',
    'core-basedir/js/charts/views/dataView'
], function( $, _, Backbone, d3, DataView) {
    var TooltipView = DataView.extend( {
        tagName: "div",
        className: "tooltip-view",

        initialize: function( options ) {
            this.config = options.config;
            this.resetParams();
            this.template = contrail.getTemplate4Id("coCharts-tooltip");
        },

        registerTriggerEvent: function( eventObject, showEventType, hideEventType ) {
            this.listenTo( eventObject, showEventType, this.show );
            this.listenTo( eventObject, hideEventType, this.hide );
        },

        show: function( d, x, y ) {
            $( "body" ).append( this.$el );
            this.$el.html( this.template( d ) );
            this.$el.css( { top: y - 55, left: x } );
            this.$el.show();
        },

        hide: function( d, x, y ) {
            this.$el.hide();
        },

        render: function() {
            return self;
        }
    });

    return TooltipView;
});
