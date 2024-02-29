class mqttFormatException extends Error {
  constructor (mess) {
    super(mess)
    this.name = 'mqttFormatException'
  }
}

class MqttFormatJSONConversionException extends mqttFormatException {
  constructor (mess) {
    super(mess)
    this.name = 'MqttFormatJSONConversionException'
  }
}

class MqttFormatJSONtoRBG24Exception extends mqttFormatException {
  constructor (mess) {
    super(mess)
    this.name = 'MqttFormatJSONtoRBG24Exception'
  }
}

class MqttFormatRGB24toRBG16Exception extends mqttFormatException {
  constructor (mess) {
    super(mess)
    this.name = 'MqttFormatRGB24toRBG16Exception'
  }
}

module.exports = { MqttFormatJSONConversionException, MqttFormatJSONtoRBG24Exception, MqttFormatRGB24toRBG16Exception }
