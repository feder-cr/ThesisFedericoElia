const WebSocket = require('ws');
const server = new WebSocket.Server({
  port: 8080
});
console.log("start")
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
  socket.on('message', function(messageReceived) {
    messageJSON = JSON.parse(messageReceived);
    //controllo se messageReceived è un errore oppure no
    if(messageJSON.event == 'error')
    {
      logger_tcp_syscalls.info(messageJSON.msg.toString()); 
      return
    }

    const parsedmessageReceived = JSON.parse(JSON.stringify(messageJSON.msg));
    if(parsedmessageReceived.rule === "tcp_syscalls" && parsedmessageReceived.output_fields && parsedmessageReceived.output_fields["evt.buffer"])
    {
      logger_tcp_syscalls.info(parsedmessageReceived);                            
    }
    else if(parsedmessageReceived.rule === "sense-hat" && parsedmessageReceived.output_fields["evt.buffer"] != null)
    {
      logger_sense_hat.info(parsedmessageReceived);
    }else{
      //console.log("Errore: Il payload non rispetta il formato."); 
      console.log(parsedmessageReceived.output_fields["evt.buffer"])
    }
  });
});