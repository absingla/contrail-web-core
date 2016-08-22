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
             * Save the provided view's config to local params JSON object.
             * The view may modify the params object with calculated values.
             */
            resetParams: function () {
                if (!this.params) {
                    this.params = {};
                }
                this.params = _.extend(this.params, this.config.toJSON());
                //this.params = this.config.toJSON();
            }
        });

        return DataView;
    }
);
