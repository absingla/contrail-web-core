/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    "underscore",
    "backbone",
    "core-basedir/js/charts/views/DataView",
], function( _, Backbone, DataView ) {
    var ControlPanelView = DataView.extend({
        tagName: "div",
        className: "control-panel",

        initialize: function(options) {
            var self = this
            /// The config model
            self.config = options.config;

            //self.listenTo(this.model, "change", self.render);
            self.listenTo(this.config, "change", self.render);
            self.eventObject = _.extend({}, Backbone.Events);
        },

        render: function() {
            var self = this,
                controlPanelTemplate = contrail.getTemplate4Id(cowc.TMPL_CONTROL_PANEL_COMPONENT),
                controlPanelSelector = self.el;

            self.resetParams();
            $( controlPanelSelector ).html( controlPanelTemplate( self.params ) );

            _.each( self.params.buttons, function( button ) {
                if( _.isObject( button.events ) ) {
                    var $button = $( controlPanelSelector ).find( ".control-panel-item."+button.name );
                    _.each( button.events, function( eventToTrigger, eventToHandle ) {
                        $button.on( eventToHandle, function() {
                            self.eventObject.trigger( eventToTrigger, self.params );
                        });
                    });
                }
            });

            /*
            if (contrail.checkIfKeyExistInObject(true, self.params, "default.zoom.enabled") && self.params.default.zoom.enabled) {
                self.params.default.zoom.events(controlPanelSelector);
            }

            if (contrail.checkIfExist(self.params.custom)) {
                _.each(self.params.custom, function(configValue, configKey) {
                    var controlPanelElementSelector = $(controlPanelSelector).find("." + configKey);

                    _.each(configValue.events, function(eventValue, eventKey) {
                        controlPanelElementSelector
                            .off(eventKey)
                            .on(eventKey, function(e) {
                                if (!$(this).hasClass("disabled") && !$(this).hasClass("refreshing")) {
                                    $(controlPanelSelector).find(".control-panel-item").addClass("disabled");
                                    $(this).removeClass("disabled").addClass("refreshing");
                                    eventValue(e, this, controlPanelSelector);
                                }
                            });
                    });
                });

                var closeFn = function(event) {
                    var chartControlPanelExpandedSelector = $(controlPanelSelector).parent().find(".control-panel-expanded-container");

                    if (chartControlPanelExpandedSelector.is(":visible") && $(event.target).closest(chartControlPanelExpandedSelector).length == 0) {
                        chartControlPanelExpandedSelector.hideElement();

                        $(controlPanelSelector).find(".control-panel-item")
                            .removeClass("active")
                            .removeClass("refreshing")
                            .removeClass("disabled");
                    }
                };

                $(document)
                    .off("click", closeFn)
                    .on("click", closeFn);
            }
            */
        }
    });

    return ControlPanelView;
});
