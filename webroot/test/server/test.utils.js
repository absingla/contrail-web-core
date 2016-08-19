

var regExpString2regExp = function(str) {

    var m = str.match(/^[/](.*)[/]([^/]*)$/);
    return new RegExp(m[1], m[2]);
}

module.exports = {
    regExpString2regExp: regExpString2regExp,
};
