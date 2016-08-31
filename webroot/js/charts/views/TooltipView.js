/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    "jquery", "underscore", "backbone", "d3-v4",
    "core-basedir/js/charts/views/DataView"
], function ($, _, Backbone, d3, DataView) {
    var TooltipView = DataView.extend({
        tagName: "div",
        className: "tooltip-view",

        initialize: function (options) {
            this.config = options.config;
            this.resetParams();
            this.template = contrail.getTemplate4Id("coCharts-tooltip");
        },

        registerTriggerEvent: function (eventObject, showEventType, hideEventType) {
            this.listenTo(eventObject, showEventType, this.show);
            this.listenTo(eventObject, hideEventType, this.hide);
        },

        generateTooltipHTML: function(tooltipConfig) {
            var tooltipElementTemplate = contrail.getTemplate4Id(cowc.TMPL_ELEMENT_TOOLTIP),
                tooltipElementTitleTemplate = contrail.getTemplate4Id(cowc.TMPL_ELEMENT_TOOLTIP_TITLE),
                tooltipElementContentTemplate = contrail.getTemplate4Id(cowc.TMPL_ELEMENT_TOOLTIP_CONTENT),
                tooltipElementObj, tooltipElementTitleObj, tooltipElementContentObj;

            tooltipConfig = $.extend(true, {}, cowc.DEFAULT_CONFIG_ELEMENT_TOOLTIP, tooltipConfig);

            tooltipElementObj = $(tooltipElementTemplate(tooltipConfig));
            tooltipElementTitleObj = $(tooltipElementTitleTemplate(tooltipConfig.title));
            tooltipElementContentObj = $(tooltipElementContentTemplate(tooltipConfig.content));

            tooltipElementObj.find(".popover-title").append(tooltipElementTitleObj);
            tooltipElementObj.find(".popover-content").append(tooltipElementContentObj);

            return tooltipElementObj;
        },

        show: function (tooltipData, tooltipConfig, offsetLeft, offsetTop) {
            var self = this;
            var tooltipElementObj = this.generateTooltipHTML(tooltipConfig);
            var tooltipWidth = tooltipElementObj.width(),
                tooltipHeight = tooltipElementObj.height(),
                windowWidth = $(document).width(),
                tooltipPositionTop = 0,
                tooltipPositionLeft = offsetLeft;

            if (offsetTop > tooltipHeight / 2) {
                tooltipPositionTop = offsetTop - tooltipHeight / 2;
            }

            if ((windowWidth - offsetLeft) < tooltipWidth) {
                tooltipPositionLeft = offsetLeft - tooltipWidth - 10;
            } else {
                tooltipPositionLeft += 20;
            }

            $(tooltipElementObj).css({
                top: tooltipPositionTop,
                left: tooltipPositionLeft
            });

            $(tooltipElementObj).find(".popover-tooltip-footer").find(".btn")
                .off("click")
                .on("click", function () {
                    var actionKey = $(this).data("action"),
                        actionCallback = tooltipConfig.content.actions[actionKey].callback;
                    self.hide();
                    actionCallback(tooltipData);
                });

            $(tooltipElementObj).find(".popover-remove")
                .off("click")
                .on("click", function (e) {
                    self.hide();
                });

            $("body").append(this.$el);
            this.$el.html(tooltipElementObj);
            this.$el.show();
        },

        hide: function (d, x, y) {
            this.$el.hide();
        },

        render: function () {
            return self;
        }
    });

    return TooltipView;
});
