const { decodeVariableByteInteger } = require('./util');

class Connect
{
    static parse(packet)
    {
        const myPacket = packet;
        let index = 0;

        // Header
        const protocolNameLength = myPacket.buffer.readUInt16BE(index);
        myPacket.protocolName = myPacket.buffer.slice(index + 2, index + 2 + protocolNameLength).toString();
        index += 2 + protocolNameLength;

        myPacket.protocolLevel = myPacket.buffer[index++];
        const b = myPacket.buffer[index++];
        myPacket.connectFlags = {
            username: b >> 7 & 0x01,
            password: b >> 6 & 0x01,
            willRetain: b >> 5 & 0x01,
            willQoS: (b >> 3 & 0x03),
            willFlag: b >> 2 & 0x01,
            cleanSession: b >> 1 & 0x01,
            reserved: b & 0x01,
        };

        if (myPacket.connectFlags.reserved) throw new Error('Connect flags reserved should be 0');

        myPacket.keepAlive = myPacket.buffer.readUInt16BE(index);
        index += 2;

        // Proprietà (MQTT 5.0)
        if (myPacket.protocolLevel === 5)
        {
            const propertiesLength = decodeVariableByteInteger(myPacket.buffer, index);
            index += propertiesLength.bytesRead;
            const propertiesEndIndex = index + propertiesLength.value;
            myPacket.properties = Connect.extractProperties(myPacket.buffer, index, propertiesEndIndex);
            index = propertiesEndIndex;
        }
        // Client ID
        const clientIdLength = myPacket.buffer.readUInt16BE(index);
        index += 2;
        myPacket.clientId = myPacket.buffer.slice(index, index + clientIdLength).toString();
        index += clientIdLength;

        // Proprietà Will, se Will Flag è impostato
        if (myPacket.connectFlags.willFlag)
        {
            const willPropertiesLength = decodeVariableByteInteger(myPacket.buffer, index);
            index += willPropertiesLength.bytesRead;
            const willPropertiesEndIndex = index + willPropertiesLength.value;
            myPacket.willProperties = this.extractWillProperties(myPacket.buffer, index, willPropertiesEndIndex);
            index = willPropertiesEndIndex;

            // Will Topic
            const willTopicLength = myPacket.buffer.readUInt16BE(index);
            index += 2;
            myPacket.willTopic = myPacket.buffer.slice(index, index + willTopicLength).toString();
            index += willTopicLength;

            // Will Payload
            const willPayloadLength = myPacket.buffer.readUInt16BE(index);
            index += 2;
            myPacket.willPayload = myPacket.buffer.slice(index, index + willPayloadLength);
            index += willPayloadLength;
        }

        // User Name, se Username Flag è impostato
        if (myPacket.connectFlags.username)
        {
            const userNameLength = myPacket.buffer.readUInt16BE(index);
            index += 2;
            myPacket.username = myPacket.buffer.slice(index, index + userNameLength).toString();
            index += userNameLength;
        }

        // Password, se Password Flag è impostato
        if (myPacket.connectFlags.password)
        {
            const passwordLength = myPacket.buffer.readUInt16BE(index);
            index += 2;
            myPacket.password = myPacket.buffer.slice(index, index + passwordLength).toString();
            index += passwordLength;
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
            // Gestisci altri identificatori di proprietà come necessario
            case 0x1F: // Reason String
                const reasonStringLength = buffer.readUInt16BE(index);
                index += 2;
                properties.reasonString = buffer.toString('utf8', index, index + reasonStringLength);
                index += reasonStringLength;
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
                // Qui potresti decidere di saltare il resto delle proprietà o gestire l'errore in altro modo
                index = endIndex; // Questo salterà il resto delle proprietà, evitando ulteriori errori
                break;
            }
        }

        return properties;
    }
}

module.exports = Connect;
