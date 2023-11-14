'use strict';

// defines a client which is both a publisher and a subscriber
const topic = 'main/client1';
const { connect } = require('mqtt');

const settings = {
	port: 1883
};

const client = connect('mqtt://127.0.0.1', settings);
client.subscribe(`${topic}/+`);


// fired when a new message is received
client.on('message', (topic, message) => console.log(`${topic} ${message}`));

let count = 0;

function pub() {
	// publishes two new messages 
	client.publish(`${topic}/one`, `{"value":"${count} MQTT (originally an initialism of MQ Telemetry Transport[a]) is a lightweight, publish-subscribe, machine to machine network protocol for message queue/message queuing service. It is designed for connections with remote locations that have devices with resource constraints or limited network bandwidth, such as in the Internet of Things (IoT). It must run over a transport protocol that provides ordered, lossless, bi-directional connections—typically, TCP/IP.[1] It is an open OASIS standard and an ISO recommendation (ISO/IEC 20922). "}`);
	client.publish(`${topic}/two`, `{"value": ${count}}`);
	count += 1;
}

// publishes two new messages per second
setInterval(pub, 1000);

