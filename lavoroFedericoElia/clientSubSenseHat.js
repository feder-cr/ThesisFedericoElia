'use strict';

const { connect } = require('mqtt');
const sense = require("sense-hat-led");

const topic = 'main/client1';
const settings = {
    port: 1883
};


const client = connect('mqtt://192.168.1.51', settings);
client.subscribe(`displayColor`);


client.on('message', (receivedTopic, message) => {
    console.log(`${receivedTopic} ${message}`);
    try {
        const parsedMessage = JSON.parse(message);
        const {red, green, blue} = parsedMessage;   
        // La libreria js usata per scrivere sul sense-hat nel caso in cui rgb16 non rispetta il formato ritorna 0-0-0
        sense.sync.clear(red, green, blue);    
    } catch (error) {
        
    }
});


function done() {
    console.log("finished message");
}


setTimeout(() => {
    done();
    client.end();
    process.exit();
}, 600000);
