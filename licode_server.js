/*global require, __dirname, console*/
var express = require('express'),
    bodyParser = require('body-parser'),
    errorhandler = require('errorhandler'),
    morgan = require('morgan'),
    net = require('net'),
    N = require('./nuve'),
    fs = require('fs'),
    https = require('https'),
    config = require('./../../licode_config');

var options = {
    key: fs.readFileSync('cert/key.pem').toString(),
    cert: fs.readFileSync('cert/cert.pem').toString()
};

var app = express();

// app.configure ya no existe
"use strict";
app.use(errorhandler({
    dumpExceptions: true,
    showStack: true
}));
app.use(morgan('dev'));
app.use(express.static(__dirname + '/public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

//app.set('views', __dirname + '/../views/');
//disable layout
//app.set("view options", {layout: false});

N.API.init(config.nuve.superserviceID, config.nuve.superserviceKey, 'http://localhost:3000/');

app.get('/getRooms/', function(req, res) {
    "use strict";
    N.API.getRooms(function(rooms) {
        res.send(rooms);
    });
});

app.get('/getUsers/:room', function(req, res) {
    "use strict";
    var room = req.params.room;
    N.API.getUsers(room, function(users) {
        res.send(users);
    });
});

app.post('/createRoom/', function(req, res){

    N.API.getRooms(function(roomlist) {
        "use strict";
        console.log(req.body);
        var newRoom = req.body.roomName,
            userName = req.body.userName,
            role = req.body.role,
            usedRoomID;

        //console.log(newRoom, userName, role);
        var currentRooms = JSON.parse(roomlist);
        //console.log(currentRooms);
        console.log('How many room ?', roomlist.length); //check and see if one of these rooms is 'myRoom'
        for (var i in currentRooms) {
            var room = currentRooms[i];
            if (room.name == newRoom){
                usedRoomID = room._id;
                console.log('-----------> '+newRoom + ' already exist');
            }
        }

        if (!usedRoomID) {
            N.API.createRoom(newRoom, function(room) {
                var newRoomID = room._id;
                console.log('Created roomID ', newRoomID);

                N.API.createToken(newRoomID, userName, role, function (token) {
                    console.log('creating Token : ' + token);

                    res.json({roomID: newRoomID , token : token });  //, host:mcu.address

                }, function(e){
                    console.log(e);
                })

            });
        } else {
            console.log('-------->Using roomID ', usedRoomID);
            //console.log(usedRoomID, ' ',userName, ' ', role);
            N.API.createToken(usedRoomID, userName, role, function (token) {
                console.log('creating Token : ' + token);
                res.json({token : token});  //, host:mcu.address

            }, function(e){
                console.log(e);
            })
        }
    });

});

app.post('/createToken/', function(req, res) {
    "use strict";
    console.log(req.body);
    console.log();
    var roomID = req.body.roomID,
        userName = req.body.userName,
        role = req.body.role;

    console.log(roomID, ' ', userName,' ',role);
    N.API.createToken(roomID, userName, role, function(token) {
        console.log('creating Token : ' + token);
        res.send({token : token});
    }, function(e){
        console.log(e);
    });

});

app.post('/deleteRoom/', function(req, res){
    "use strict";
    var _id = req.body._id;

    console.log("deleteRoom " + _id);
    N.API.deleteRoom(_id, function (result) {
        console.log(_id + ' room was removed : ', result);
        //console.log('MCU initiation process Result: ', result);
        res.send(result);
    });
});

app.use(function(req, res, next) {
    "use strict";
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE');
    res.header('Access-Control-Allow-Headers', 'origin, content-type');
    if (req.method == 'OPTIONS') {
        res.send(200);
    } else {
        next();
    }
});


app.listen(3001, function(){
    console.log("this server is running on the port " + this.address().port);
});


var server = https.createServer(options, app);
server.listen(3004);
