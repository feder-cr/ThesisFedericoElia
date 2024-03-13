class UnSubscribe
{
    static parse(packet)
    {
        const myPacket = packet;
        let index = 0;
        myPacket.packetId = myPacket.buffer.readUInt16BE(index);
        index += 2;
        myPacket.topics = [];
        let topicLength;
        while (index < myPacket.buffer.length)
        {
            topicLength = myPacket.buffer.readUInt16BE(index);
            myPacket.topics.push(myPacket.buffer.slice(index + 2, index + 2 + topicLength)
                .toString());
            index += 2 + topicLength;
        }
        return myPacket;
    }
}

module.exports = UnSubscribe;
