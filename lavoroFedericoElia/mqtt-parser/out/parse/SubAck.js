class SubAck
{
    static parse(packet)
    {
        const myPacket = packet;
        let index = 0;
        myPacket.packetId = myPacket.buffer.readUInt16BE(index);
        index += 2;
        myPacket.codes = [].concat(...myPacket.buffer.slice(index));
        return myPacket;
    }
}

module.exports = SubAck;
