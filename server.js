var WebSocketServer = require('websocket').server;
var http = require('http');
var uuidv4 = require('uuid/v4');
var express = require('express');

var app = express();

var server = http.createServer(app);

server.listen(process.env.PORT, () => {
    // console.log((new Date()) + ' Server is listening on port 8080...');
    console.log(`Server started on port ${server.address().port} :)`);
});

// var server = http.createServer(function(request, response) {
//     console.log((new Date()) + ' Received request for ' + request.url);
//     response.writeHead(404);
//     response.end();
// });
// server.listen(8080, function() {
//     console.log((new Date()) + ' Server is listening on port 8080');
// });


wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

var connections = { };

// Broadcast to all open connections
function broadcast(data) {
  Object.keys(connections).forEach(function(key) {  
    var connection = connections[key];

    if (connection.connected) {
        connection.send(data);
    }
  });
}

// Send a message to a connection by its connectionID
function sendToConnectionId(connectionID, data) {
  var connection = connections[connectionID];
  if (connection && connection.connected) {
      connection.send(data);
  }
}

wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }
    
    var connection = request.accept(null, request.origin);

    // Create a unique identifier for the incomming connection:
    connection.id = uuidv4();

    // Store the connection.id for later use:
    connections[ connection.id ] = connection;

    console.log((new Date()) + ' Connection id ' + connection.id + ' was accepted.');

    var welcomeMsg = {
      welcomeMessage: 'Your connection id is: ' + connection.id
    };

    connection.send(JSON.stringify(welcomeMsg));

    connection.on('message', function(message) {
        if (message.type === 'utf8') {

            // Broadcast the message:
            broadcast(message.utf8Data);
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    });

    connection.on('close', function(reasonCode, description) {
        console.log((new Date()) + ' Peer ' + connection.id + ' disconnected.');

        delete connections[ connection.id ];
    });
});