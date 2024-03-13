Object.defineProperty(exports, '__esModule', { value: true });
const { extractPacketType, extractFlags, extractRemainLength } = require('./util');
const Parse = require('./parse');

// Definizione della funzione buildPacket che costruisce il pacchetto MQTT
function buildPacket(remainLengthSingleMessage, slicedBuffer)
{
    // Creazione dell'oggetto pacchetto con le informazioni di base
    const packet = {
        packetType: extractPacketType(slicedBuffer[0]),
        flags: extractFlags(slicedBuffer[0]),
        remainLength: remainLengthSingleMessage,
        buffer: slicedBuffer,
    };
    // Switch per determinare il tipo di pacchetto e chiamare la funzione di parsing corrispondente
    switch (packet.packetType)
    {
    case 1: // PacketType.CONNECT
        return Parse.Connect.parse(packet);
    case 2: // PacketType.CONNACK
        return Parse.ConnAck.parse(packet);
    case 3: // PacketType.PUBLISH
        return Parse.Publish.parse(packet);
    case 4: // PacketType.PUBACK
        return Parse.PubAck.parse(packet);
    case 5: // PacketType.PUBREC
        return Parse.PubRec.parse(packet);
    case 8: // PacketType.SUBSCRIBE
        return Parse.Subscribe.parse(packet);
    case 9: // PacketType.SUBACK
        return Parse.SubAck.parse(packet);
    case 10: // PacketType.UNSUBSCRIBE
        return Parse.UnSubscribe.parse(packet);
    case 11: // PacketType.UNSUBACK
        return Parse.UnSubAck.parse(packet);
    case 12: // PacketType.PINGREQ
        return packet;
    case 13: // PacketType.PINGRESP
        return packet;
    case 14: // PacketType.DISCONNECT
        return packet;
    default:
        return packet;
    }
}

// Definizione della funzione parse che analizza un buffer che potrebbe contenere più pacchetti MQTT
function parse(buffer)
{
    let i = 0; // Indice utilizzato per scorrere il buffer
    const packets = []; // Array per conservare i pacchetti estratti
    // Ciclo che continua fino a quando non viene analizzato l'intero buffer
    while (i < buffer.length)
    {
        // Estrazione della lunghezza rimanente e dell'indice del prossimo byte da leggere
        const { remainLengthSingleMessage, nextIndex } = extractRemainLength(buffer.slice(i));
        // Creazione di un buffer "tagliato" che contiene solo i dati del pacchetto corrente
        const slicedBuffer = buffer.slice(i + nextIndex, i + nextIndex + remainLengthSingleMessage);
        // Costruzione del pacchetto e aggiunta all'array dei pacchetti
        const packet = buildPacket(remainLengthSingleMessage, slicedBuffer);
        packets.push(packet);
        // Aggiornamento dell'indice per passare al successivo messaggio nel buffer
        i += nextIndex + remainLengthSingleMessage;
    }
    return packets; // Ritorno dell'array contenente tutti i pacchetti estratti
}

exports.parse = parse;
