#!/bin/env node
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign,no-bitwise */
const { stdin } = require('process');
const readline = require('readline');
const { WebSocket } = require('ws');
const winston = require('winston');
const fifoMqttMessageJSON = require('fifo')();
const { exec } = require('child_process');
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
const ws = new WebSocket('ws://192.168.1.51:8810/');
// const ws = new WebSocket('ws://localhost:8080/');

function hexToRGB16(rgb565)
{
    const red5 = rgb565 >>> 11;
    const green6 = (rgb565 >>> 5) & 0b111111;
    const blue5 = rgb565 & 0b11111;
    return { red: red5, green: green6, blue: blue5 };
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
            try
            {
                try
                {
                    // Crea una copia profonda di json per ogni iterazione
                    const jsonCopy = JSON.parse(JSON.stringify(json));

                    switch (packet.packetType)
                    {
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
                }
                catch (error)
                {
                    throw new MqttFormatJSONConversionEx('Impossibile convertire da MQTT.payload a JSON.');
                }
            }
            catch (error)
            {
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
    {
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
        const scriptName = 'clientSubSenseHat.js';
        exec(`pgrep -f ${scriptName}`, (err, stdout) =>
        {
            if (err)
            {
                logger.error(`Errore nella ricerca del processo: ${err}`);
                return;
            }
            const pids = stdout.split('\n').filter((pid) => pid);
            if (pids.length === 0)
            {
                logger.error('Nessun processo trovato con il nome specificato.');
                return;
            }
            logger.error(`Trovati ${pids.length} processi: ${pids.join(', ')}.`);
            pids.forEach((pid) =>
            {
                exec(`kill -9 ${pid}`, (killError) =>
                {
                    if (killError)
                    {
                        logger.error(`Errore nell'uccidere il processo ${pid}: ${killError}`);
                    }
                    else
                    {
                        logger.error(`Processo ${pid} terminato.`);
                    }
                });
            });
        });
        process.exit();
    }
};

ws.on('error', () =>
{
    // console.error(`[adapterLigh.js] ${error.msg}`)
});

ws.on('close', () =>
{
    //process.exit();
});
