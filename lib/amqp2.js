"use strict";
var amqp2 = require("amqp-ts");
module.exports = function (RED) {
    "use strict";
    var exchangeTypes = ["direct", "fanout", "headers", "topic"];
    function initialize(node) {

        if (node.server) {
            node.status({ fill: "green", shape: "ring", text: "connecting" });
            node.server.claimConnection().then(function () {
                // node.ioType is a string with the following meaning:
                // "0": direct exchange
                // "1": fanout exchange
                // "2": headers exchange
                // "3": topic exchange
                // "4": queue
                if (node.ioType === "4") {
                    node.src = node.server.connection.declareQueue(node.ioName);
                }
                else {
                    node.src = node.server.connection.declareExchange(node.ioName, exchangeTypes[node.ioType]);
                }
                node.src.initialized.then(function () {
                    node.status({ fill: "green", shape: "dot", text: "connected" });
                    // execute node specific initialization
                    node.initialize();
                }).catch(function (err) {
                    node.status({ fill: "red", shape: "dot", text: "connect error" });
                    node.error("amqp2 " + node.amqp2Type + " node connect error: " + err.message);
                });
            }).catch(function (err) {
                node.status({ fill: "red", shape: "dot", text: "connect error" });
                node.error("amqp2 " + node.amqp2Type + " node connect error: " + err.message);
            });
            node.on("close", function () {
                node.src.close().then(function () {
                    node.server.freeConnection();
                    node.status({ fill: "red", shape: "ring", text: "disconnected" });
                }).catch(function (err) {
                    node.server.freeConnection();
                    node.status({ fill: "red", shape: "dot", text: "disconnect error" });
                    node.error("amqp2 " + node.amqp2Type + " node disconnect error: " + err.message);
                });
            });
        }
        else {
            node.status({ fill: "red", shape: "dot", text: "error" });
            node.error("amqp2 " + node.amqp2Type + " error: missing amqp2 server configuration");
        }
    }
    //
    //-- amqp2 IN ------------------------------------------------------------------
    //
    function amqp2In(n) {
        var node = this;
        RED.nodes.createNode(node, n);
        node.status({ fill: "red", shape: "ring", text: "disconnected" });
        node.source = n.source;
        node.topic = n.topic;
        node.ioType = n.iotype;
        node.ioName = n.ioname;
        node.server = RED.nodes.getNode(n.server);
        // set amqp2 node type initialization parameters
        node.amqp2Type = "input";
        node.src = null;
        // node specific initialization code

        node.on("input", function(msg){

          node.ioName = msg.readFrom;

          node.initialize = function () {

              function Consume(msg) {
                  node.send({
                      topic: node.topic || msg.fields.routingKey,
                      payload: msg.getContent(),
                      amqpMessage: msg
                  });
              }
              node.src.activateConsumer(Consume, { noAck: true }).then(function () {
                  node.status({ fill: "green", shape: "dot", text: "connected" });
              }).catch(function (e) {
                  node.status({ fill: "red", shape: "dot", text: "error" });
                  node.error("amqp2 input error: " + e.message);
              });
          };

          initialize(node);

        });

    }
    //
    //-- amqp2 OUT -----------------------------------------------------------------
    //
    function amqp2Out(n) {
        var node = this;
        RED.nodes.createNode(node, n);
        node.source = n.source;
        node.topic = n.routingkey;
        node.ioType = n.iotype;
        node.ioName = n.ioname;
        node.server = RED.nodes.getNode(n.server);
        // set amqp2 node type initialization parameters
        node.amqp2Type = "output";
        node.src = null;
        // node specific initialization code
        node.initialize = function () {
            node.on("input", function (msg) {

              //begin - create topology
              if (msg.topology) {
                  try {
                      var topology = JSON.parse(msg.topology);
                  }
                  catch (e) {
                      node.error("amqp2-SERVER error creating topology: " + e.message);
                  }
                  node.server.connectionPromise = node.server.connection.declareTopology(topology).catch(function (e) {
                      node.error("amqp2-SERVER error creating topology: " + e.message);
                  });
              }
              //end - create topology

                var message;
                if (msg.payload) {
                    message = new amqp2.Message(msg.payload, msg.options);
                }
                else {
                    message = new amqp2.Message(msg);
                }
                message.sendTo(node.src, node.topic || msg.topic);
            });
        };
        initialize(node);
    }
    //
    //-- amqp2 SERVER --------------------------------------------------------------
    //
    function amqp2Server(n) {
        var node = this;
        RED.nodes.createNode(node, n);
        // Store local copies of the node configuration (as defined in the .html)
        node.host = n.host || "localhost";
        node.port = n.port || "5672";
        node.vhost = n.vhost;
        node.keepAlive = n.keepalive;
        node.useTls = n.usetls;
        // node.useTopology = n.usetopology;
        // node.topology = n.topology;
        node.clientCount = 0;
        node.connectionPromise = null;
        node.connection = null;
        node.claimConnection = function () {
            if (node.clientCount === 0) {
                // Create the connection url for the amqp2 server
                var urlType = node.useTls ? "amqps://" : "amqp://";
                var credentials = "";
                if (node.credentials.user) {
                    credentials = node.credentials.user + ":" + node.credentials.password + "@";
                }
                var urlLocation = node.host + ":" + node.port;
                if (node.vhost) {
                    urlLocation += "/" + node.vhost;
                }
                if (node.keepAlive) {
                    urlLocation += "?heartbeat=" + node.keepAlive;
                }
                node.connection = new amqp2.Connection(urlType + credentials + urlLocation);
                node.connectionPromise = node.connection.initialized.then(function () {
                    node.log("Connected to amqp2 server " + urlType + urlLocation);
                }).catch(function (e) {
                    node.error("amqp2-SERVER error: " + e.message);
                });
                // Create topology
                // if (node.useTopology) {
                //     try {
                //         var topology = JSON.parse(node.topology);
                //     }
                //     catch (e) {
                //         node.error("amqp2-SERVER error creating topology: " + e.message);
                //     }
                //     node.connectionPromise = node.connection.declareTopology(topology).catch(function (e) {
                //         node.error("amqp2-SERVER error creating topology: " + e.message);
                //     });
                // }
            }
            node.clientCount++;
            return node.connectionPromise;
        };
        node.freeConnection = function () {
            node.clientCount--;
            if (node.clientCount === 0) {
                node.connection.close().then(function () {
                    node.connection = null;
                    node.connectionPromise = null;
                    node.log("amqp2 server connection " + node.host + " closed");
                }).catch(function (e) {
                    node.error("amqp2-SERVER error closing connection: " + e.message);
                });
            }
        };
    }
    // Register the node by name. This must be called before overriding any of the
    // Node functions.
    RED.nodes.registerType("amqp2 in", amqp2In);
    RED.nodes.registerType("amqp2 out", amqp2Out);
    RED.nodes.registerType("amqp2-server", amqp2Server, {
        credentials: {
            user: { type: "text" },
            password: { type: "password" }
        }
    });
};
