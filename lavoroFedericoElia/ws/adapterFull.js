#!/bin/env node
/* eslint-disable no-param-reassign,no-bitwise */
const { stdin } = require('process');
const readline = require('readline');
const { WebSocket } = require('ws');
const mqtt = require('mqtt-packet');
const { MqttFormatJSONConversionEx, MqttFormatJSONtoRBG24Ex, MqttFormatRGB24toRBG16Ex } = require('./MqttFormatException');

const ErrorMessageJSON = { event: 'error' };
const opts = { protocolVersion: 4 }; // default is 4. Usually, opts is a connect packet
const parser = mqtt.parser(opts);
let TCPMessage;
const byLine = readline.createInterface(stdin);
const ws = new WebSocket('ws://192.168.1.51:8810/');

function hexToRGB16(rgb565)
{
    // Shift the red value to the right by 11 bits.
    const red5 = rgb565 >>> 11;
    // Shift the green value to the right by 5 bits and extract the lower 6 bits.
    const green6 = (rgb565 >>> 5) & 0b111111;
    // Extract the lower 5 bits.
    const blue5 = rgb565 & 0b11111;
    return { r: red5, g: green6, b: blue5 };
}

function RGBInRGB16(red, green, blue)
{
    const isValidIntegerInRange = /^(0|[1-9]\d?|1\d\d|2[0-4]\d|25[0-5])$/;
    if (!isValidIntegerInRange.test(red)
        || !isValidIntegerInRange.test(green)
        || !isValidIntegerInRange.test(blue))
    {
        throw new MqttFormatJSONtoRBG24Ex("Input does not conform to the RGB24 format (red, green, or blue isn't an integer).");
    }
    const rgb565 = ((red & 0xF8) << 8) | ((green & 0xFC) << 3) | (blue >> 3);
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
    json.output_fields['evt.buffer'] = hexToRGB16(parseInt(decimalValue));
}

function sendFalcoEvent(json)
{
    const messageJSON = {};
    if (json.rule === 'tcp_syscalls')
    { // rule for mqtt
        messageJSON.event = 'mqtt';
        decodeBase64TcpSyscalls(json);
        // non ci servono questi campi
        json.output = undefined;
        messageJSON.msg = json;
        ws.send(JSON.stringify(messageJSON));
    }
    else if (json.rule === 'sense-hat')
    {
        messageJSON.event = 'display';
        if (json.output_fields['evt.type'] === 'pwrite')
        {
            decodeBase64SenseHat(json);
            // non ci servono questi campi
            json.output = undefined;
            json.output_fields['evt.args'] = undefined;
            messageJSON.msg = json;
            ws.send(JSON.stringify(messageJSON));
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
            ErrorMessageJSON.msg = error.message;
            ws.send(JSON.stringify(ErrorMessageJSON));
            // console.log(error)
        }
    });
});

ws.on('message', () =>
{
    // const json = JSON.parse(msg)
    // console.log(JSON.stringify(json))
});

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
            // qui converto in JSON solo il payload
            const colors = JSON.parse(packet.payload);
            packet.payload = RGBInRGB16(colors.red, colors.green, colors.green);
            TCPMessage = packet;
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
            ErrorMessageJSON.msg = 'Error in converting JSON to RGB24';
        }
        else if (error instanceof MqttFormatRGB24toRBG16Ex)
        {
            ErrorMessageJSON.msg = 'Error in converting RGB24 to RGB16';
        }
        else if (error instanceof MqttFormatJSONConversionEx)
        {
            ErrorMessageJSON.msg = 'Error in converting MQTT.payload to JSON';
        }
        else
        {
            ErrorMessageJSON.msg = error.message;
            // console.log(error)
        }
        ws.send(JSON.stringify(ErrorMessageJSON));
        TCPMessage = null;
    }
});
