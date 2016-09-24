/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

function regExpString2regExp(str) {
    var m = str.match(/^[/](.*)[/]([^/]*)$/);
    return new RegExp(m[1], m[2]);
}

module.exports = {
    regExpString2regExp: regExpString2regExp,
};
