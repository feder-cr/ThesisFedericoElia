const WebSocket = require('ws');
const server = new WebSocket.Server({
  port: 8080
});


const winston = require('winston');


const logger_tcp_syscalls = winston.createLogger({
  transports: [
    new winston.transports.Console(),  
    new winston.transports.File({ filename: 'logger_tcp_syscalls.log' })
  ],
  format: winston.format.json()
});

const logger_sense_hat = winston.createLogger({
  transports: [
    new winston.transports.Console(),  
    new winston.transports.File({ filename: 'logger_sense_hat.log' })
  ],
  format: winston.format.json()
});

function convertiStringaInRGB565(inputJSON) {
    // Estrai il valore dalla chiave "value" nell'oggetto JSON
    const stringa = JSON.parse(inputJSON).value;

    // Estrai i valori R, G e B dalla stringa
    const match = stringa.match(/(\d+)-(\d+)-(\d+)/);

    if (!match) {
        throw new Error("Formato stringa non valido. Assicurati che sia nel formato 'R-G-B'");
    }

    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);

    // Converti i valori RGB nel formato RGB565
    const rgb565 = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);

    return rgb565;
}

server.on('connection', function(socket) {
  socket.on('message', function(msg) {
const parsedMsg = JSON.parse(msg.toString());
    if (
      parsedMsg.rule === "tcp_syscalls" &&
      parsedMsg.output_fields &&
      parsedMsg.output_fields["evt.buffer"] &&
      parsedMsg.output_fields["evt.buffer"][0] &&
      parsedMsg.output_fields["evt.buffer"][0].payload &&
      parsedMsg.output_fields["evt.buffer"][0].payload.data !== null
    ){
                const payloadArray = parsedMsg.output_fields["evt.buffer"][0].payload.data;
                // Converti l'array in una stringa
                const payloadString = String.fromCharCode(...payloadArray);
                // Verifica il formato del payload
                const regex = /^\{"value": "\d+-\d+-\d+"\}$/;
                if (regex.test(payloadString)) {
                   parsedMsg.output_fields["evt.buffer.format"]= "Correct";
                   parsedMsg.output_fields["evt.buffer.rgb565"]= convertiStringaInRGB565(payloadString).toString(16);
                }else {
                   parsedMsg.output_fields["evt.format"]= "Wrong"
                }
                logger_tcp_syscalls.info(parsedMsg);                            
  }else if(parsedMsg.rule === "sense-hat" && parsedMsg.output_fields["evt.buffer"] != null)
  {
    logger_sense_hat.info(parsedMsg);
  }else{
    //console.log("Errore: Il payload non rispetta il formato."); 
  }

  });
});