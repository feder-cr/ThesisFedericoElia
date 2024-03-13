class Connect
{
    static parse(packet)
    {
        const myPacket = packet;
        let index = 0;

        // header
        const protocolNameLength = myPacket.buffer.readUInt16BE(0);
        myPacket.protocolName = myPacket.buffer.slice(2, index += 2 + protocolNameLength).toString();
        myPacket.protocolLevel = myPacket.buffer[index++];
        const b = myPacket.buffer[index++];
        myPacket.connectFlags = {
            username: b >> 7 & 0x01,
            password: b >> 6 & 0x01,
            willRetain: b >> 5 & 0x01,
            willQoS: (b >> 3 & 0x02) + (b >> 3 & 0x01),
            willFlag: b >> 2 & 0x01,
            cleanSession: b >> 1 & 0x01,
            reserved: b & 0x01,
        };
        if (myPacket.connectFlags.reserved) throw new Error('Connect flags reserved should be 0');

        myPacket.keepAlive = myPacket.buffer.readUInt16BE(index);
        index += 2;

        // payload
        const clientIdLength = myPacket.buffer.readUInt16BE(index);
        index += 2;
        if (!clientIdLength && !myPacket.connectFlags.cleanSession) throw new Error('ClientId\'s length is 0, but CleanSession is not 0');
        else
        {
            const buf = myPacket.buffer.slice(index, index += clientIdLength);
            myPacket.clientId = buf.toString();
        }

        if (myPacket.connectFlags.willFlag)
        {
            // will topic
            const willTopicLength = myPacket.buffer.readUInt16BE(index);
            index += 2;
            myPacket.willTopic = myPacket.buffer.slice(index, index += willTopicLength).toString();

            // will message
            const willMessageLength = myPacket.buffer.readUInt16BE(index);
            index += 2;
            myPacket.willMessage = myPacket.buffer.slice(index, index += willMessageLength).toString();
        }

        if (myPacket.connectFlags.username)
        {
            const userNameLength = myPacket.buffer.readUInt16BE(index);
            index += 2;
            myPacket.username = myPacket.buffer.slice(index, index += userNameLength).toString();
        }

        if (myPacket.connectFlags.password)
        {
            const passwordLength = myPacket.buffer.readUInt16BE(index);
            index += 2;
            myPacket.password = myPacket.buffer.slice(index, index += passwordLength).toString();
        }

        return myPacket;
    }
}

module.exports = Connect;
