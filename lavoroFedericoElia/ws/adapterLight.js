#!/bin/env node
/* eslint-disable no-param-reassign,no-bitwise */
const { stdin } = require('process');
const readline = require('readline');
const { WebSocket } = require('ws');
const mqtt = require('mqtt-packet');
const { MqttFormatJSONConversionEx } = require('./MqttFormatException');

const opts = { protocolVersion: 4 }; // default is 4. Usually, opts is a connect packet
const parser = mqtt.parser(opts);
const byLine = readline.createInterface(stdin);
// const ws = new WebSocket('ws://192.168.1.51:8810/');
const ws = new WebSocket('ws://localhost:8080/');
const MQTTMessageJSON = {};
let TCPMessage;

function hexToRGB16(rgb565)
{
    const red5 = rgb565 >>> 11;
    const green6 = (rgb565 >>> 5) & 0b111111;
    const blue5 = rgb565 & 0b11111;
    return { red: red5, green: green6, blue: blue5 };
}

// decode base64 encoded buffer and parse mqtt packet
function decodeBase64TcpSyscalls(json)
{
    if ('evt.buffer' in json.output_fields)
    {
        parser.parse(atob(json.output_fields['evt.buffer']));
    }
    json.output_fields['evt.buffer'] = TCPMessage;
}

function decodeBase64SenseHat(json)
{
    const hexBuffer = Buffer.from(json.output_fields['evt.buffer'], 'base64').toString('hex');
    const decimalValue = hexBuffer.substring(2, 6);
    const decimalNumber = parseInt(decimalValue, 16);
    json.output_fields['evt.buffer'] = hexToRGB16(decimalNumber);
}

function sendFalcoEvent(json)
{
    if (json.rule === 'tcp_syscalls' && json.msg.output_fields['evt.buffer'].cmd === 'publish')
    {
        decodeBase64TcpSyscalls(json);
        json.output = undefined; // we don't need this
        if (MQTTMessageJSON.event !== 'error')
        {
            MQTTMessageJSON.event = 'mqtt';
            MQTTMessageJSON.msg = json;
            ws.send(JSON.stringify(MQTTMessageJSON));
        }
    }
    else if (json.rule === 'sense-hat')
    {
        MQTTMessageJSON.event = 'display';
        if (json.output_fields['evt.type'] === 'pwrite')
        {
            decodeBase64SenseHat(json);
            json.output = undefined; // we don't need this
            json.output_fields['evt.args'] = undefined;
            MQTTMessageJSON.msg = json;
            ws.send(JSON.stringify(MQTTMessageJSON));
        }
    }
}

ws.on('open', () =>
{
    byLine.on('line', (line) =>
    {
        try
        {
            sendFalcoEvent(JSON.parse(line));
        }
        catch (errorEx)
        { // questo significa che output di Falco non è JSON o altro...
            MQTTMessageJSON.msg = errorEx.message;
            ws.send(JSON.stringify(MQTTMessageJSON));
        }
    });
});

function readErrorFromResponse(jsonResponse)
{
    try
    {
        const responseObj = JSON.parse(jsonResponse);
        if ('error' in responseObj)
        {
            return responseObj.error;
        }
        return 'La chiave "error" non è presente nella risposta JSON.';
    }
    catch (e)
    {
        return `Errore durante il parsing JSON: ${e.message}`;
    }
}

ws.onmessage = function (event)
{
    const error = readErrorFromResponse(event.data);
    if (error !== false)
    {
        console.log('Errore dal server:', error);
        console.log('Messaggio ricevuto:', event.data);
    }
    else
    {
        // console.log("Messaggio ricevuto senza errori:");
        // Continua l'elaborazione del messaggio qui
    }
};

ws.on('error', () =>
{
    // console.error(`[adapterLigh.js] ${error.msg}`)
});

ws.on('close', () =>
{
    process.exit();
});

parser.on('packet', (packet) =>
{
    try
    {
        try
        {
            // converto in JSON solo il payload(che diventa da parse da arraydi ASCII a string)
            packet.payload = JSON.parse(packet.payload);
            TCPMessage = packet;
        }
        catch (error)
        {
            throw new MqttFormatJSONConversionEx('Unable to convert from MQTT.payload to JSON.');
        }
    }
    catch (error)
    {
        if (error instanceof MqttFormatJSONConversionEx)
        {
            MQTTMessageJSON.event = 'error';
            MQTTMessageJSON.msg = 'Error in converting MQTT.payload to JSON';
        }
        else
        {
            MQTTMessageJSON.event = 'error';
            MQTTMessageJSON.msg = error.message;
        }
        ws.send(JSON.stringify(MQTTMessageJSON));
        TCPMessage = null;
    }
});
