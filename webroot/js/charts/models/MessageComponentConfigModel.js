/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    "jquery",
    "underscore",
    "backbone",
    "core-basedir/js/charts/models/BaseConfigModel"
], function( $, _, Backbone, BaseConfigModel ) {
        var MessageComponentConfigModel = BaseConfigModel.extend({
            defaults: {
                messages: [],
                
                _showOnceMessageIds: [],
                
                noDataMessage: "No Data Found",
                
                showDataStatusMessage: true,
                
                statusMessageHandler: undefined
            }
        });

        return MessageComponentConfigModel;
    }
);
