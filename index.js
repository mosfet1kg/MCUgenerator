var express = require('express'),
    path = require('path'),
    app = express(),
    bodyParser = require('body-parser'),
    request = require('request');

var server = app.listen(55555, function(){
    console.log('This server is running on the port ' + this.address().port);
});


app.use(bodyParser.json())
   .use(bodyParser.urlencoded({  extended: true  }))
   .use(express.static(path.join(__dirname, 'public')));

var mcu_list = {};


app.post('/mcu_join', function(req, res){
    console.log(req.body);

});