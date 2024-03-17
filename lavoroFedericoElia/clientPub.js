const { connect } = require('mqtt');

const topic = 'displayColor';
const settings = {
    port: 1883,
};

const client = connect('mqtt://broker.hivemq.com', settings);
client.subscribe(`${topic}/+`);

function getRandomNumber(min, max)
{
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const possibleValues = [
    '10', // Stringa numerica
    '100', // Stringa numerica
//    '"tringa"',
    'stringa', // Stringa senza apici extra
    JSON.stringify({ color: 'colore' }), // Stringa JSON rappresentante un oggetto
    // JSON.stringify({
    //    red: 100.1,
    //    blue: 100.1,
    //    green: 100.1,
    // }), // Stringa JSON rappresentante un oggetto
    'true', // Stringa booleana
    'null', // Stringa rappresentante il valore null
    JSON.stringify([1, 2, 3, 4]), // Stringa JSON rappresentante un array
];

let value = 0;

function pub()
{
    const randomValue1 = getRandomNumber(0, 255);
    const randomValue2 = getRandomNumber(0, 255);
    const randomValue3 = getRandomNumber(0, 255);
    const jsonObject = {
        red: randomValue1,
        green: randomValue2,
        blue: randomValue3,
    };

    const randomNumber = Math.random();
    const isTrue = randomNumber > 0.5;

    // Stampa il risultato
    if (isTrue)
    {
        client.publish('displayColor', JSON.stringify(jsonObject));
    }
    else
    {
        client.publish('displayColor', possibleValues[value]);
    }

    value += 1;
    if (value === possibleValues.length)
    {
        value = 0;
    }
}

setInterval(pub, 1000);
