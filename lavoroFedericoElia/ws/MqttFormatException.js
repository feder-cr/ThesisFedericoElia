/* eslint-disable max-classes-per-file */
class MqttFormatException extends Error
{
    constructor(mess)
    {
        super(mess);
        this.name = 'MqttFormatException';
    }
}

class MqttFormatJSONConversionEx extends MqttFormatException
{
    constructor(mess)
    {
        super(mess);
        this.name = 'MqttFormatJSONConversionEx';
    }
}

class MqttFormatJSONtoRBG24Ex extends MqttFormatException
{
    constructor(mess)
    {
        super(mess);
        this.name = 'MqttFormatJSONtoRBG24Ex';
    }
}

class MqttFormatRGB24toRBG16Ex extends MqttFormatException
{
    constructor(mess)
    {
        super(mess);
        this.name = 'MqttFormatRGB24toRBG16Ex';
    }
}

module.exports = { MqttFormatJSONConversionEx, MqttFormatJSONtoRBG24Ex, MqttFormatRGB24toRBG16Ex };
