const { decodeVariableByteInteger } = require('./util');

class UnSubAck
{
    static parse(packet)
    {
        const myPacket = { ...packet };
        let index = 2; // Inizia dopo l'identificatore del pacchetto (2 byte)

        // Packet Identifier
        myPacket.packetId = myPacket.buffer.readUInt16BE(0);

        // Proprietà MQTT v5
        if (myPacket.buffer.length > index)
        {
            const { value: propertiesLength, bytesRead } = decodeVariableByteInteger(myPacket.buffer, index);
            index += bytesRead;

            if (propertiesLength > 0)
            {
                if (index + propertiesLength > myPacket.buffer.length)
                {
                    throw new Error('Il buffer non contiene dati sufficienti per le proprietà.');
                }

                // Estrai le proprietà qui...
                myPacket.properties = UnSubAck.extractProperties(myPacket.buffer, index, index + propertiesLength);
                index += propertiesLength;
            }
            else
            {
                myPacket.properties = {};
            }
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
            // Gestisci vari identificatori di proprietà qui...
            switch (propertyIdentifier)
            {
            // Ad esempio, per la Reason String (0x1F) e User Property (0x26)
            case 0x1F:
                properties.reasonString = UnSubAck.readUTF8String(buffer, index);
                index += 2 + properties.reasonString.length;
                break;
            case 0x26:
                // User Property è una coppia di stringhe UTF-8
                const key = UnSubAck.readUTF8String(buffer, index);
                index += 2 + key.length;
                const value = UnSubAck.readUTF8String(buffer, index);
                index += 2 + value.length;
                properties.userProperties = properties.userProperties || [];
                properties.userProperties.push({ key, value });
                break;
                // Aggiungi altri case per gestire differenti tipi di proprietà
            default:
                console.warn(`Identificatore di proprietà sconosciuto: ${propertyIdentifier}`);
                index = endIndex;
                break;
            }
        }

        return properties;
    }

    static readUTF8String(buffer, index)
    {
        const length = buffer.readUInt16BE(index);
        return buffer.toString('utf8', index + 2, index + 2 + length);
    }
}

module.exports = UnSubAck;
