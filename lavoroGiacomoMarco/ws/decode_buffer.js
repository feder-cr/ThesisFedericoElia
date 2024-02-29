#!/bin/env node
const { stdin } = require("process")
const readline = require("readline")
const { WebSocket } = require("ws")
const mqtt = require('mqtt-packet');
const { error } = require("console");
const opts = { protocolVersion: 4 }; // default is 4. Usually, opts is a connect packet
// const parser = mqtt.parser(opts);

const byLine = readline.createInterface(stdin)
const ws = new WebSocket("ws://localhost:8080/")
// const ws = new WebSocket("ws://druidlab.dibris.unige.it:8080")

// (pid,fd) -> mqtt-parser
const parserMap = new Map()

// decode base64 encoded buffer and parse mqtt packet
function decode_base64(json) {
	if ("evt.buffer" in json.output_fields && json.output_fields['evt.buffer'] != null) {
		const mapKey = json.output_fields["proc.pid"] << 32 + json.output_fields["fd.num"]

		let parser = parserMap.get(mapKey)
		if (parser === undefined) {
			console.error("creating new parser for ",
				json.output_fields["proc.pid"], json.output_fields["fd.num"])
			parser = mqtt.parser(opts)
			// TODO: closing of the file descriptor should be handled in order 
			// to avoid memory leaking and concatenating data from different connection
			parser.on('error', err => {
				console.error("failing to parse: ", err.message, json.output_fields["proc.pid"], json.output_fields["fd.num"])
			})

			parserMap.set(mapKey, parser)
		}

		let packets = []
		parser.on('packet', packet => {
			packets.push(packet)
		})


		parser.parse(Buffer.from(json.output_fields['evt.buffer'], 'base64'))

		parser.removeAllListeners('packet')

		// instead of sending an mqtt packet we send an array of packets
		// because multiple packets could be read in a single syscall.
		// a possible better approach would be to send data each time a complete mqtt
		// packet is parsed, possibly with some additional information got from the syscall
		// (for example timestamp of the last syscall)
		json.output_fields['evt.buffer'] = packets
	}
}

function removeParser(json) {
	if ("fd.num" in json.output_fields && json.output_fields['fd.num'] != null) {
		const mapKey = json.output_fields["proc.pid"] << 32 + json.output_fields["fd.num"]
		console.error("deleting parser for", json.output_fields["proc.pid"], json.output_fields["fd.num"])
		parserMap.delete(mapKey)
	}
}

function sendFalcoEvent(ws, json) {
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
	} else { // all the other rules (including sense-hat)
		ws.send(JSON.stringify(json))
	}
}

ws.on("open", () => {
	console.log("ws connection open")
	byLine.on("line", line => {
		const json = JSON.parse(line)
		sendFalcoEvent(ws, json)
	})
})


ws.on("message", msg => {
	const json = JSON.parse(msg)
	console.log(JSON.stringify(json))
})

ws.on("error", error => {
	console.error(`[decode_buffer.js] ${error.msg}`)
})

ws.on("close", () => {
	process.exit()
})

