/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    "jquery",
    "underscore",
    "backbone"
], function( $, _, Backbone ) {
	var BaseConfigModel = Backbone.Model.extend({

        initialize: function( options ) {
            this.initializeComputedParameters();
        },

		/**
        * Initialize the computed parameters with the config parameters.
        */
        initializeComputedParameters: function() {
            if( !this._computed ) {
                this._computed = {};
            }
            _.extend( this._computed, this.toJSON() );
        }
	});

	return BaseConfigModel;
});
