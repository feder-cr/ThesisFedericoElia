const WebSocket = require('ws');
const server = new WebSocket.Server({
  port: 8080
});
console.log("start")
const winston = require('winston');


const logger_tcp_syscalls = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: 'logger_tcp_syscalls.log'
    })
  ],
  format: winston.format.simple(),
});

const logger_sense_hat = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: 'logger_sense_hat.log'
    })
  ],
  format: winston.format.simple(),
});


server.on('connection', function(socket) {
  socket.on('message', function(messageReceived) {
    messageJSON = JSON.parse(messageReceived);
    //controllo se messageReceived è un errore oppure no
    if(messageJSON.event == 'error')
    {
      logger_tcp_syscalls.info(JSON.stringify(messageJSON)); 
      return
    }

    const parsedmessageReceived = JSON.parse(JSON.stringify(messageJSON));
    if(parsedmessageReceived.msg.rule === "tcp_syscalls" && parsedmessageReceived.msg.output_fields && parsedmessageReceived.msg.output_fields["evt.buffer"])
    {
      logger_tcp_syscalls.info(JSON.stringify(parsedmessageReceived));                            
    }
    else if(parsedmessageReceived.msg.rule === "sense-hat" && parsedmessageReceived.msg.output_fields["evt.buffer"] != null)
    {
      logger_sense_hat.info(JSON.stringify(parsedmessageReceived));
    }else{
      console.log("Errore: Il payload non rispetta il formato."); 
    }
  });
});