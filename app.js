var pkgcloud = require('pkgcloud'),
    _ = require('underscore'),
    resource = require('./resource'),
    Q = require('q'),
    U = require('node-uuid'),
    express = require('express'),
    publicIp = require('public-ip'),
    app = express();

var openstack;

var mcu_list = {};

var options = {
    flavor : 'm1.large',   //m1.medium,  m1.large
    image : 'MCU_v0.9'
};

app.get('/mcu/:uuid', function(req, res){
    var uuid = req.params.uuid;
    console.log(uuid + ' request!!');

    if( _.isUndefined(mcu_list[uuid].ip) ){
        var timer = setInterval(function(){

            console.log('timer operating');
            if( !_.isUndefined(mcu_list[uuid].ip) ){
                clearTimeout(timer);
                res.send(mcu_list[uuid].ip);
            }

        }, 5000); //ip가 할당되지 않은 경우 대기
    }else{
        console.log(mcu_list[uuid].ip + ' issued!');
        res.send(mcu_list[uuid].ip);
        //delete mcu_list[uuid];
    }
});

var port = 55555;

app.listen(port,function(){
    console.log('This server is running on the port ' + this.address().port );
});

Q.fcall(function(){
    var d = Q.defer();

    openstack = pkgcloud.compute.createClient({
        provider: 'openstack',
        username: resource.details.username,
        password: resource.details.password,
        region: 'RegionOne',
        authUrl: resource.details.identityServiceURL
    });
    d.resolve();
    return d.promise;
})
    .then(function(){

        return getFlavor(options.flavor);
    })
    .then(function(flavor){

        return flavor;
    })
    .then(function(flavor){

        return Q.all([
                flavor,
                getImage(options.image),
                getPublicIP()
        ])
    })
    .spread(function(flavor, image, webserverIP){
        var uuid = U.v1();

        mcu_list[uuid] = {};
        mcu_list[uuid].flavor = flavor;
        mcu_list[uuid].image = image;

        return Q.all([
            createInstance(uuid, flavor, image, webserverIP),
            uuid]);
    })
    .spread(function(server, uuid){

        mcu_list[uuid].id = server.id;

        return Q.all([
            server,
            getFloatingIp(),
            uuid
        ]);
    })
    .spread(function(server, IP, uuid){

        return Q.all([
            attachFloatingIp(server, IP.ip),
            uuid
        ]);
    })
    .spread(function(ip, uuid){
        mcu_list[uuid].ip = ip;

        console.log(mcu_list);
        console.log('[DONE]');

    })
    .done();


/////////////////////////////////////////////
function getPublicIP(){
    var d = Q.defer();

    publicIp(function(err, ip){
        if(err){
            d.reject(err)
        }else{
            d.resolve(ip);
        }
    });

    return d.promise;
}

function getFlavor(flavor_type){
    var d = Q.defer();
    //openstack.listGroups(function(_null, securityGroups){
    //    console.log(securityGroups);  //get Security Groups list
    //})
    openstack.getFlavors(function (err, flavors) {
        if(err){
            d.reject(err);
        }else{
            var flavor = _.findWhere(flavors, { name: flavor_type }); //Pick flavor
            d.resolve(flavor);
        }
    });

    return d.promise;

}

function getImage(image_name){
    var d = Q.defer();
    openstack.getImages(function (err, images) {
        if (err) {
            d.reject(err);
        }else {
            var image = _.findWhere(images, {name: image_name}); //Pick image
            d.resolve(image);
        }
    });

    return d.promise;
}

function createInstance(uuid, flavor, image, webserverIP){
    var d = Q.defer();

    openstack.createServer({
        name: 'MCU_' + uuid,
        hostname: 'MCU_' + uuid,
        image: image,
        flavor: flavor,
        cloudConfig :  Buffer( makeUserData(uuid, webserverIP, port) ).toString('base64'),
        securityGroups : [{name:'licode'}]
        //"metadata": {
        //    "My Server Name": "Apache1"
        //},
        //"personality": [
        //    {
        //        "path": "/etc/banner.txt",
        //        "contents": "ICAgICAgDQoiQSBjbG91ZCBkb2VzIG5vdCBrbm93IHdoeSBpdCBtb3ZlcyBpbiBqdXN0IHN1Y2ggYSBkaXJlY3Rpb24gYW5kIGF0IHN1Y2ggYSBzcGVlZC4uLkl0IGZlZWxzIGFuIGltcHVsc2lvbi4uLnRoaXMgaXMgdGhlIHBsYWNlIHRvIGdvIG5vdy4gQnV0IHRoZSBza3kga25vd3MgdGhlIHJlYXNvbnMgYW5kIHRoZSBwYXR0ZXJucyBiZWhpbmQgYWxsIGNsb3VkcywgYW5kIHlvdSB3aWxsIGtub3csIHRvbywgd2hlbiB5b3UgbGlmdCB5b3Vyc2VsZiBoaWdoIGVub3VnaCB0byBzZWUgYmV5b25kIGhvcml6b25zLiINCg0KLVJpY2hhcmQgQmFjaA=="
        //    }
        //],
    }, handleServerResponse);
    //// Create our second server can be made in the same manner as above.

    // This function will handle our server creation,
    // as well as waiting for the server to come online after we've
    // created it.
    function handleServerResponse(err, server) {
        if (err) {
            d.reject(err);
            console.dir(err);
        }else {
            console.log('SERVER CREATED: ' + server.name + ', waiting for active status');
            // Wait for status: RUNNING on our server, and then callback
            server.setWait({status: server.STATUS.running}, 5000, function (err) {
                if (err) {
                    d.reject(err);
                    console.dir(err);
                }else{
                    console.log('SERVER INFO');
                    console.log(server.name);
                    console.log(server.status);
                    console.log(server.id);
                    console.log('Make sure you DELETE server: ' + server.id +
                    ' in order to not accrue billing charges');

                    d.resolve(server);
                }
            });
        }
    } //end function handleServerResponse
    return d.promise;
}

function getFloatingIp(){
    var d = Q.defer();
    openstack.getFloatingIps(function(err, IPs){
        if(err){
            d.reject(err);
        }else{
            IPs = _.filter(IPs, function(IP){
                return !IP.instance_id;  //return avaliable IPs
            });
        }

        if(IPs.length){
            d.resolve(_.sample(IPs));
        }
    });

    return d.promise;
}

function attachFloatingIp (server, ip) {
    var d = Q.defer();

    openstack.addFloatingIp(server, ip, function (err) {
        if (err) {
            d.reject(err);
        } else {
            d.resolve(ip);
        }
    });
    return d.promise;
}

function makeUserData(uuid, webserverIp, port){
    return  '#!/bin/sh \n'+
        'MCUIP=`curl -X GET '+ webserverIp + ':' + port + '/mcu/' + uuid+'`\n'+
        'echo "config.erizoController.publicIP=\''+"$"+"{MCUIP}"+'\'" >> /home/ubuntu/licode/licode_config.js\n'+
        'echo "config.erizoAgent.publicIP=\''+"$"+"{MCUIP}"+'\'" >> /home/ubuntu/licode/licode_config.js\n'+
        'cd /home/ubuntu/licode/scripts/\n'+
        'sudo ./initLicode.sh \n'+
        'sleep 5 \n'+
        'sudo ./initBasicExample.sh\n'+
        'exit 0';
}




