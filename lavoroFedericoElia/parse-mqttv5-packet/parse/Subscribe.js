const { decodeVariableByteInteger } = require('./util');

class Subscribe
{
    static parse(packet)
    {
        const myPacket = { ...packet };
        let index = 0;

        // Packet Identifier
        myPacket.packetId = myPacket.buffer.readUInt16BE(index);
        index += 2;

        // Proprietà
        if (myPacket.buffer.length > index)
        {
            const { value: propertiesLength, bytesRead } = decodeVariableByteInteger(myPacket.buffer, index);
            index += bytesRead;

            if (propertiesLength > 0)
            {
                const propertiesEndIndex = index + propertiesLength;
                myPacket.properties = Subscribe.extractProperties(myPacket.buffer, index, propertiesEndIndex);
                index = propertiesEndIndex;
            }
            else
            {
                myPacket.properties = {};
            }
        }

        // Topics e QoS
        myPacket.topics = [];
        while (index < myPacket.buffer.length)
        {
            const topicLength = myPacket.buffer.readUInt16BE(index);
            index += 2;
            const topic = myPacket.buffer.slice(index, index + topicLength).toString();
            index += topicLength;
            const QoS = myPacket.buffer[index++];
            myPacket.topics.push({ name: topic, QoS });
        }

        return myPacket;
    }

    static extractProperties(buffer, startIndex, endIndex)
    {
        const properties = {};
        let index = startIndex;

        while (index < endIndex)
        {
            const propertyIdentifier = buffer.readUInt8(index++);
            switch (propertyIdentifier)
            {
            case 0x0B: // Subscription Identifier
                const { value: subscriptionIdentifier, bytesRead } = decodeVariableByteInteger(buffer, index);
                properties.subscriptionIdentifier = subscriptionIdentifier;
                index += bytesRead;
                break;
            case 0x26: // User Property
                if (!properties.userProperties)
                {
                    properties.userProperties = [];
                }
                const propertyNameLength = buffer.readUInt16BE(index);
                index += 2;
                const propertyName = buffer.toString('utf8', index, index + propertyNameLength);
                index += propertyNameLength;

                const propertyValueLength = buffer.readUInt16BE(index);
                index += 2;
                const propertyValue = buffer.toString('utf8', index, index + propertyValueLength);
                index += propertyValueLength;

                properties.userProperties.push({ name: propertyName, value: propertyValue });
                break;
            default:
                console.warn(`Unknown property identifier: ${propertyIdentifier}`);
                index = endIndex;
                break;
            }
        }

        return properties;
    }
}

module.exports = Subscribe;
