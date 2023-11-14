#!/bin/env node
const { stdin } = require("process")
const readline = require("readline")
const { WebSocket } = require("ws")

const byLine = readline.createInterface(stdin)
const ws = new WebSocket("ws://localhost:8080/")
var tool = ""

process.argv.forEach(function(val, index, array) {
	tool = val
});

// from tetragon take pid, kprobe and args
function adapt_tetragon(json) {
	return {
		"pid": json?.process_kprobe?.process.pid,
		"kprobe": json?.process_kprobe?.function_name,
		"args": json?.process_kprobe?.args?.map(o => Object.values(o)[0]),
	}
}

function adapt_falco(json) {
	return {
		"hostname": json?.hostname,
		"rule": json?.rule,
		"args": json?.output_fields.map(o => Object.values(o)[0]),
	}
}

function send_tetragon_event(ws, json) {
	if ("process_kprobe" in json)
		ws.send(JSON.stringify(adapt_tetragon(json)))
}

function send_falco_event(ws, json) {
	if ("evt.buffer" in json.output_fields)
		json.output_fields["evt.buffer"] = Buffer.from(json.output_fields["evt.buffer"], "base64").toString("utf-8")
	ws.send(JSON.stringify(json))
}

ws.on("open", () => {
	byLine.on("line", line => {
		const json = JSON.parse(line)
		console.log(json)
		if (tool == "tetragon") {
			send_tetragon_event(ws, json)
		} else if (tool == "falco") {
			send_falco_event(ws, json)
		}

	})
})

ws.on("message", msg => {
	console.log(msg)
})

ws.on("close", () => {
	process.exit()
})

