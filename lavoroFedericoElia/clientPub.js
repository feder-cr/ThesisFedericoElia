'use strict';

const { connect } = require('mqtt');

const topic = 'main/client1';
const settings = {
    port: 1883
};

const client = connect('mqtt://192.168.1.51', settings);
client.subscribe(`${topic}/+`);


function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pub() {
    const randomValue = getRandomNumber(0, 255);
    client.publish(`${topic}/two`, `{"value": ${randomValue}}`);
}

setInterval(pub, 200);

