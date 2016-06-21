/*
 * Copyright (c) 2016 Juniper Networks, Inc. All rights reserved.
 */

$.urlParam = function(name){
    var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
    if (results==null){
        return null;
    }
    else{
        return results[1] || 0;
    }
}

tty.Window.prototype.drag = function (ev) {
    return;
}

tty.Window.prototype.resizing = function (ev) {
    return;
}

tty.Window.prototype.destroy = function() {
    return;
};

setTimeout(function() {
    var window = new tty.Window();
    window.maximize();
    setTimeout(function() {
        var tab = window.tabs[0];
        var socket = tab.socket;
        var term = tty.terms[tab.id];
        var ipAddress = $.urlParam('ipAddress');
        var data = "ssh -o StrictHostKeyChecking=no -l root " + ipAddress + "\r\n";
        socket.emit('data', tab.id, data);

        socket.on('data', function(id, data) {
            if(data.indexOf('password:') != -1) {
                socket.emit('data', tab.id, 'c0ntrail123\r\n');
            }
        });
    }, 300)
}, 300);