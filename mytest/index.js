var express = require('express'),
    path = require('path'),
    app = express(),
    bodyParser = require('body-parser'),
    request = require('request');

var port = (process.argv[2]=='-p' && !isNaN(process.argv[3])) ? process.argv[3] : 55555;

var server = app.listen(port, function(){
    console.log('This server is running on the port ' + this.address().port);
});

var io = require('socket.io').listen(server);



app.use(bodyParser.json())
   .use(bodyParser.urlencoded({  extended: true  }))
   .use(express.static(path.join(__dirname, 'public')));

var mcu_list = [];

io.sockets.on('connection', function(socket){

    socket.on('join', function(info){
        console.log(info);
    });

    socket.on('generated', function(info){
        console.log('generated');
        console.log(info);
        console.log('----------');
        socket.info = info;

        mcu_list.push(info);
        socket.emit('getRooms');
        socket.emit('getTotalUsers');
        socket.emit('deleteRooms');
    });

    socket.on('disconnect', function(data){
        console.log(socket.id);
        console.log(socket.info);
        console.log('disconnect');
    });

    socket.on('getRoomList', function(rooms){
        console.log('roomList');
        console.log(socket.info);
        console.log(rooms);
        console.log('----------');
    });

    socket.on('totalNumUsers', function(num){
        console.log('totalNumUsers');
        console.log(socket.info);
        console.log(num);
        console.log('----------');

    });

});

//app.post('/mcu_join', function(req, res){
//    console.log(req.body);
//    mcu_list.push(req.body);
//});

