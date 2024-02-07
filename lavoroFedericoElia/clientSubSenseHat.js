'use strict';

const { connect } = require('mqtt');
const sense = require("sense-hat-led");

const topic = 'main/client1';
const settings = {
    port: 1883
};

const client = connect('mqtt://192.168.1.51', settings);
client.subscribe(`${topic}/+`);

client.on('message', (receivedTopic, message) => {
    console.log(`${receivedTopic} ${message}`);
    const parsedMessage = JSON.parse(message);
    const stringValue = parsedMessage.value;
    const [value1, value2, value3] = stringValue.split('-').map(Number);
    //La lib js usata per scrivere sul sense-hat nel caso in cui rgb16 non rispetta il formato ritorna 0-0-0
    sense.sync.clear(value1, value2, value3);
});


function done() {
    console.log("finished message");
}


setTimeout(() => {
    done();
    client.end();
    process.exit();
}, 600000);
