#!/bin/env node
const { stdin } = require("process")
const readline = require("readline")
const { WebSocket } = require("ws")
const mqtt = require('mqtt-packet');
const { error } = require("console");
const {mqttFormatJSONConversionException} = require('./mqttFormatException');

const opts = { protocolVersion: 4 }; // default is 4. Usually, opts is a connect packet
const parser = mqtt.parser(opts);
const byLine = readline.createInterface(stdin)
const ws = new WebSocket("ws://localhost:8080/") // const ws = new WebSocket("ws://druidlab.dibris.unige.it:8080")
MQTTMessageJSON = {event: 'mqtt',};
let TCPMessage

function hexToRGB16(rgb565)
{
    // Shift the red value to the right by 11 bits.
    var red5 = rgb565 >>> 11;
    // Shift the green value to the right by 5 bits and extract the lower 6 bits.
    var green6 = (rgb565 >>> 5) & 0b111111;
    // Extract the lower 5 bits.
    var blue5 = rgb565 & 0b11111;
    return {red: red5, green: green6, blue: blue5};
}


// decode base64 encoded buffer and parse mqtt packet
function decode_base64_tcp_syscalls(json) 
{
	if ("evt.buffer" in json.output_fields)		  
	{
		parser.parse(atob(json.output_fields['evt.buffer']))
	}
    json.output_fields['evt.buffer'] = TCPMessage;			
}

function decode_base64_sense_hat(json) 
{
		const hexBuffer = Buffer.from(json.output_fields['evt.buffer'], 'base64').toString('hex');
		const decimalValue = hexBuffer.substring(2, 6);
		var decimalNumber = parseInt(decimalValue, 16)
		json.output_fields['evt.buffer'] = hexToRGB16(decimalNumber);
}

function send_falco_event(ws, json) 
{
	if (json.rule === "tcp_syscalls") 
	{ 
		MQTTMessageJSON.event  = 'mqtt' 
		if (json.output_fields['evt.type'] === "close")
			removeParser(json)
		else if (json.output_fields['evt.type'] === "read") {
			decode_base64_tcp_syscalls(json)
			// TODO: we may want to avoid sending the data if there are no packets...
			json.output = undefined // we don't need this
			json.output_fields["evt.args"] = undefined
			MQTTMessageJSON.msg = json
			ws.send(JSON.stringify(MQTTMessageJSON))
		}
	} else if(json.rule === "sense-hat") {
		MQTTMessageJSON.event  = 'display'
		if (json.output_fields['evt.type'] === "pwrite") 
		{
			decode_base64_sense_hat(json)
			// TODO: we may want to avoid sending the data if there are no packets...
			json.output = undefined // we don't need this
			json.output_fields["evt.args"] = undefined
			MQTTMessageJSON.msg = json
			ws.send(JSON.stringify(MQTTMessageJSON))
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
			MQTTMessageJSON.msg = error.message;
			ws.send(JSON.stringify(MQTTMessageJSON))
			//console.log(error)
			console.log(error)
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
			//qui converto in JSON solo il payload(che viene trasformato da parse da array di ASCII a string)
			packet.payload = JSON.parse(packet.payload);
			//TODO deve rifiutare anche string e numerui	
			TCPMessage = packet
		}catch (error){
			throw new mqttFormatJSONConversionException("Unable to convert from MQTT.payload to JSON.");
		}
	} catch (error) {
		if (error instanceof mqttFormatJSONConversionException) 
		{
			MQTTMessageJSON.event = 'error'
			MQTTMessageJSON.msg = 'Error in converting MQTT.payload to JSON';
		} else {
			MQTTMessageJSON.event = 'error'
			MQTTMessageJSON.msg = error.message;
		}
		ws.send(JSON.stringify(MQTTMessageJSON))
		TCPMessage = null
	}
})