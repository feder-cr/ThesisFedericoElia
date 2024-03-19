#!/bin/env node
/* eslint-disable no-param-reassign,no-bitwise */
const { stdin } = require('process');
const readline = require('readline');
const { WebSocket } = require('ws');
const winston = require('winston');
const fifoMqttMessageJSON = require('fifo')();
const { MqttFormatJSONConversionEx, MqttFormatJSONtoRBG24Ex, MqttFormatRGB24toRBG16Ex } = require('./MqttFormatException');
const mqttParser = require('../parse-mqttv5-packet');

// Configure Winston logger to write to lightLog.json
const logger = winston.createLogger({
    level: 'error',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'log/fullErrorLog.json' }),
    ],
});

const byLine = readline.createInterface(stdin);
const ws = new WebSocket('ws://192.168.1.51:8810/');
// const ws = new WebSocket('ws://localhost:8080/');

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
function decodeTcpSyscallBase64(json)
{
    if ('evt.buffer' in json.output_fields)
    {
        const packets = mqttParser.parse(Buffer.from(json.output_fields['evt.buffer'], 'base64'));
        packets.forEach((packet) =>
        {
            const mqttMessageJSONtemp = {};
            // Crea una copia profonda di json per ogni iterazione
            const jsonCopy = JSON.parse(JSON.stringify(json));
            switch (packet.packetType)
            {
            case 3:
                try
                {
                    let colors;
                    try
                    {
                        // qui converto in JSON solo il (evt.buffer).payload
                        colors = JSON.parse(packet.payload);
                    }
                    catch (error)
                    {
                        throw new MqttFormatJSONConversionEx('Unable to convert from MQTT.payload to JSON.');
                    }
                    packet.payload = RGBInRGB16(colors.red, colors.green, colors.blue);
                    jsonCopy.output_fields['evt.buffer'] = packet;
                    jsonCopy.output = undefined; // Non necessario per questo esempio
                    jsonCopy.output_fields['evt.buffer'].flagOpt = undefined; // Non necessario per questo esempio
                    jsonCopy.output_fields['evt.buffer'].remainLength = undefined; // Non necessario per questo esempio
                    jsonCopy.output_fields['evt.buffer'].flags = undefined; // Non necessario per questo esempio
                    jsonCopy.output_fields['evt.buffer'].packetId = undefined; // Non necessario per questo esempio
                    mqttMessageJSONtemp.event = 'mqtt';
                    mqttMessageJSONtemp.msg = jsonCopy;
                }
                catch (error)
                {
                    if (error instanceof MqttFormatJSONtoRBG24Ex)
                    {
                        mqttMessageJSONtemp.event = 'error';
                        mqttMessageJSONtemp.msg = 'Error in converting JSON to RGB24';
                    }
                    else if (error instanceof MqttFormatRGB24toRBG16Ex)
                    {
                        mqttMessageJSONtemp.event = 'error';
                        mqttMessageJSONtemp.msg = 'Error in converting RGB24 to RGB16';
                    }
                    else if (error instanceof MqttFormatJSONConversionEx)
                    {
                        mqttMessageJSONtemp.event = 'error';
                        mqttMessageJSONtemp.msg = 'Error in converting MQTT.payload to JSON';
                    }
                    else
                    {
                        mqttMessageJSONtemp.event = 'error';
                        mqttMessageJSONtemp.msg = error.message;
                    }
                }
                break;
            default:
                jsonCopy.output_fields['evt.buffer'] = packet;
                jsonCopy.output = undefined; // Non necessario per questo esempio
                jsonCopy.output_fields['evt.buffer'].remainLength = undefined; // Non necessario per questo esempio
                jsonCopy.output_fields['evt.buffer'].flags = undefined; // Non necessario per questo esempio
                jsonCopy.output_fields['evt.buffer'].packetId = undefined; // Non necessario per questo esempio
                mqttMessageJSONtemp.event = 'mqtt';
                mqttMessageJSONtemp.msg = jsonCopy;
            }
            fifoMqttMessageJSON.push(mqttMessageJSONtemp);
        });
    }
}

function decodeSenseHatBase64(json)
{
    const hexBuffer = Buffer.from(json.output_fields['evt.buffer'], 'base64').toString('hex');
    const decimalValue = hexBuffer.substring(2, 6);
    const decimalNumber = parseInt(decimalValue, 16);
    json.output_fields['evt.buffer'] = hexToRGB16(decimalNumber);
}

function parseFalcoMessage(json)
{
    if (json.rule === 'tcp_syscalls')
    { // rule for mqtt
        decodeTcpSyscallBase64(json);
    }
    else if (json.rule === 'sense-hat')
    {
        const newDisplayMessage = { event: 'display', msg: null };
        decodeSenseHatBase64(json);
        json.output = undefined; // inutile per il nostro esempio
        json.output_fields['evt.args'] = undefined; // inutile per il nostro esempio
        newDisplayMessage.msg = json;
        let mqttMessage = fifoMqttMessageJSON.shift();

        if (mqttMessage.event === 'error' || (mqttMessage.msg && mqttMessage.msg.output_fields['evt.buffer'].packetType === 3))
        {
            // Gestisce il messaggio di errore o il messaggio MQTT di tipo 3
            ws.send(JSON.stringify(mqttMessage));
            ws.send(JSON.stringify(newDisplayMessage));
        }
        else
        {
            // Cerca il prossimo messaggio di tipo 3 o di error nella coda
            while (mqttMessage && mqttMessage.event !== 'error' && (!mqttMessage.msg || mqttMessage.msg.output_fields['evt.buffer'].packetType !== 3))
            {
                ws.send(JSON.stringify(mqttMessage));
                mqttMessage = fifoMqttMessageJSON.shift();
            }
            // Verifica e invia il messaggio di tipo 3 o di error trovato
            if (mqttMessage)
            {
                ws.send(JSON.stringify(mqttMessage));
                ws.send(JSON.stringify(newDisplayMessage));
            }
        }
    }
}

ws.on('open', () =>
{
    byLine.on('line', (line) =>
    {
        try
        {
            parseFalcoMessage(JSON.parse(line));
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
