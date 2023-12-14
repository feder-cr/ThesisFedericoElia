'use strict';

const { connect } = require('mqtt');
const sense = require("sense-hat-led");

const topic = 'main/client1';
const settings = {
    port: 1883
};
var old=0

const client = connect('mqtt://192.168.1.51', settings);
client.subscribe(`${topic}/+`);

client.on('message', (receivedTopic, message) => {
    console.log(`${receivedTopic} ${message}`);
    const parsedMessage = JSON.parse(message.toString());
    const stringValue = parsedMessage.value;
    const [value1, value2, value3] = stringValue.split('-').map(Number);
    sense.clear(value1, value2, value3);});

function done() {
    console.log("finished message");
}


setTimeout(() => {
    done();
    client.end();
    process.exit();
}, 600000); 

