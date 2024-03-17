const mqttParser = require('.');

const packets = mqttParser.parse(Buffer.from('NDIADGRpc3BsYXlDb2xvchr1AHsicmVkIjoxMTQsImdyZWVuIjo4NSwiYmx1ZSI6MTg4fTQzAAxkaXNwbGF5Q29sb3Ia9gB7InJlZCI6MTAyLCJncmVlbiI6MTI4LCJibHVlIjoxODl9NDMADGRpc3BsYXlDb2xvchr3AHsicmVkIjoyMDAsImdyZWVuIjoxNTIsImJsdWUiOjI0Nn00MgAMZGlzcGxheUNvbG9yGvgAeyJyZWQiOjIwMiwiZ3JlZW4iOjEzOCwiYmx1ZSI6MTF9NBUADGRpc3BsYXlDb2xvchr5AG51bGw0GgAMZGlzcGxheUNvbG9yGvoAWzEsMiwzLDRdNDIADGRpc3BsYXlDb2xvchr7AHsicmVkIjoxNTksImdyZWVuIjo0OCwiYmx1ZSI6MTkwfTQyAAxkaXNwbGF5Q29sb3Ia/AB7InJlZCI6MjEyLCJncmVlbiI6MTQwLCJibHVlIjoxNn00MgAMZGlzcGxheUNvbG9yGv0AeyJyZWQiOjEwNiwiZ3JlZW4iOjkwLCJibHVlIjoxNjh9NBgADGRpc3BsYXlDb2xvchr+AHN0cmluZ2E=', 'base64'));
packets.forEach((element) =>
{
    console.log(element);
});
