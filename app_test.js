var pkgcloud = require('pkgcloud'),
    _ = require('underscore'),
    resource = require('./resource'),
    Q = require('q'),
    U = require('node-uuid'),
    express = require('express'),
    publicIp = require('public-ip'),
    app = express();

var openstack;

var options = {
    flavor : 'm1.medium',
    image : 'joinMCU_Cluster'
};

app.listen(55555, function(){
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
                getImage(options.image)
        ])
    })
    .spread(function(flavor, image){
        var uuid = U.v1();

        return Q.all([
            createInstance(uuid, flavor, image),
            uuid
        ]);
    })
    .spread(function(server){

        return Q.all([
            server,
            getFloatingIp()
        ]);
    })
    .spread(function(server, IP){

        return attachFloatingIp(server, IP.ip);
    })
    .done();


/////////////////////////////////////////////

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
        image: image,
        flavor: flavor
        //cloudConfig :  Buffer( makeUserData(uuid, webserverIP, port) ).toString('base64'),
        //securityGroups : [{name:'licode'}]
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




