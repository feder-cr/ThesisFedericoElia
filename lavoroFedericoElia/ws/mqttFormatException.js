/* eslint-disable max-classes-per-file */
class mqttFormatException extends Error
{
    constructor(mess)
    {
        super(mess);
        this.name = 'mqttFormatException';
    }
}

class MqttFormatJSONConversionEx extends mqttFormatException
{
    constructor(mess)
    {
        super(mess);
        this.name = 'MqttFormatJSONConversionEx';
    }
}

class MqttFormatJSONtoRBG24Ex extends mqttFormatException
{
    constructor(mess)
    {
        super(mess);
        this.name = 'MqttFormatJSONtoRBG24Ex';
    }
}

class MqttFormatRGB24toRBG16Ex extends mqttFormatException
{
    constructor(mess)
    {
        super(mess);
        this.name = 'MqttFormatRGB24toRBG16Ex';
    }
}

module.exports = { MqttFormatJSONConversionEx, MqttFormatJSONtoRBG24Ex, MqttFormatRGB24toRBG16Ex };
