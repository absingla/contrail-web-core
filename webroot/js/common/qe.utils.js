/*
 * Copyright (c) 2015 Juniper Networks, Inc. All rights reserved.
 */
define([
    'underscore'
], function (_) {
    var QEUtils = function() {
        var self = this;

        this.formatQEUIQuery = function(qObj) {
            var qeQuery = {};
            var qeModAttrs = {};
            if (null == qObj) {
                return null;
            }
            qeQuery.async = false;
            if (null != qObj.async) {
                qeQuery.async = qObj.async;
            }
            if (null != qObj.table) {
                qeModAttrs = qeTableJSON[qObj.table];
                qeModAttrs.table_name = qObj.table;
            }
            if (null != qObj.select) {
                qeModAttrs.select = qObj.select;
            }
            if (null != qObj.where) {
                qeModAttrs.where = qObj.where;
            }
            if (null != qObj.minsSince) {
                qeModAttrs.to_time_utc = 'now';
                qeModAttrs.from_time_utc = 'now-' + qObj.minsSince + 'm';
            } else if ((null != qObj.from_time_utc) &&
                       (null != qObj.to_time_utc)) {
                qeModAttrs.from_time_utc = qObj.from_time_utc;
                qeModAttrs.to_time_utc = qObj.to_time_utc;
            }
            if (null != qObj.table_type) {
                qeModAttrs.table_type = qObj.table_type;
            }
            if (null != qObj.time_range) {
                qeModAttrs.time_range = qObj.time_range;
                qeModAttrs.time_granularity_unit = "secs";
            }
            if (null != qObj.time_granularity_unit) {
                qeModAttrs.time_granularity_unit = qObj.time_granularity_unit;
            }
            qeModAttrs.filters = "";
            if (null != qObj.filter) {
                qeModAttrs.filters =
                    fillQEFilterByKey("filter", qObj.filter,
                                      qeModAttrs.filters);
            }
            if (null == qObj.limit) {
                qObj.limit = 150000;
            }
            qeModAttrs.filters +=
                fillQEFilterByKey("limit", qObj.limit, qeModAttrs.filters);
            if (null == qObj.sort_fields) {
                if (null != qeModAttrs.sort_fields) {
                    qObj.sort_fields = qeModAttrs.sort_fields;
                }
            }
            delete qeModAttrs.sort_fields;
            if (null != qObj.sort_fields) {
                qeModAttrs.filters +=
                    fillQEFilterByKey("sort_fields", qObj.sort_fields,
                                      qeModAttrs.filters);
            }
            if (null == qObj.sort) {
                if (null != qeModAttrs.sort) {
                    qObj.sort = qeModAttrs.sort;
                    qeModAttrs.filters +=
                        fillQEFilterByKey("sort", qObj.sort, qeModAttrs.filters);
                }
            }
            delete qeModAttrs.sort;
            qeQuery.formModelAttrs = qeModAttrs;
            return qeQuery;
        };
    };

    function fillQEFilterByKey (key, value, filterStr)
    {
        if (null == filterStr) {
            filterStr = "";
        }
        if (filterStr.length > 0) {
            filterStr += " & ";
        }
        var keyStr = (filterStr.length > 0) ? " & " : "";
        keyStr += key;
        filterStr = keyStr + ": " + value;
        return filterStr;
    }

    var qeTableJSON = {
        'MessageTable': {
            'select': "MessageTS, Type, Source, ModuleId, Messagetype, " +
                "Xmlmessage, Level, Category",
            'from_time_utc': 'now-10m',
            'to_time_utc': 'now',
            'level': 4,
            'sort_fields': 'MessageTS',
            'sort': 'desc'
        },
        'StatTable.VirtualMachineStats.cpu_stats': {
            'select': "Source, T, cpu_stats.cpu_one_min_avg, cpu_stats.rss," +
                " name",
            'from_time_utc': 'now-10m',
            'to_time_utc': 'now',
            'where': []
        }
    };
    return QEUtils;
});
