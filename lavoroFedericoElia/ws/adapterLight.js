#!/bin/env node
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-undef */
/* eslint-disable no-param-reassign,no-bitwise */
const { stdin } = require('process');
const readline = require('readline');
const { WebSocket } = require('ws');
const winston = require('winston');
const fifoMqttMessageJSON = require('fifo')();
const { MqttFormatJSONConversionEx } = require('./MqttFormatException');
const mqttParser = require('../parse-mqttv5-packet');
// Configure Winston logger to write to lightLog.json
const logger = winston.createLogger({
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'log/lightErrorLog.json' }),
    ],
});

const byLine = readline.createInterface(stdin);
// const ws = new WebSocket('ws://192.168.1.51:8810/');
const ws = new WebSocket('ws://localhost:8080/');

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
        const packets = mqttParser.parse(Buffer.from(json.output_fields['evt.buffer'], 'base64'));
        packets.forEach((packet) =>
        {
            try
            {
                try
                {
                    const mqttMessageJSONtemp = {};
                    // Crea una copia profonda di json per ogni iterazione
                    const jsonCopy = JSON.parse(JSON.stringify(json));

                    switch (packet.packetType)
                    {
                    case 2:
                        jsonCopy.output_fields['evt.buffer'] = packet;
                        jsonCopy.output = undefined; // Non necessario per questo esempio
                        jsonCopy.output_fields['evt.buffer'].connackAcknowledgeFlags = undefined; // Non necessario per questo esempio
                        jsonCopy.output_fields['evt.buffer'].remainLength = undefined; // Non necessario per questo esempio
                        jsonCopy.output_fields['evt.buffer'].flags = undefined; // Non necessario per questo esempio
                        jsonCopy.output_fields['evt.buffer'].connectReturnCode = undefined; // Non necessario per questo esempio
                        mqttMessageJSONtemp.event = 'mqtt';
                        mqttMessageJSONtemp.msg = jsonCopy;
                        break;
                    case 3:
                        packet.payload = JSON.parse(packet.payload);
                        jsonCopy.output_fields['evt.buffer'] = packet;
                        jsonCopy.output = undefined; // Non necessario per questo esempio
                        jsonCopy.output_fields['evt.buffer'].flagOpt = undefined; // Non necessario per questo esempio
                        jsonCopy.output_fields['evt.buffer'].remainLength = undefined; // Non necessario per questo esempio
                        jsonCopy.output_fields['evt.buffer'].flags = undefined; // Non necessario per questo esempio
                        jsonCopy.output_fields['evt.buffer'].packetId = undefined; // Non necessario per questo esempio
                        mqttMessageJSONtemp.event = 'mqtt';
                        mqttMessageJSONtemp.msg = jsonCopy;
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
                }
                catch (error)
                {
                    throw new MqttFormatJSONConversionEx('Impossibile convertire da MQTT.payload a JSON.');
                }
            }
            catch (error)
            {
                const mqttMessageJSONtemp = {};
                if (error instanceof MqttFormatJSONConversionEx)
                {
                    mqttMessageJSONtemp.event = 'error';
                    mqttMessageJSONtemp.msg = 'Error in converting MQTT.payload to JSON';
                }
                else
                {
                    mqttMessageJSONtemp.event = 'error';
                    mqttMessageJSONtemp.msg = error.message;
                }
                ws.send(JSON.stringify(mqttMessageJSONtemp));
            }
        });
    }
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
    if (json.rule === 'tcp_syscalls')
    {
        decodeBase64TcpSyscalls(json);
    }
    else if (json.rule === 'sense-hat')
    {
        const newDisplayMessage = {
            event: 'display',
            msg: null,
        };

        decodeBase64SenseHat(json);
        json.output = undefined; // inutile per il nostro esempio
        json.output_fields['evt.args'] = undefined; // inutile per il nostro esempio
        newDisplayMessage.msg = json;

        mqttMessage = fifoMqttMessageJSON.shift();
        if (mqttMessage.msg.output_fields['evt.buffer'].packetType === 3)
        {
            ws.send(JSON.stringify(mqttMessage));
            ws.send(JSON.stringify(newDisplayMessage));
        }
        else
        {
            while (mqttMessage.msg.output_fields['evt.buffer'].packetType !== 3)
            {
                ws.send(JSON.stringify(mqttMessage));
                mqttMessage = fifoMqttMessageJSON.shift();
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
            sendFalcoEvent(JSON.parse(line));
        }
        catch (errorEx)
        {
            // questo significa che output di Falco non è JSON o altro...
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
        logger.error(`Il messaggio non rispetta le specifiche, spegnimento automatico per ragioni di sicurezza: ${error} - Messaggio ricevuto: ${event.data}`);
        // process.exit();
    }
    else
    {
        logger.info(`Il messaggio rispetta le specifiche, messaggio ricevuto: ${event.data}`);
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
