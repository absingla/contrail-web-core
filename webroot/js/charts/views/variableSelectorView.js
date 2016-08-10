/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define( [
    'jquery', 'underscore', 'backbone', 'd3-v4',
    'core-basedir/js/charts/view/dataView',
    'text!core-basedir/js/charts/view//variableSelectorView.html'
], function( $, _, Backbone, d3, DataView, htmlTemplate ) {
    var VariableSelectorView = DataView.extend( {
        tagName: "div",
        className: "variableSelector-view",

        initialize: function( options ) {
            this.config = options.config;
            this.resetParams();
            this.template = _.template( htmlTemplate );

            this.listenTo( this.config, 'change', this.configurationChanged );
            this.eventObject = _.extend( {}, Backbone.Events );
        },

        events: {
            "change .variable-selector": "variableSelected"
        },

        variableSelected: function( e ) {
            var selectedVariableName = $( e.target ).val();
            var selectedVariableKey = $( e.target ).attr( "data-variable-key" );
            var selectedVariable = _.findWhere( this.params.variables, { key: selectedVariableKey } );
            if( selectedVariable ) {
                selectedVariable.name = selectedVariableName;
                var selectedVariablesObject = {};
                selectedVariablesObject[selectedVariableKey] = selectedVariableName;
                this.eventObject.trigger( "variableSelected", selectedVariablesObject );
            }
        },

        configurationChanged: function() {
            this.resetParams();
            this.render();
        },

        render: function() {
            this.$el.html( this.template( this.params ) );
            return this;
        }
    });

    return VariableSelectorView;
});
