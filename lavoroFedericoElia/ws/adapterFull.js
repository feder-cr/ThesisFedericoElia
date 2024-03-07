#!/bin/env node
/* eslint-disable no-param-reassign,no-bitwise */
const { stdin } = require('process');
const readline = require('readline');
const { WebSocket } = require('ws');
const mqtt = require('mqtt-packet');
const winston = require('winston');
const { MqttFormatJSONConversionEx, MqttFormatJSONtoRBG24Ex, MqttFormatRGB24toRBG16Ex } = require('./MqttFormatException');

const MQTTMessageJSON = {};
const opts = { protocolVersion: 4 };
const parser = mqtt.parser(opts);
let TCPMessage;
const byLine = readline.createInterface(stdin);
const ws = new WebSocket('ws://192.168.1.51:8810/');
// const ws = new WebSocket('ws://localhost:8080/');

const logger = winston.createLogger({
    level: 'error',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'log/lightErrorLog.json' }),
    ],
});

function hexToRGB16(rgb565)
{
    const red5 = rgb565 >>> 11;
    const green6 = (rgb565 >>> 5) & 0b111111;
    const blue5 = rgb565 & 0b11111;
    return { red: red5, green: green6, blue: blue5 };
}

function RGBInRGB16(red8, green8, blue8)
{
    const isValidIntegerInRange = /^(0|[1-9]\d?|1\d\d|2[0-4]\d|25[0-5])$/;
    if (!isValidIntegerInRange.test(red8)
        || !isValidIntegerInRange.test(green8)
        || !isValidIntegerInRange.test(blue8))
    {
        throw new MqttFormatJSONtoRBG24Ex("Input does not conform to the RGB24 format (red, green, or blue isn't an integer).");
    }
    const red5 = red8 >> 3;
    const green6 = green8 >> 2;
    const blue5 = blue8 >> 3;
    const rgb565 = (red5 << (6 + 5)) | (green6 << 5) | blue5;
    try
    {
        return hexToRGB16(rgb565);
    }
    catch (error)
    {
        throw new MqttFormatRGB24toRBG16Ex('Unable to convert from RGB24 to RGB16.');
    }
}

// decode base64 encoded buffer and parse mqtt packet
function decodeBase64TcpSyscalls(json)
{
    if ('evt.buffer' in json.output_fields && json.output_fields['evt.buffer'] != null)
    {
        parser.parse(atob(json.output_fields['evt.buffer']));
    }
    json.output_fields['evt.buffer'] = TCPMessage;
}

function decodeBase64SenseHat(json)
{
    const hexBuffer = Buffer.from(json.output_fields['evt.buffer'], 'base64').toString('hex');
    const decimalValue = hexBuffer.substring(2, 6);
    // eslint-disable-next-line radix
    json.output_fields['evt.buffer'] = hexToRGB16(parseInt(decimalValue, 16));
}

function sendFalcoEvent(json)
{
    if (json.rule === 'tcp_syscalls')
    { // rule for mqtt
        decodeBase64TcpSyscalls(json);
        json.output = undefined; // we don't need this
        if (MQTTMessageJSON.event === 'mqtt')
        {
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
            // non ci servono questi campi
            json.output = undefined;
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
        catch (error)
        { // questo significa che output di Falco non è JSON o altro...
            // MQTTMessageJSON.msg = error.message;
            //  ws.send(JSON.stringify(MQTTMessageJSON));
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
        logger.error(`Errore: ${error} - Messaggio ricevuto: ${event.data}`);
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
    if (packet.cmd === 'publish')
    {
        try
        {
            try
            {
                // qui converto in JSON solo il (evt.buffer).payload
                const colors = JSON.parse(packet.payload);
                packet.payload = RGBInRGB16(colors.red, colors.green, colors.blue);
                TCPMessage = packet;
                MQTTMessageJSON.event = 'mqtt';
            }
            catch (error)
            {
                throw new MqttFormatJSONConversionEx('Unable to convert from MQTT.payload to JSON.');
            }
        }
        catch (error)
        {
            if (error instanceof MqttFormatJSONtoRBG24Ex)
            {
                MQTTMessageJSON.event = 'error';
                MQTTMessageJSON.msg = 'Error in converting JSON to RGB24';
            }
            else if (error instanceof MqttFormatRGB24toRBG16Ex)
            {
                MQTTMessageJSON.event = 'error';
                MQTTMessageJSON.msg = 'Error in converting RGB24 to RGB16';
            }
            else if (error instanceof MqttFormatJSONConversionEx)
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
    }
    else
    {
        MQTTMessageJSON.event = 'notPublish';
    }
});
