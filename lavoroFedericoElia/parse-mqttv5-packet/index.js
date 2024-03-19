const { extractPacketType, extractFlags, extractRemainLength } = require('./util');
const Parse = require('./parse');

// Definizione della funzione buildPacket che costruisce il pacchetto MQTT
function buildPacket(packetType, flags, remainLength, slicedBuffer)
{
    // Creazione dell'oggetto pacchetto con le informazioni di base
    const packet = {
        packetType,
        flags,
        remainLength,
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
    case 6: // PacketType.PUBCOMP
        return Parse.PubRel.parse(packet);
    case 7: // PacketType.PUBREL
        return Parse.PubComp.parse(packet);
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
    let index = 0; // Indice utilizzato per scorrere il buffer
    const packets = []; // Array per conservare i pacchetti estratti

    // Ciclo che continua fino a quando non viene analizzato l'intero buffer
    while (index < buffer.length)
    {
        // Estrazione della lunghezza rimanente e dell'indice del prossimo byte da leggere
        const { remainLength, nextIndex } = extractRemainLength(buffer.slice(index));
        // Estrazione del tipo di pacchetto e delle flag
        const packetType = extractPacketType(buffer[index]);
        const flags = extractFlags(buffer[index]);
        // Creazione di un buffer "tagliato" che contiene solo i dati del pacchetto corrente
        const slicedBuffer = buffer.slice(index + nextIndex, index + nextIndex + remainLength);
        // Costruzione del pacchetto e aggiunta all'array dei pacchetti
        const packet = buildPacket(packetType, flags, remainLength, slicedBuffer);
        packets.push(packet);
        // Aggiornamento dell'indice per passare al successivo pacchetto nel buffer
        index += nextIndex + remainLength;
    }

    return packets; // Ritorno dell'array contenente tutti i pacchetti estratti
}

exports.parse = parse;
