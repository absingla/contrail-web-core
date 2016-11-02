/*
 * Copyright (c) 2014 Juniper Networks, Inc. All rights reserved.
 */
var logutils = require(process.mainModule.exports.corePath +
                       "/src/serverroot/utils/log.utils");
var commonUtils = require(process.mainModule.exports.corePath +
                          '/src/serverroot/utils/common.utils');
var global = require(process.mainModule.exports.corePath +
                     '/src/serverroot/common/global');
var opApiServer = require(process.mainModule.exports.corePath +
                          '/src/serverroot/common/opServer.api');

function createTimeQueryJsonObj (minsSince, endTime)
{
    var startTime = 0, timeObj = {};

    if ((null != minsSince) && ((null == endTime) || ('' == endTime))) {
        timeObj['start_time'] = 'now-' + minsSince +'m';
        timeObj['end_time'] = 'now';
        return timeObj;
    }
    if(endTime != null && endTime != '' ) {
        try {
            endTime = parseInt(endTime);
        } catch (err) {
            endTime = commonUtils.getUTCTime(new Date().getTime());
        }
    } else {
        endTime = commonUtils.getUTCTime(new Date().getTime());
    }

    if (minsSince != -1) {
        startTime =
            commonUtils.getUTCTime(commonUtils.adjustDate(new Date(endTime),
                                                          {'min':-minsSince}).getTime());
    }


    timeObj['start_time'] = startTime * 1000;
    timeObj['end_time'] = endTime * 1000;
    return timeObj;
}

function createTimeObj (appData)
{
    var minsSince = appData['minsSince'];
    var minsAlign = appData['minsAlign'];

    var endTime = commonUtils.getUTCTime(new Date().getTime());
    var startTime = 0;

    if (minsSince != -1) {
        if (null == appData['startTime']) {
            var ctDate = new Date();
            if (null != minsAlign) {
                ctDate.setSeconds(0);
            }

            startTime =
                commonUtils.getUTCTime(commonUtils.adjustDate(ctDate,
                                                              {'min':-minsSince}).getTime());
        } else {
            startTime = parseInt(appData['startTime']);
            endTime = parseInt(appData['endTime']);
        }
    }

    var timeObj = {};
    timeObj['start_time'] = startTime * 1000;
    timeObj['end_time'] = endTime * 1000;
    return timeObj;
}

function createTimeObjByAppData (appData)
{
    var serverTime = appData['serverTime'];
    var minsSince = appData['minsSince'];
    var timeObj = {};
    if ((minsSince != null) && (null == appData['startTime'])) {
        if ((null != serverTime) && (('true' == serverTime) ||
                                     (true == serverTime))) {
            timeObj = createTimeObj(appData);
            timeObj['timeGran'] =
                getTimeGranByTimeSlice(timeObj, appData['sampleCnt']);
        } else {
            timeObj['start_time'] = 'now-' + minsSince +'m';
            timeObj['end_time'] = 'now';
            timeObj['timeGran'] = getTimeGranByTimeSlice(timeObj,
                                                         appData['sampleCnt']);
        }
    } else {
        assert(appData['startTime']);
        assert(appData['endTime']);
        timeObj = createTimeQueryObjByStartEndTime(appData['startTime'],
                                                   appData['endTime']);
        if (null == appData['timeGran']) {
            timeObj['timeGran'] = getTimeGranByTimeSlice(timeObj,
                                                         appData['sampleCnt']);
        } else {
            timeObj['timeGran'] = parseInt(appData['timeGran']);
        }
    }
    return timeObj;
}

function createTimeQueryJsonObjByServerTimeFlag (minsSince, serverTimeFlag)
{
    var timeObj = {};
    if ((null == serverTimeFlag) || (false == serverTimeFlag) ||
        ('false' == serverTimeFlag)) {
        timeObj['start_time'] = 'now-' + minsSince +'m';
        timeObj['end_time'] = 'now';
        return timeObj;
    }

    var endTime = commonUtils.getUTCTime(new Date().getTime());
    var startTime =
        commonUtils.getUTCTime(commonUtils.adjustDate(new
                                                      Date(endTime),
                                                      {'min':-minsSince}).getTime());
    timeObj['start_time'] = startTime * 1000;
    timeObj['end_time'] = endTime * 1000;
    return timeObj;
}

function createTimeQueryJsonObjByAppData (appData)
{
    var timeObj = {};

    if (appData['startTime']) {
        if (true == isNaN(appData['startTime'])) {
            timeObj['start_time'] = appData['startTime'];
        } else {
            timeObj['start_time'] = parseInt(appData['startTime']) * 1000;
        }
        if (true == isNaN(appData['endTime'])) {
            timeObj['end_time'] = appData['endTime'];
        } else {
            timeObj['end_time'] = parseInt(appData['endTime']) * 1000;
        }
    } else {
        timeObj = createTimeQueryJsonObj(appData['minsSince']);
    }
    return timeObj;
}

function executeQueryString (queryJSON, appData, callback)
{
    var resultData, startTime = (new Date()).getTime(), endTime;
    opApiServer.apiPost(global.RUN_QUERY_URL, queryJSON, appData,
                        function (error, jsonData) {
        endTime = (new Date()).getTime();
        logutils.logger.debug("Query executed in " + ((endTime - startTime) / 1000) +
            'secs ' + JSON.stringify(queryJSON));
        callback(error, jsonData);
    });
};

function buildPreUnderlayWhereQuery (data)
{
    var srcIP = data['srcIP'];
    var destIP = data['destIP'];
    var sPort = data['sport'];
    var dPort = data['dport'];
    var srcVN = data['srcVN'];
    var destVN = data['destVN'];
    var protocol = data['protocol'];

    var whereData = [
        {'name': 'o_protocol', 'value': protocol,
            'suffix': {'name': 'o_sport', 'value': sPort}},
        {'name': 'o_protocol', 'value': protocol,
            'suffix': {'name': 'o_dport', 'value': dPort}},
        {'name': 'o_svn', 'value': srcVN,
            'suffix': {'name': 'o_sip', 'value': srcIP}},
        {'name': 'o_dvn', 'value': destVN,
            'suffix': {'name': 'o_dip', 'value': destIP}}
    ];
    return whereData;
}

function buildUnderlayQuery (uiQData, selectFileds)
{
    var queryJSON = global.QUERY_JSON['OverlayToUnderlayFlowMap'];
    var whereClause = [];
    whereClause[0] = [];
    var whereData = buildPreUnderlayWhereQuery(uiQData);
    var cnt = whereData.length;
    for (var i = 0; i < cnt; i++) {
        whereClause[0][i] = {};
        whereClause[0][i]['name'] = whereData[i]['name'];
        whereClause[0][i]['value'] = whereData[i]['value'];
        if (null == whereData[i]['value2']) {
            whereClause[0][i]['op'] = 1;
            whereClause[0][i]['value2'] = null;
        } else {
            whereClause[0][i]['op'] = 3;
            whereClause[0][i]['value2'] = whereData[i]['value'];
        }
        if (null != whereData[i]['suffix']) {
            whereClause[0][i]['suffix'] = {};
            whereClause[0][i]['suffix']['name'] = whereData[i]['suffix']['name'];
            whereClause[0][i]['suffix']['value'] = whereData[i]['suffix']['value'];
            whereClause[0][i]['suffix']['suffix'] = null;
            if (null == whereData[i]['suffix']['value2']) {
                whereClause[0][i]['suffix']['op'] = 1;
                whereClause[0][i]['suffix']['value2'] = null;
            } else {
                whereClause[0][i]['suffix']['op'] = 3;
                whereClause[0][i]['suffix']['value2'] =
                    whereData[i]['suffix']['value2'];
            }
        }
    }
    var timeObj = createTimeQueryJsonObjByAppData(uiQData);
    queryJSON['start_time'] = timeObj['start_time'];
    queryJSON['end_time'] = timeObj['end_time'];
    queryJSON['where'] = whereClause;
    if (null != selectFileds) {
        queryJSON['select_fields'].concat(selectFileds);
    }
    queryJSON['dir'] = global.TRAFFIC_DIR_INGRESS;
    if (null != uiQData['direction']) {
        if ('ingress' == uiQData['direction']) {
            queryJSON['dir'] = global.TRAFFIC_DIR_INGRESS;
        } else if ('egress' == uiQData['direction']) {
            queryJSON['dir'] = global.TRAFFIC_DIR_EGRESS;
        } else {
            queryJSON['dir'] = uiQData['direction'];
        }
    }
    return queryJSON;
}

function formatQEUIQuery (qObj)
{
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
}

function getTableTypeByName (table)
{
    if (table.indexOf('StatTable') > -1) {
        return global.QE_STAT_TABLE_TYPE;
    }
    if (table.indexOf('Flow') > -1) {
        return global.QE_FLOW_TABLE_TYPE;
    }
    return null;
}

function getTimeGranByTimeSlice (timeObj, sampleCnt)
{
    var startTime = timeObj['start_time'];
    var endTime = timeObj['end_time'];
    if (true == isNaN(startTime)) {
        var str = 'now-';
        var pos = startTime.indexOf(str);
        if (pos != -1) {
            var mins = startTime.slice(pos + str.length);
            mins = mins.substr(0, mins.length - 1);
            mins = parseInt(mins);
        } else {
            assert(0);
        }
        var timeGran = (mins * 60) / sampleCnt;
        return Math.floor(timeGran);
    }

    var timeGran = (endTime - startTime) / (sampleCnt *
        global.MILLISEC_IN_SEC * global.MICROSECS_IN_MILL);
    if (timeGran < 1) {
        timeGran = 1;
    }
    return Math.floor(timeGran);
}

function createTimeQueryObjByStartEndTime (startTime, endTime)
{
    var timeObj = {};
    timeObj['start_time'] = parseInt(startTime) * global.MICROSECS_IN_MILL;
    timeObj['end_time'] = parseInt(endTime) * global.MICROSECS_IN_MILL;
    return timeObj;
}

function formQEQueryData (table, appData, selectArr, where, filters)
{
    var minsSince = appData.minsSince;
    var timeObj;
    var timeGran;
    if (minsSince != null) {
        timeObj =
            createTimeQueryJsonObjByServerTimeFlag(appData.minsSince,
                                                   appData.useServerTime);
        timeGran = getTimeGranByTimeSlice(timeObj, appData.sampleCnt);
    } else {
        timeObj =
            createTimeQueryObjByStartEndTime(appData['startTime'],
                                             appData['endTime']);
        timeGran = appData['timeGran'];
    }

    var index = selectArr.indexOf("T=");
    if (index !== -1) {
        selectArr[index] = "T=" + timeGran;
    }
    var queryJSON = {
        table_name: table,
        table_type: getTableTypeByName(table),
        select: selectArr.join(", "),
        where: where,
        time_granularity: timeGran,
        time_granularity_unit: "secs",
        from_time_utc: timeObj["start_time"] / 1000,
        to_time_utc: timeObj["end_time"] / 1000,
        filters: filters
    };
    var queryData = {
        async: false,
        chunk: 1,
        chunkSize: 10000,
        formModelAttrs: queryJSON,
        engQueryStr: JSON.stringify(queryJSON)
    };
    return queryData;
}

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

    }
};

exports.createTimeQueryJsonObj = createTimeQueryJsonObj;
exports.createTimeQueryJsonObjByServerTimeFlag =
    createTimeQueryJsonObjByServerTimeFlag;
exports.executeQueryString = executeQueryString;
exports.buildUnderlayQuery = buildUnderlayQuery;
exports.createTimeQueryJsonObjByAppData = createTimeQueryJsonObjByAppData;
exports.formatQEUIQuery = formatQEUIQuery;
exports.createTimeObjByAppData = createTimeObjByAppData;
exports.formQEQueryData = formQEQueryData;
