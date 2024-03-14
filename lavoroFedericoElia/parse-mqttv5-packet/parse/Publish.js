const { decodeVariableByteInteger } = require('./util');

class Publish
{
    static parse(packet)
    {
        const myPacket = { ...packet };
        let index = 0;

        // Estrai il topic name (lunghezza + contenuto)
        const topicLength = (myPacket.buffer[index++] << 8) | myPacket.buffer[index++];
        myPacket.topic = myPacket.buffer.slice(index, index + topicLength).toString('utf8');
        index += topicLength;

        // Packet Identifier è presente solo se QoS > 0
        if ((myPacket.flags >> 1) & 3)
        { // Controllo i bit di QoS
            myPacket.packetIdentifier = (myPacket.buffer[index++] << 8) | myPacket.buffer[index++];
        }

        // Estrai la lunghezza delle proprietà (numero intero variabile a lunghezza variabile)
        const { value: propertiesLength, bytesRead } = decodeVariableByteInteger(myPacket.buffer, index);
        index += bytesRead;

        // Estrai le proprietà solo se la lunghezza è maggiore di zero
        if (propertiesLength > 0)
        {
            const propertiesEndIndex = index + propertiesLength;
            myPacket.properties = Publish.extractProperties(myPacket.buffer, index, propertiesEndIndex);
            index = propertiesEndIndex;
        }
        else
        {
            myPacket.properties = {};
        }

        // Il payload è ciò che resta dopo l'header variabile e le proprietà
        myPacket.payload = myPacket.buffer.slice(index).toString();

        // Elimina il buffer dal pacchetto per pulire
        delete myPacket.buffer;

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
            // Reason String (già presente)
            case 0x1F:
                const reasonStringLength = buffer.readUInt16BE(index);
                index += 2;
                properties.reasonString = buffer.toString('utf8', index, index + reasonStringLength);
                index += reasonStringLength;
                break;
                // User Property (già presente)
            case 0x26:
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
                // Payload Format Indicator
            case 0x01:
                properties.payloadFormatIndicator = buffer.readUInt8(index++);
                break;
                // Message Expiry Interval
            case 0x02:
                properties.messageExpiryInterval = buffer.readUInt32BE(index);
                index += 4;
                break;
                // Topic Alias
            case 0x23:
                properties.topicAlias = buffer.readUInt16BE(index);
                index += 2;
                break;
                // Response Topic
            case 0x08:
                const responseTopicLength = buffer.readUInt16BE(index);
                index += 2;
                properties.responseTopic = buffer.toString('utf8', index, index + responseTopicLength);
                index += responseTopicLength;
                break;
                // Correlation Data
            case 0x09:
                const correlationDataLength = buffer.readUInt16BE(index);
                index += 2;
                properties.correlationData = buffer.slice(index, index + correlationDataLength);
                index += correlationDataLength;
                break;
                // Subscription Identifier
            case 0x0B:
                const { value: subscriptionIdentifier, bytesRead } = decodeVariableByteInteger(buffer, index);
                properties.subscriptionIdentifier = subscriptionIdentifier;
                index += bytesRead;
                break;
                // Content Type
            case 0x03:
                const contentTypeLength = buffer.readUInt16BE(index);
                index += 2;
                properties.contentType = buffer.toString('utf8', index, index + contentTypeLength);
                index += contentTypeLength;
                break;
                // Gestisci altri identificatori di proprietà come necessario
            default:
                console.warn(`Unknown property identifier: ${propertyIdentifier}`);
                // Questo salterà il resto delle proprietà, evitando ulteriori errori
                index = endIndex;
                break;
            }
        }

        return properties;
    }
}

module.exports = Publish;
