const mqttParser = require('.');

const packets = mqttParser.parse(Buffer.from('YgIjKQ==', 'base64'));
packets.forEach((element) =>
{
    console.log(element);
});
