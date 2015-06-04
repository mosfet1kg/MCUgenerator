var localStream, room, recording, recordingId;

function startRecording () {
  if (room !== undefined){
    if (!recording){
      room.startRecording(localStream, function(id) {
        recording = true;
        recordingId = id;
      });
      
    } else {
      room.stopRecording(recordingId);
      recording = false;
    }
  }
}

window.onload = function () {
  recording = false;
  var config = {audio: true, video: true, data: true, screen: "", videoSize: [640, 480, 640, 480]};
  // If we want screen sharing we have to put our Chrome extension id. The default one only works in our Lynckia test servers.
  // If we are not using chrome, the creation of the stream will fail regardless.
  localStream = Erizo.Stream(config);
  var createRoom = function(userName, role, callback) {

      $.post('http://143.248.142.152:3001/createRoom', {
          roomName: 'test',
          userName: userName,
          role: role })
          .done(function( token ) {
              callback(token)
          }, "json");
    };

  createRoom('user'+Math.round(Math.random()*100), "lecturer", function (token) {
    room = Erizo.Room(token);

    localStream.addEventListener("access-accepted", function () {

      var subscribeToStreams = function (streams) {
        for (var index in streams) {
          var stream = streams[index];
          if (localStream.getID() !== stream.getID()) {
            room.subscribe(stream);
          }
        }
      };

      room.addEventListener("room-connected", function (roomEvent) {
        room.publish(localStream, {maxVideoBW: 300});
        subscribeToStreams(roomEvent.streams);
      });

      room.addEventListener("stream-subscribed", function(streamEvent) {
        var stream = streamEvent.stream;
        var div = document.createElement('div');
        div.setAttribute("style", "width: 320px; height: 240px;");
        div.setAttribute("id", "test" + stream.getID());

        document.body.appendChild(div);
        stream.show("test" + stream.getID());

      });

      room.addEventListener("stream-added", function (streamEvent) {
        var streams = [];
        streams.push(streamEvent.stream);
        subscribeToStreams(streams);
      });

      room.addEventListener("stream-removed", function (streamEvent) {
        // Remove stream from DOM
        var stream = streamEvent.stream;
        if (stream.elementID !== undefined) {
          var element = document.getElementById(stream.elementID);
          document.body.removeChild(element);
        }
      });

      room.connect();

      localStream.show("myVideo");

    });
    localStream.init();
  });
};
