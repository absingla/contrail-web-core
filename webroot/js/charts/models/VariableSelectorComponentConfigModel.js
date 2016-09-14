/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    "jquery",
    "underscore",
    "backbone",
    "core-basedir/js/charts/models/BaseConfigModel"
], function( $, _, Backbone, BaseConfigModel ) {
        var VariableSelectorComponentConfigModel = BaseConfigModel.extend({
            defaults: {

                variables: [
                    {
                        key: "x",
                        name: "a1",
                        options: [{name: "a1", description: "time"}, {name: "a2", description: "port"}]
                    },
                    {
                        key: "y",
                        name: "b1",
                        options: [{name: "b1", description: "bytes"}, {name: "b2", description: "errors"}]
                    }
                ]
            }
        });

        return VariableSelectorComponentConfigModel;
    }
);