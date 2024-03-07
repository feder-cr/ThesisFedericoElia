const { connect } = require('mqtt');
const sense = require('sense-hat-led');

const topic = 'displayColor';
const settings = {
    port: 1883,
};

const client = connect('mqtt://broker.hivemq.com', settings);
client.subscribe('displayColor');

client.on('message', (receivedTopic, message) =>
{
    try
    {
        if (receivedTopic === topic)
        {
            const parsedMessage = JSON.parse(message);
            const { red, green, blue } = parsedMessage;
            // La lib js per scrivere sul sense-hat quando rgb16 non rispetta il formato -> 0-0-0
            sense.sync.clear(red, green, blue);
        }
    }
    catch (error)
    {
        sense.sync.clear(0, 0, 0);
    }
});

function done()
{
    // console.log('finished message');
}

setTimeout(() =>
{
    done();
    client.end();
    process.exit();
}, 360000);
