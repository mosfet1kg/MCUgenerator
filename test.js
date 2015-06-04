var Q = require('q');


Q.fcall(function(){
    return 'fuck'
})
.then(function(data){
        console.log(data);
    });