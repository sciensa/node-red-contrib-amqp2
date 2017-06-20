Node-RED amqp2 input and output nodes
====================================

The difference between the node-red-contrib-amqp2 and the original work (node-red-contrib-amqp - by abreits) is that we had to pass the topology in the msg (not fixed), and in the amqp2 input, we received dynamically the name of the queue or exchange that will be read. The node-red-contrib-amqp2 still needs more adjustments, because in amqp2 output it is still necessary to pass the name of a queue, otherwise a default queue is created.

`node-red-contrib-amqp2` is a [Node-RED](http://nodered.org/docs/creating-nodes/packaging.html) package that connects directly to an amqp server (e.g. [RabbitMQ](https://www.rabbitmq.com/)). It contains an input, an output and a configuration node to connect to amqp exchanges or queues for Node-RED.

## Installation     <a name="installation"></a>

If you have installed Node-RED as a global node.js package (you use the command `node-red` anywhere to start it), you need to install
node-red-contrib-amqp2 as a global package as well:

```
$[sudo] npm install -g node-red-contrib-amqp2
```

If you have installed the .zip or cloned your own copy of Node-RED from github, you can install it as a normal npm package inside the Node-RED project directory:

```
<path/to/node-red>$ npm install node-red-contrib-amqp2
```

## Overview     <a name="overview"></a>

The package contains the following Node-RED nodes:

### input: amqp2

Connects to a server and subscribes to the specified exchange or queue. It expects an object called
`msg` containing the following fields:
- `msg.readFrom`: string containing the queue or exchange name.

### output: amqp2

Connects to a server to create exchanges, queues and/or bindings. It expects an object called
`msg` containing the following fields:
- `msg.topology`: JSON containing the config to create exchanges, queues and bindings.

Topology configuration example:

```JSON
{
    "exchanges": [
        {"name": "exchange1", "type": "direct", "options": {"durable": false}},
        {"name": "exchange2"}
    ],
    "queues": [
        {"name": "queue1", "options": {"messageTtl": 60000}},
        {"name": "queue2"}
    ],
    "bindings": [
        {"source": "exchange1", "queue": "queue1", "pattern": "debug", "args": {}},
        {"source": "exchange1", "exchange": "exchange2", "pattern": "error"},
        {"source": "exchange2", "queue": "queue2"}
    ]
};
```

### configuration: amqp2-server

Defines the connection to the amqp server. You can also define in more detail the exchanges and queues that are used in the input and output nodes and even define bindings between exchanges and queues in the msg.topology.

### Based on the original work of Abreits.
