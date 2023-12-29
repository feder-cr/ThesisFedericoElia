#!/bin/env node
const { stdin } = require("process")
const readline = require("readline")
const { WebSocket } = require("ws")
const mqtt = require('mqtt-packet');
const { error } = require("console");
const {mqttFormatJSONtoRBG24Exception,mqttFormatRGB24toRBG16Exception} = require('./mqttFormatException');



const opts = { protocolVersion: 4 }; // default is 4. Usually, opts is a connect packet
const parser = mqtt.parser(opts);
let TCPMessage
const byLine = readline.createInterface(stdin)
const ws = new WebSocket("ws://localhost:8080/")
// const ws = new WebSocket("ws://druidlab.dibris.unige.it:8080")

function RGBInRGB565(value) 
{
		const match = value.match(/^([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])-([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])-([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/);
		if (!match) 
		{
			throw new mqttFormatJSONtoRBG24Exception("Input does not conform to the RGB24 format.");
		}
		const r = parseInt(match[1]);
		const g = parseInt(match[2]);
		const b = parseInt(match[3]);
		const rgb565 = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
	try
	{
		return hexToRGB16(rgb565.toString(16));
	}catch (error) {
		throw new mqttFormatRGB24toRBG16Exception("Unable to convert from RGB24 to RGB16.");
	}
}

function hexToRGB16(hexValue) 
{
    const intValue = parseInt(hexValue, 16);
    let binaryString = intValue.toString(2);
	while (binaryString.length < 16) 
	{
		binaryString = '0' + binaryString;
	}
    const binaryRed = binaryString.substring(0, 5);
    const intRed = parseInt(binaryRed, 2);
	const binaryGreen = binaryString.substring(5, 11);
    const intGreen = parseInt(binaryGreen, 2);
	const binaryBlue = binaryString.substring(11, 16);
    const intBlue = parseInt(binaryBlue, 2);
    return {r: intRed,g: intGreen,b: intBlue};
}

// decode base64 encoded buffer and parse mqtt packet
function decode_base64(json) {
	if (json.rule === "tcp_syscalls") { // rule for mqtt
		if ("evt.buffer" in json.output_fields && json.output_fields['evt.buffer'] != null)		  
		{
			parser.parse(atob(json.output_fields['evt.buffer']))
		}
        json.output_fields['evt.buffer'] = TCPMessage;			
	} else if(json.rule === "sense-hat") {
		const hexBuffer = Buffer.from(json.output_fields['evt.buffer'], 'base64').toString('hex');
		const decimalValue = hexBuffer.substring(2, 6);
        json.output_fields['evt.buffer'] = hexToRGB16(decimalValue);
    }
}

function send_falco_event(ws, json) {
	if (json.rule === "tcp_syscalls") { // rule for mqtt
		if (json.output_fields['evt.type'] === "close")
			removeParser(json)
		else if (json.output_fields['evt.type'] === "read") {
			decode_base64(json)
			// TODO: we may want to avoid sending the data if there are no packets...
			json.output = undefined // we don't need this
			json.output_fields["evt.args"] = undefined
			ws.send(JSON.stringify(json))
		}
	} else if(json.rule === "sense-hat") {
		if (json.output_fields['evt.type'] === "pwrite") 
		{
			decode_base64(json)
			// TODO: we may want to avoid sending the data if there are no packets...
			json.output = undefined // we don't need this
			json.output_fields["evt.args"] = undefined
			ws.send(JSON.stringify(json))
		}
	}
}

ws.on("open", () => {
	console.log("ws connection open")
	byLine.on("line", line => {
		//console.log(line)
		//qui converto in JSON tutto il messaggio falco ma non il buffer(perk è ancora in base64)
		try{
			const json = JSON.parse(line)
			send_falco_event(ws, json)
		}catch(error)
		{

		}
	})
})

ws.on("message", msg => {
	//const json = JSON.parse(msg)
	//console.log(JSON.stringify(json))
})

ws.on("error", error => {
	//console.error(`[decode_buffer.js] ${error.msg}`)
})

ws.on("close", () => {
	process.exit()
})

parser.on('packet', packet => {
	try {
		//qui converto in JSON solo il buffer
		value = (JSON.parse(packet.payload).value);
		packet.payload = RGBInRGB565(value);
		TCPMessage = packet

	} catch (error) {
		if (error instanceof mqttFormatJSONtoRBG24Exception) {
			console.log("Errore nella conversione JSON to RGB24:")
		}
		else if (error instanceof mqttFormatRGB24toRBG16Exception) {
			console.log("Errore nella conversione RGB24 to RGB16:")
		}else{
			console.log(error)
		}
		TCPMessage = null
	}
	
  })






