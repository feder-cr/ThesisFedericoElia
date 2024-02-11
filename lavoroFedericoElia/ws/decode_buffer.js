#!/bin/env node
const { stdin } = require("process")
const readline = require("readline")
const { WebSocket } = require("ws")
const mqtt = require('mqtt-packet');
const { error } = require("console");
const {mqttFormatJSONConversionException,mqttFormatJSONtoRBG24Exception,mqttFormatRGB24toRBG16Exception} = require('./mqttFormatException');


ErrorMessageJSON = {event: 'error',};
const opts = { protocolVersion: 4 }; // default is 4. Usually, opts is a connect packet
const parser = mqtt.parser(opts);
let TCPMessage
const byLine = readline.createInterface(stdin)
const ws = new WebSocket("ws://localhost:8080/")
// const ws = new WebSocket("ws://druidlab.dibris.unige.it:8080")

function RGBInRGB565(red, green, blue) {
    const isValidIntegerInRange = /^(0|[1-9]\d?|1\d\d|2[0-4]\d|25[0-5])$/;

	if (!isValidIntegerInRange.test(red) || !isValidIntegerInRange.test(green) || !isValidIntegerInRange.test(blue)) {
		throw new mqttFormatJSONtoRBG24Exception("Input does not conform to the RGB24 format (red, green, or blue isn't an integer).");
	}
	const rgb565 = ((red & 0xF8) << 8) | ((green & 0xFC) << 3) | (blue >> 3);
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
function decode_base64_tcp_syscalls(json) {
	if ("evt.buffer" in json.output_fields && json.output_fields['evt.buffer'] != null)		  
		{
			parser.parse(atob(json.output_fields['evt.buffer']))
		}
        json.output_fields['evt.buffer'] = TCPMessage;			
	}

	function decode_base64_sense_hat(json) {
			const hexBuffer = Buffer.from(json.output_fields['evt.buffer'], 'base64').toString('hex');
			const decimalValue = hexBuffer.substring(2, 6);
			json.output_fields['evt.buffer'] = hexToRGB16(decimalValue);
	}

function send_falco_event(ws, json) {
	messageJSON = {};
	if (json.rule === "tcp_syscalls") { // rule for mqtt
		messageJSON.event  = 'mqtt' 
		if (json.output_fields['evt.type'] === "close")
			removeParser(json)
		else if (json.output_fields['evt.type'] === "read") {
			decode_base64_tcp_syscalls(json)
			// TODO: we may want to avoid sending the data if there are no packets...
			json.output = undefined // we don't need this
			json.output_fields["evt.args"] = undefined
			messageJSON.msg = json
			ws.send(JSON.stringify(messageJSON))
		}
	} else if(json.rule === "sense-hat") {
		messageJSON.event  = 'display'
		if (json.output_fields['evt.type'] === "pwrite") 
		{
			decode_base64_sense_hat(json)
			// TODO: we may want to avoid sending the data if there are no packets...
			json.output = undefined // we don't need this
			json.output_fields["evt.args"] = undefined
			//ws.send(JSON.stringify(json))
			messageJSON.msg = json
			ws.send(JSON.stringify(messageJSON))
		}
	}
}

ws.on("open", () => {
	console.log("ws connection open")
	byLine.on("line", line => {
		try{
			json = JSON.parse(line)
			send_falco_event(ws, json)		
		}catch(error)
		{//questo significa che output di Falco non è JSON o altro...
			ErrorMessageJSON.msg = error.message;
			ws.send(JSON.stringify(ErrorMessageJSON))
			//console.log(error)
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

		try {
			//qui converto in JSON solo il payload
			colors = JSON.parse(packet.payload);
		}catch (error){
			throw new mqttFormatJSONConversionException("Unable to convert from MQTT.payload to JSON.");
		}

		packet.payload = RGBInRGB565(colors.red, colors.green, colors.green);
		TCPMessage = packet
	} catch (error) {
		if (error instanceof mqttFormatJSONtoRBG24Exception) {
			ErrorMessageJSON.msg = 'Error in converting JSON to RGB24';
		} else if (error instanceof mqttFormatRGB24toRBG16Exception) {
			ErrorMessageJSON.msg = 'Error in converting RGB24 to RGB16';
		} else if (error instanceof mqttFormatJSONConversionException) {
			ErrorMessageJSON.msg = 'Error in converting MQTT.payload to JSON';
		} else {
			ErrorMessageJSON.msg = error.message;
			//console.log(error)
		}
		ws.send(JSON.stringify(ErrorMessageJSON))
		TCPMessage = null
	}
  })