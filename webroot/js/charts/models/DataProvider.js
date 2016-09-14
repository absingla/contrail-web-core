/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    "underscore",
    "backbone"
], function (_, Backbone) {
    /**
     * A DataModel wrapper for view components.
     * Handles:
     * - data range calculation for view components
     * - data filtering and chaining between components
     */
    var DataProvider = Backbone.Model.extend({
        defaults: {
            _type: "DataProvider",

            /// The formatted / filtered data
            data: [],

            /// A lazy store of data ranges for which a range was calculated or for which the range was set manually.
            /// example: { x: [0, 100], y: [20, 30], r: [5, 20] }
            range: {},

            /// Ranges set manually on this data provider.
            manualRange: {},

            /// This can be a DataModel or another DataProvider.
            /// expected functions: getData(), getQueryLimit(), setQueryLimit()
            parentDataModel: undefined,

            error: false,

            //List or error objects with level and error message
            errorList: [],

            messageEvent: _.extend({}, Backbone.events)

        },

        initialize: function (options) {
            // Listen for changes in the parent model.
            if (this.hasParentModel()) {
                this.listenTo(this.getParentModel(), "change", this.prepareData);
            }
            this.prepareData();

            this.listenTo(this, "change:error", this.triggerError);
        },

        getParentModel: function () {
            return this.get("parentDataModel");
        },

        hasParentModel: function () {
            return this.has("parentDataModel");
        },

        getData: function () {
            return this.get("data");
        },

        setData: function (data) {
            this.set({data: data});
        },

        getParentData: function () {
            var data;
            if (this.hasParentModel() && _.isFunction(this.getParentModel().getData)) {
                data = this.getParentModel().getData();
            }
            else {
                data = [];
            }
            return data;
        },

        getQueryLimit: function () {
            var queryLimit;
            if (this.hasParentModel() && _.isFunction(this.getParentModel().getQueryLimit)) {
                queryLimit = this.getParentModel().getQueryLimit();
            }
            else {
                queryLimit = {};
            }
            return queryLimit;
        },

        /**
         * Calls the parent's setQueryLimit() function. In practice this will iterate down to the DataModel and should cause a data re-fetch with new limits.
         */
        setQueryLimit: function (queryLimit) {
            if (this.hasParentModel() && _.isFunction(this.getParentModel().setQueryLimit)) {
                this.getParentModel().setQueryLimit(queryLimit);
            }
        },

        getRange: function () {
            return this.get("range");
        },

        getRangeFor: function (variableName) {
            var range = this.getRange();
            if (!_.has(range, variableName)) {
                range[variableName] = this.calculateRangeForDataAndVariableName(this.getData(), variableName);
            }
            return range[variableName];
        },

        getParentRange: function () {
            var parentRange;
            if (this.hasParentModel() && _.isFunction(this.getParentModel().getRange)) {
                parentRange = this.getParentModel().getRange();
            }
            else {
                parentRange = {};
            }
            return parentRange;
        },

        setRange: function (range) {
            this.set({range: range});
        },

        /**
         * Sets the ranges and manual ranges for the variables provided in the newRange object.
         * Example: setRangeFor( { x: [0,100], y: [5,10] } )
         */
        setRangeFor: function (newRange) {
            var self = this;
            var range = _.extend({}, self.getRange());
            var manualRange = _.extend({}, self.get("manualRange"));
            _.each(newRange, function (variableRange, variableName) {
                range[variableName] = variableRange;
                manualRange[variableName] = variableRange;
            });
            self.setDataAndRanges(range, manualRange);
        },

        resetRangeFor: function (newRange) {
            var self = this;
            var range = _.extend({}, self.getRange());
            _.each(newRange, function (variableRange, variableName) {
                delete range[variableName];
                delete self.get("manualRange")[variableName];
            });
            self.setRange(range);
        },

        /**
         * Worker function used to calculate a data range for provided varaible name.
         */
        calculateRangeForDataAndVariableName: function (data, variableName) {
            var min, max;
            var variableRange;
            var manualRange = this.get("manualRange");
            var queryLimit = this.getQueryLimit();
            var parentRange = this.getParentRange();
            if (_.isArray(manualRange[variableName])) {
                // Use manually set range if available.
                variableRange = [manualRange[variableName][0], manualRange[variableName][1]];
            }
            else if (_.isArray(queryLimit[variableName])) {
                // Use query limit range if available.
                variableRange = [queryLimit[variableName][0], queryLimit[variableName][1]];
            }
            else if (_.isArray(parentRange[variableName])) {
                // Use parent's range for variable if available.
                variableRange = [parentRange[variableName][0], parentRange[variableName][1]];
            }
            else {
                // Otherwise calculate the range from data.
                min = Infinity;
                max = -Infinity;
                _.each(data, function (d) {
                    if( _.has( d, variableName ) ) {
                        if (d[variableName] < min) min = d[variableName];
                        if (d[variableName] > max) max = d[variableName];
                    }
                });
                if( data.length ) {
                    variableRange = [min, max];
                }
                else {
                    // No data available so assume a [0..1] range.
                    variableRange = [0, 1];
                }
            }
            return variableRange;
        },

        setDataAndRanges: function (range, manualRange) {
            var data = this.getParentData();
            var formatData = this.get("formatData");
            if (!manualRange) {
                manualRange = this.get("manualRange");
            }
            if (_.isFunction(formatData)) {
                data = formatData(data, manualRange);
            }

            this.set({data: data, range: range, manualRange: manualRange});
        },

        /**
         * Take the parent's data and filter / format it.
         * Called on initialization and when parent data changed.
         */
        prepareData: function () {
            // Set the new data array and reset range - leave the manual range.
            this.setDataAndRanges({});
        },

        triggerError: function () {
            if (this.error) {
                this.messageEvent.trigger("error", {type: this._type, action: "show", messages: this.errorList});
            } else {
                this.messageEvent.trigger("error", {type: this._type, action: "hide"});
            }
        }
    });

    return DataProvider;

});