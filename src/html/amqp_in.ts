//to do: Node RED type definitions
declare var RED: any;

//
// -- amqp2 in --------------------------------------------------------------------------------------
//
RED.nodes.registerType("amqp2 in", {
    category: "input",
    defaults: {
        name: { value: "" },
        topic: { value: "" },
        iotype: { value: "4", required: true },
        ioname: { value: "", required: true },
        server: { type: "amqp2-server", required: true }
    },
    inputs: 0,
    outputs: 1,
    color: "#ff9933",
    icon: "bridge.png",
    label: function() {
        return this.name || this.ioname || "amqp2";
    },
    labelStyle: function() {
        return this.name ? "node_label_italic" : "";
    }
});
