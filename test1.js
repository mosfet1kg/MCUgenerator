    var uuid = require('node-uuid');
    var publicIp = require('public-ip');
    var Q = require('q');
    var ip = require('ip');


    console.log(ip.address());
    console.log(ip.isPrivate('125.1.1.2'));


    (function(){
        var webserverIp='11';
        var uuid = '22';
        var port = 55555;
        var temp = '#!/bin/sh \n'+
        'MCUIP=`curl -X GET '+ webserverIp + ':' + port + '/mcu/' + uuid+'`\n'+
        'echo "config.erizoController.PublicIP=\''+"$"+"{MCUIP}"+'\'" >> /home/ncl/licode/licode_config.js \n'+
        'cd /home/ncl/licode/scripts/\n'+
        './initLicode.sh';
        console.log(temp);
    })();