/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    "jquery",
    "underscore",
    "backbone",
], function ($, _, Backbone) {
    var ControlPanelConfigModel = Backbone.Model.extend({
        defaults: {
            accessorData: {}
        }
    });

    return ControlPanelConfigModel;
});
