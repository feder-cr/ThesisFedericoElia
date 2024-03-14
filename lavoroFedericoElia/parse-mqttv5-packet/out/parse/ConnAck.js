const { decodeVariableByteInteger } = require('./util');

class ConnAck
{
    static parse(packet)
    {
        const myPacket = { ...packet };
        let index = 0;

        myPacket.connackAcknowledgeFlags = myPacket.buffer[index++];
        if (myPacket.connackAcknowledgeFlags > 1)
        {
            throw new Error('"Connect Acknowledge Flags" Bits 7-1 are reserved and MUST be set to 0.');
        }

        myPacket.reasonCode = myPacket.buffer[index++];

        if (index < myPacket.buffer.length)
        {
            const { value: propertiesLength, bytesRead } = decodeVariableByteInteger(myPacket.buffer, index);
            index += bytesRead;
            if (propertiesLength > 0)
            {
                const propertiesEndIndex = index + propertiesLength;
                myPacket.properties = ConnAck.extractProperties(myPacket.buffer, index, propertiesEndIndex);
                index = propertiesEndIndex;
            }
        }

        if (myPacket.buffer.length > index)
        {
            throw new Error('The CONNACK Packet should not have payload beyond the properties.');
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
            case 0x11:
                properties.sessionExpiryInterval = buffer.readUInt32BE(index);
                index += 4;
                break;
            case 0x21:
                properties.receiveMaximum = buffer.readUInt16BE(index);
                index += 2;
                break;
            case 0x24:
                properties.maximumQoS = buffer.readUInt8(index++);
                break;
            case 0x25:
                properties.retainAvailable = buffer.readUInt8(index++);
                break;
            case 0x27:
                properties.maximumPacketSize = buffer.readUInt32BE(index);
                index += 4;
                break;
            case 0x12:
                const assignedClientIdentifierLength = buffer.readUInt16BE(index);
                index += 2;
                properties.assignedClientIdentifier = buffer.toString('utf8', index, index + assignedClientIdentifierLength);
                index += assignedClientIdentifierLength;
                break;
            case 0x22:
                properties.topicAliasMaximum = buffer.readUInt16BE(index);
                index += 2;
                break;
            case 0x1F:
                const reasonStringLength = buffer.readUInt16BE(index);
                index += 2;
                properties.reasonString = buffer.toString('utf8', index, index + reasonStringLength);
                index += reasonStringLength;
                break;
            case 0x26:
                if (!properties.userProperties)
                {
                    properties.userProperties = [];
                }
                const userPropertyNameLength = buffer.readUInt16BE(index);
                index += 2;
                const userPropertyName = buffer.toString('utf8', index, index + userPropertyNameLength);
                index += userPropertyNameLength;

                const userPropertyValueLength = buffer.readUInt16BE(index);
                index += 2;
                const userPropertyValue = buffer.toString('utf8', index, index + userPropertyValueLength);
                index += userPropertyValueLength;

                properties.userProperties.push({ name: userPropertyName, value: userPropertyValue });
                break;
            case 0x28:
                properties.wildcardSubscriptionAvailable = buffer.readUInt8(index++);
                break;
            case 0x29:
                properties.subscriptionIdentifiersAvailable = buffer.readUInt8(index++);
                break;
            case 0x2A:
                properties.sharedSubscriptionAvailable = buffer.readUInt8(index++);
                break;
            case 0x13:
                properties.serverKeepAlive = buffer.readUInt16BE(index);
                index += 2;
                break;
            case 0x1A:
                const responseInformationLength = buffer.readUInt16BE(index);
                index += 2;
                properties.responseInformation = buffer.toString('utf8', index, index + responseInformationLength);
                index += responseInformationLength;
                break;
            case 0x1C: // Server Reference
                const serverReferenceLength = buffer.readUInt16BE(index);
                index += 2;
                properties.serverReference = buffer.toString('utf8', index, index + serverReferenceLength);
                index += serverReferenceLength;
                break;
            case 0x15: // Authentication Method
                const authenticationMethodLength = buffer.readUInt16BE(index);
                index += 2;
                properties.authenticationMethod = buffer.toString('utf8', index, index + authenticationMethodLength);
                index += authenticationMethodLength;
                break;
            case 0x16: // Authentication Data
                const authenticationDataLength = buffer.readUInt16BE(index);
                index += 2;
                properties.authenticationData = buffer.slice(index, index + authenticationDataLength);
                index += authenticationDataLength;
                break;
            default:
                console.warn(`Unknown property identifier: ${propertyIdentifier}`);
                index = endIndex;
                // In un'implementazione reale, potresti voler gestire meglio questo caso.
                break;
            }
        }

        return properties;
    }
}

module.exports = ConnAck;
