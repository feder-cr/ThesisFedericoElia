class Publish
{
    static parse(packet)
    {
        const myPacket = packet;
        let index = 0;
        // Estrai il topic name (lunghezza + contenuto)
        const topicLength = (myPacket.buffer[index++] << 8) | myPacket.buffer[index++];
        const topic = packet.buffer.slice(index, index + topicLength).toString('utf8');
        index += topicLength;

        // Packet Identifier è presente solo se QoS > 0
        if ((myPacket.flags >> 1) & 3)
        { // Controllo i bit di QoS
            myPacket.packetIdentifier = (myPacket.buffer[index++] << 8) | myPacket.buffer[index++];
        }

        // Il payload è ciò che resta dopo l'header variabile
        const payload = packet.buffer.slice(index);

        // Aggiungi i campi topic e payload all'oggetto packet esistente
        myPacket.topic = topic;
        myPacket.payload = payload.toString();
        delete myPacket.buffer;
        return myPacket;
    }
}

module.exports = Publish;
