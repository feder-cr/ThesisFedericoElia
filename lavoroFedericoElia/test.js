const mqttParser = require('./mqtt-parser');

const packets = mqttParser.parse(Buffer.from('MCAADGRpc3BsYXlDb2xvcnsiY29sb3IiOiJjb2xvcmUifTAtAAxkaXNwbGF5Q29sb3J7InJlZCI6NjksImdyZWVuIjoxMSwiYmx1ZSI6OTJ9MDAADGRpc3BsYXlDb2xvcnsicmVkIjoyMDgsImdyZWVuIjoyMDksImJsdWUiOjEzMX0wFwAMZGlzcGxheUNvbG9yWzEsMiwzLDRdMC8ADGRpc3BsYXlDb2xvcnsicmVkIjo5NSwiZ3JlZW4iOjE4MiwiYmx1ZSI6MjQzfTARAAxkaXNwbGF5Q29sb3IxMDA', 'base64'));

packets.forEach(element => {
    console.log(element)
});