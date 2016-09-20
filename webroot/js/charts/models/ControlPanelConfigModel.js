/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    "jquery",
    "underscore",
    "backbone",
    "core-basedir/js/charts/models/BaseConfigModel"
], function( $, _, Backbone, BaseConfigModel ) {
    var ControlPanelConfigModel = BaseConfigModel.extend({
        defaults: {
            accessorData: {}
        }
    });

    return ControlPanelConfigModel;
});
