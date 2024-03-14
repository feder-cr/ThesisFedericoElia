const mqttParser = require('.');

const packets = mqttParser.parse(Buffer.from('', 'base64'));
packets.forEach((element) =>
{
    console.log(element);
});
