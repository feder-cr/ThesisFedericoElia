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


server.on('connection', function(socket) {
  socket.on('message', function(msg) {
    //controllo se msg è un errore oppure np
    if(msg.toString()=="mqtt_format_error")
    {
      const msgString = msg.toString();
      logger_tcp_syscalls.info(msgString); 
      logger_sense_hat.info(msgString);
      return
    }

    const parsedMsg = JSON.parse(msg.toString());
    if(parsedMsg.rule === "tcp_syscalls" && parsedMsg.output_fields && parsedMsg.output_fields["evt.buffer"])
    {
      logger_tcp_syscalls.info(parsedMsg);                            
    }
    else if(parsedMsg.rule === "sense-hat" && parsedMsg.output_fields["evt.buffer"] != null)
    {
      logger_sense_hat.info(parsedMsg);
    }else{
      //console.log("Errore: Il payload non rispetta il formato."); 
    }
  });
});