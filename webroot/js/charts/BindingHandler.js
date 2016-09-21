/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    "underscore",
    "backbone"
], function( _, Backbone ) {
    var BindingHandler = Backbone.Model.extend({
    	defaults: {
    		components: {}
    	},

    	addComponent: function( componentName, component ) {
    		var savedComponent = this.get( 'components' )[componentName] = {};
    		savedComponent.config = component.config;
    		savedComponent.model = component.model;
    		savedComponent.events = component.eventObject;
    	},

    	/**
    	* Set all the listeners defined in the config.
    	*/
    	start: function() {
    		var self = this;
    		var components = self.get( 'components' );
    		_.each( self.get( 'sync' ), function( sourceComponentObject, sourceComponentName ) {
    			if( _.has( components, sourceComponentName ) ) {
    				_.each( sourceComponentObject, function( propertiesHolderObject, propertiesHolderName ) {
    					if( _.has( components[sourceComponentName], propertiesHolderName ) ) {
    						_.each( propertiesHolderObject, function( propertyObject, propertyName ) {
    							if( components[sourceComponentName][propertiesHolderName].has( propertyName ) ) {
    								_.each( propertyObject, function( targetComponentObject, targetComponentName ) {
    									if( _.has( components, targetComponentName ) ) {
    										_.each( targetComponentObject, function( targetFunction, targetPropertiesHolderName ) {
    											if( _.isFunction( targetFunction ) && _.has( components[targetComponentName], targetPropertiesHolderName ) ) {
    												// Call the sync function once.
													targetFunction( components[sourceComponentName][propertiesHolderName], components[targetComponentName][targetPropertiesHolderName] );
													// Listen to changes of source property.
													self.listenTo( components[sourceComponentName][propertiesHolderName], "change:"+propertyName, function() {
														targetFunction( components[sourceComponentName][propertiesHolderName], components[targetComponentName][targetPropertiesHolderName] );
													});
    											}
    										});
    									}
    								});
    							}
    						});
    					}
    				});
    			}
    		});
    		_.each( self.get( 'handle' ), function( sourceComponentObject, sourceComponentName ) {
    			if( _.has( components, sourceComponentName ) ) {
    				_.each( sourceComponentObject, function( propertiesHolderObject, propertiesHolderName ) {
    					if( _.has( components[sourceComponentName], propertiesHolderName ) ) {
    						_.each( propertiesHolderObject, function( propertyObject, eventName ) {
								_.each( propertyObject, function( targetComponentObject, targetComponentName ) {
									if( _.has( components, targetComponentName ) ) {
										_.each( targetComponentObject, function( targetFunction, targetPropertiesHolderName ) {
											if( _.isFunction( targetFunction ) && _.has( components[targetComponentName], targetPropertiesHolderName ) ) {
												// Listen to changes of source property.
												self.listenTo( components[sourceComponentName][propertiesHolderName], eventName, function( eventProperties ) {
													targetFunction( eventProperties, components[targetComponentName][targetPropertiesHolderName] );
												});
											}
										});
									}
								});
    						});
    					}
    				});
    			}
    		});
    	}
    });

    return BindingHandler;
});
