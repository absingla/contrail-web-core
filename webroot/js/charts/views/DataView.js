/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define(["jquery", "underscore", "backbone", "d3-v4"],
    function ($, _, Backbone, d3) {

        /**
         * View base class.
         */
        var DataView = Backbone.View.extend({

            defaults: {
                _type: "DataView"
            },

            initialize: function (options) {
                this.config = options.config;
            },

            /**
             * Save the config '_computed' parameters in the view's 'params' local object for easier reference (this.params instead of this.config._computed).
             * The view may modify the params object with calculated values.
             */
            resetParams: function () {
                this.params = this.config.initializedComputedParameters();
            },

            resetParamsForChild: function( childIndex ) {
                this.params = this.config.initializedComputedParametersForChild( childIndex );
            },

            /**
            * This is how the view gets its data.
            */
            getData: function () {
                return this.model.getData();
            },

            /**
            * This is how the view gets the SVG html element selection for rendering.
            */
            svgSelection: function () {
                var self = this;
                //return d3.select(self.$el.get(0)).select("svg#" + self.id);
                return d3.select( self.el ).select( "svg#" + self.id );
            }
        });

        return DataView;
    }
);
