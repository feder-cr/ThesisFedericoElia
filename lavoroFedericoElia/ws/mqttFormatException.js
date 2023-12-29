class mqttFormatException extends Error {
    constructor(mess) {
      super(mess);
      this.name = 'mqttFormatException';
    }
  }

  class mqttFormatJSONConversionException extends mqttFormatException {
    constructor(mess) {
      super(mess);
      this.name = 'mqttFormatJSONConversionException';
    }
  }

  class mqttFormatJSONtoRBG24Exception extends mqttFormatException {
    constructor(mess) {
      super(mess);
      this.name = 'mqttFormatJSONtoRBG24Exception';
    }
  }

  class mqttFormatRGB24toRBG16Exception extends mqttFormatException {
    constructor(mess) {
      super(mess);
      this.name = 'mqttFormatRGB24toRBG16Exception';
    }
  }


  module.exports = { mqttFormatJSONtoRBG24Exception,mqttFormatRGB24toRBG16Exception };