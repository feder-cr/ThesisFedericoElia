function extractPacketType(byte)
{
    return byte >> 4;
}

function extractFlags(byte)
{
    return byte & 0x0F;
}

function extractRemainLength(buffer) {
    let multiplier = 1;
    let value = 0;
    let index = 1;
    let encodedByte;

    do {
        encodedByte = buffer[index++];
        value += (encodedByte & 127) * multiplier;
        multiplier *= 128;
        if (multiplier > 128 * 128 * 128) {
            throw new Error('Malformed Remaining Length');
        }
    } while ((encodedByte & 128) !== 0);

    return { remainLength: value, nextIndex: index };
}

module.exports = {
    extractPacketType, extractFlags, extractRemainLength
};
