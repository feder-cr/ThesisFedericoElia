const WebSocket = require('ws');

const server = new WebSocket.Server({
    port: 8080,
});

const winston = require('winston');

const loggerTcpSyscalls = winston.createLogger({
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({
            filename: 'loggerTcpSyscalls.log',
        }),
    ],
    format: winston.format.simple(),
});

const loggerSenseHat = winston.createLogger({
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({
            filename: 'loggerSenseHat.log',
        }),
    ],
    format: winston.format.simple(),
});

server.on('connection', (socket) =>
{
    socket.on('message', (messageReceived) =>
    {
        const messageJSON = JSON.parse(messageReceived);
        // controllo se messageReceived è un errore oppure no
        if (messageJSON.event === 'error')
        {
            loggerTcpSyscalls.info(JSON.stringify(messageJSON));
            return;
        }
        const parsedmessageReceived = JSON.parse(JSON.stringify(messageJSON));
        if (parsedmessageReceived.msg.rule === 'tcp_syscalls' && parsedmessageReceived.msg.output_fields)
        {
            loggerTcpSyscalls.info(JSON.stringify(parsedmessageReceived));
        }
        else if (parsedmessageReceived.msg.rule === 'sense-hat' && parsedmessageReceived.msg.output_fields['evt.buffer'] != null)
        {
            loggerSenseHat.info(JSON.stringify(parsedmessageReceived));
        }
        else
        {
            // console.log('Errore: Il payload non rispetta il formato.');
        }
    });
});
