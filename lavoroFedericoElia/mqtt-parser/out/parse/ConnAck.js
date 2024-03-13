class ConnAck
{
    static parse(packet)
    {
        const myPacket = packet;
        let index = 0;
        myPacket.connackAcknowledgeFlags = myPacket.buffer[index++];
        if (myPacket.connackAcknowledgeFlags > 1)
        {
            throw new Error('"Connect Acknowledge Flags" Bits 7-1 are reserved and MUST be set to 0.');
        }
        myPacket.connectReturnCode = myPacket.buffer[index++];
        if (myPacket.connectReturnCode > 5)
        {
            throw new Error('Reserved connect return code.');
        }
        if (myPacket.buffer.length > index)
        {
            throw new Error('The CONNACK Packet has no payload.');
        }
        return myPacket;
    }
}

module.exports = ConnAck;
