'use strict';

// defines a client which is both a publisher and a subscriber
const topic = 'main/client3';
const { connect } = require('mqtt');

const settings = {
    port: 1883
};

const client = connect('mqtt://127.0.0.1', settings);
client.subscribe('#');


// fired when a new message is received
client.on('message', (topic, message) => console.log(`${topic} ${message}`));

function pub() {
    // publishes two new messages 
    client.publish(`${topic}/one`, '{"value":1}');
    client.publish(`${topic}/two`, '{"value":2}');
}

// publishes two new messages per second
setInterval(pub, 1000);

