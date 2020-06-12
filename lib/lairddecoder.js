/**
 * Copyright reelyActive 2020
 * We believe in an open Internet of Things
 */


const serialPacketDecoder = require('./serialpacketdecoder');


/**
 * LairdDecoder Class
 * Decodes data streams from one or more Laird devices and forwards the
 * packets to the given BarnowlLaird instance.
 */
class LairdDecoder {

  /**
   * LairdDecoder constructor
   * @param {Object} options The options as a JSON object.
   * @constructor
   */
  constructor(options) {
    options = options || {};

    this.barnowl = options.barnowl;
    this.queuesByOrigin = {};
  }

  /**
   * Handle data from a given device, specified by the origin
   * @param {String} data The data as an ASCII string.
   * @param {String} origin The unique origin identifier of the device.
   * @param {Number} time The time of the data capture.
   * @param {Object} decodingOptions The packet decoding options.
   */
  handleSerialData(data, origin, time, decodingOptions) {
    let self = this;
    let isNewOrigin = (!this.queuesByOrigin.hasOwnProperty(origin));
    if(isNewOrigin) {
      this.queuesByOrigin[origin] = data;
    }
    else {
      this.queuesByOrigin[origin] += data;
    }
    let raddecs = serialPacketDecoder.decode(this.queuesByOrigin[origin],
                                             origin, time, decodingOptions);
    raddecs.forEach(function(raddec) {
      self.barnowl.handleRaddec(raddec);
    });
  }
}


module.exports = LairdDecoder;
