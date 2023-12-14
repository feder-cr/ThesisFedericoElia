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
    var randomValue = getRandomNumber(0, 255);
    var randomValue2 = getRandomNumber(0, 255);
    var randomValue3 = getRandomNumber(0, 255);
    client.publish(`${topic}/two`, `{"value": "${randomValue}-${randomValue2}-${randomValue3}"}`);
}

setInterval(pub,5000);

