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

        expandedTemplates: {
            accessorData: cowc.TMPL_CHARTS_CONTROL_PANEL_EXPANDED_ACCESSOR_DATA
        },

        initialize: function(options) {
            var self = this
            /// The config model
            self.config = options.config;
            self.openPanel = null;

            //self.listenTo(this.model, "change", self.render);
            self.listenTo( this.config, "change", self.render) ;
            self.eventObject = _.extend( {}, Backbone.Events );
        },

        events: {
            "click .control-panel-item": "controlPanelItemClicked",
            "change .accessor-data-checkbox": "accessorDataChanged"
        },

        controlPanelItemClicked: function( e ) {
            var self = this;
            var $button = $( e.target ).closest( ".control-panel-item" );
            var buttonName = $button.attr( "data-name" );
            var button = _.findWhere( self.params.buttons, { name: buttonName } );
            if( button ) {
                if( _.isObject( button.events ) && button.events.click ) {
                    self.eventObject.trigger( button.events.click, self.params );
                }
                if( button.openPanel ) {
                    var $expandedPanel = self.$el.find( ".control-panel-expanded-container" );
                    if( self.openPanel ) {
                        // Panel already open.
                        if( self.openPanel == button.openPanel ) {
                            // Same panel open so close it.
                            $expandedPanel.addClass( "hide" );
                            self.openPanel = null;
                        }
                        else {
                            // Different panel open so replace it.
                            self.renderPanel( self.openPanel );
                            self.openPanel = button.openPanel;
                        }
                    }
                    else {
                        // Panel not open so open it
                        $expandedPanel.removeClass( "hide" );
                        self.renderPanel( button.openPanel );
                        self.openPanel = button.openPanel;
                    }
                }
            }
        },

        accessorDataChanged: function() {
            var self = this;
            var accessorData = self.config.get( 'accessorData' );
            self.$el.find( ".accessor-data-checkbox" ).each( function( elem ) {
                var checked = $( this ).is( ":checked" );
                var key = $( this ).attr( "value" );
                accessorData[key].enable = checked;
            });
            console.log( "accessorData: ", accessorData );
            self.config.trigger( "change:accessorData" );
        },

        renderPanel: function( panelName ) {
            var self = this;
            console.log( "Render Panel: ", self.params );
            if( self.expandedTemplates[panelName] ) {
                var expandedPanelTemplate = contrail.getTemplate4Id( self.expandedTemplates[panelName] );
                var $expandedPanel = self.$el.find( ".control-panel-expanded-container" );
                $expandedPanel.html( expandedPanelTemplate( self.params ) );
            }
        },

        render: function() {
            var self = this;
            self.resetParams();
            var controlPanelTemplate = contrail.getTemplate4Id( cowc.TMPL_CHARTS_CONTROL_PANEL );
            self.$el.html( controlPanelTemplate( self.params ) );

            /*
            var controlPanelSelector = self.el;
            _.each( self.params.buttons, function( button ) {
                if( _.isObject( button.events ) ) {
                    var $button = $( controlPanelSelector ).find( ".control-panel-item.control-panel-item-" + button.name );
                    _.each( button.events, function( eventToTrigger, eventToHandle ) {
                        $button.on( eventToHandle, function() {
                            self.eventObject.trigger( eventToTrigger, self.params );
                        });
                    });
                }
            });
            */

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
