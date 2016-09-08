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
                this.config.initializeComputedParameters();
                this.params = this.config._computed;
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
                return d3.select(self.$el.get(0)).select("svg#" + self.id);
            },

            getTooltipConfig: function(dataItem) {
                var self = this,
                    formattedData = {};
                _.each(dataItem, function(value, key) {
                    if (_.has(self.params.accessorData[key], "tooltip")) {
                        var formattedKey = key,
                            formattedVal = value;
                        if (_.has(self.params.accessorData[key].tooltip, "nameFormatter"))
                            formattedKey = self.params.accessorData[key].tooltip.nameFormatter(key);
                        if (_.has(self.params.accessorData[key].tooltip, "valueFormatter"))
                            formattedVal = self.params.accessorData[key].tooltip.valueFormatter(value);
                        formattedData[formattedKey] = formattedVal;
                    }
                });
                var tooltipConfig = self.params.tooltipConfigFn(formattedData);

                return tooltipConfig;
            }
        });

        return DataView;
    }
);
