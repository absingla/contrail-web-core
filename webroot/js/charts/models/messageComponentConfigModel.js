/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define( ["jquery", "underscore", "backbone"],
    function( $, _, Backbone ) {
        var MessageComponentConfigModel = Backbone.Model.extend({
            defaults: {
                messages: [],
                
                _showOnceMessageIds: [],
                
                noDataMessage: 'No Data Found',
                
                showDataStatusMessage: true,
                
                statusMessageHandler: undefined
            }
        });

        return MessageComponentConfigModel;
    }
);
