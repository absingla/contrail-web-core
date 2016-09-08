/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

define([
    "lodash",
    "core-basedir/js/common/qe.model.config",
    "core-constants",
    "query-form-model"
], function(_, queryEngineModelConfig, coreConstants, QueryFormModel) {
    var QueryConfigModel = QueryFormModel.extend({
        defaultSelectFields: [],
        constructor: function(modelConfig, queryReqConfig) {
            var self = this;

            var defaultOptions = {};
            defaultOptions[coreConstants.QE_LOG_TABLE_TYPE] = {
                query_prefix: coreConstants.SYSTEM_LOGS_PREFIX,
                table_name: coreConstants.MESSAGE_TABLE,
                select: coreConstants.DEFAULT_SL_SELECT_FIELDS,
                log_level: "7",
                keywords: "",
                limit: coreConstants.QE_DEFAULT_LIMIT_50K,
            };
            defaultOptions[coreConstants.QE_STAT_TABLE_TYPE] = {
                query_prefix: coreConstants.STAT_QUERY_PREFIX,
            };

            var defaultConfig = queryEngineModelConfig.getQueryModelConfig({
                keywords: "",
                log_level: "",
                limit: "",
            });

            var modelData = _.merge(defaultConfig, modelConfig);
            QueryFormModel.prototype.constructor.call(self, modelData, queryReqConfig);
            self.model().on("change:table_type", function(model, tableType) {
                model.set(defaultOptions[tableType]);
                // TODO select values are not set on first call
                model.set(defaultOptions[tableType]);
            });

            return self;
        },

        timeSeries: function() {
            var self = this;
            return _.without((self.select() || "").split(", "), "T=");
        },

        reset: function(data, event, resetTR, resetTable) {
            resetTable = contrail.checkIfExist(resetTable) ? resetTable : this.query_prefix() !== coreConstants.SYSTEM_LOGS_PREFIX;
            QueryFormModel.prototype.reset.call(this, data, event, resetTR, resetTable);
        },
    });

    return QueryConfigModel;
});