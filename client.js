var primaryNodeIp = 'http://143.248.142.227:55555';

var socket = require('socket.io-client')(primaryNodeIp),
    publicIp = require('public-ip'),
    Q = require('q');


(function(){
    getIp()
        .done(function(ip){
            socket.emit('join', {host: ip, type: 'PM'} );
        });

    function getIp(){
        var d = Q.defer();

        publicIp(function (err, ip) {
            if(err){
                d.reject(err);
            }
            d.resolve(ip);
        });
        return d.promise;
    }
})();

socket.on('connect', function(){
    console.log('Connection with ' +primaryNodeIp + ' is successful!!');
});

socket.on('event', function(data){

});

socket.on('disconnect', function(){
    console.log('disconnection')
});