function decodeVariableByteInteger(buffer, startIndex)
{
    let multiplier = 1;
    let value = 0;
    let bytesRead = 0;
    let digit;

    do
    {
        digit = buffer[startIndex + bytesRead];
        value += (digit & 127) * multiplier;
        multiplier *= 128;
        bytesRead++;
        if (multiplier > 128 * 128 * 128)
        {
            throw new Error('Malformed Remaining Length');
        }
    } while ((digit & 128) !== 0);

    return { value, bytesRead };
}

module.exports = { decodeVariableByteInteger };
