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

        performSync: function( sourceModel, sourcePath, targetModel ) {
            /*
            console.log( "performSync: ", sourcePath, this.get( 'sourcePath' ) );
            if( this.get( 'sourcePath' ) == sourcePath ) {
                // Avoid event loop.
                this.sourceModel = null;
                this.targetModel = null;
                this.set( 'sourcePath', null );
            }
            else {
                var mod = {};
                mod[sourcePath] = sourceModel.get( sourcePath );
                targetModel.set( mod, { silent: true } );
                // Always trigger a change event because we could be setting a nested object or object reference.
                this.set( 'sourcePath', sourcePath );
                targetModel.trigger( "change:" + sourcePath );
            }
            */
            //targetModel.set( sourcePath, sourceModel.get( sourcePath ) );
            console.log( "performSync" );
            var mod = {};
            mod[sourcePath] = sourceModel.get( sourcePath );
            targetModel.set( mod );
        },

    	/**
    	* Set all the bindings defined in the config.
    	*/
    	start: function() {
    		var self = this;
            var components = self.get( 'components' );
            _.each( self.get( 'bindings' ), function( binding ) {
                if( _.has( components, binding.sourceComponent ) && _.has( components, binding.targetComponent ) ) {
                    if( _.has( components[binding.sourceComponent], binding.sourceModel ) && _.has( components[binding.targetComponent], binding.targetModel ) ) {
                        var sourceModel = components[binding.sourceComponent][binding.sourceModel];
                        var targetModel = components[binding.targetComponent][binding.targetModel];
                        if( sourceModel.has( binding.sourcePath ) ) {
                            if( binding.action == 'sync' ) {
                                // Two way listen for changes and perform one way sync on startup.
                                self.listenTo( sourceModel, "change:"+binding.sourcePath, function() {
                                    self.performSync( sourceModel, binding.sourcePath, targetModel );
                                });
                                self.listenTo( targetModel, "change:"+binding.sourcePath, function() {
                                    self.performSync( targetModel, binding.sourcePath, sourceModel );
                                });
                                self.performSync( sourceModel, binding.sourcePath, targetModel );
                            }
                        }
                    }
                }
            });
            /*
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
            */
    	}
    });

    return BindingHandler;
});
