const mqtt = require('mqtt-packet');
const mqttParser = require('./parse-mqttv5-packet');


// Identificatore di pacchetto: 0x0001
// Reason String: 0x1F seguito dalla lunghezza 0x0002 e da "OK" (0x4F4B in hex)
// Codice di ritorno: 0x00

const packet = {
  cmd: 'suback', // Il comando per SUBACK
  messageId: 123, // L'identificatore del messaggio che corrisponde all'ID nel pacchetto SUBSCRIBE
  properties: { // Proprietà MQTT v5 opzionali
    reasonString: 'Granted QoS 1', // Una stringa di motivo opzionale
    userProperties: {
      'exampleName': 'exampleValue' // Proprietà utente personalizzate
    }
  },
  // I codici di ritorno per ciascun topic sottoscritto, ad esempio: 0 per successo QoS 0, 1 per successo QoS 1, ecc.
  // Dovrebbero corrispondere ai topic nel pacchetto SUBSCRIBE originale
  granted: [0, 1, 2]
};

const buffer = mqtt.generate(packet);

// const packets = mqttParser.parse(Buffer.from('MCAADGRpc3BsYXlDb2xvcnsiY29sb3IiOiJjb2xvcmUifTAtAAxkaXNwbGF5Q29sb3J7InJlZCI6NjksImdyZWVuIjoxMSwiYmx1ZSI6OTJ9MDAADGRpc3BsYXlDb2xvcnsicmVkIjoyMDgsImdyZWVuIjoyMDksImJsdWUiOjEzMX0wFwAMZGlzcGxheUNvbG9yWzEsMiwzLDRdMC8ADGRpc3BsYXlDb2xvcnsicmVkIjo5NSwiZ3JlZW4iOjE4MiwiYmx1ZSI6MjQzfTARAAxkaXNwbGF5Q29sb3IxMDA', 'base64'));
const packets = mqttParser.parse(buffer);
packets.forEach((element) =>
{
    console.log(element);
});
