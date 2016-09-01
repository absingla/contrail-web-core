/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    "underscore",
    "backbone",
    "core-basedir/js/charts/views/DataView",
], function (_, Backbone, DataView) {
    var ControlPanelView = DataView.extend({
        tagName: "div",
        className: "control-panel",

        initialize: function(options) {
            /// The config model
            this.config = options.config;

            /// View params hold values from the config and computed values.
            this.resetParams();

            this.listenTo(this.model, "change", this.render);
            this.listenTo(this.config, "change", this.render);
            this.eventObject = _.extend({}, Backbone.Events);
        },

        render: function() {
            var self = this,
                controlPanelTemplate = contrail.getTemplate4Id(cowc.TMPL_CONTROL_PANEL),
                controlPanelSelector = self.el;

            $(controlPanelSelector).html(controlPanelTemplate(self.params));

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
        }
    });

    return ControlPanelView;
});
