/**
 * Copyright reelyActive 2020
 * We believe in an open Internet of Things
 */


const advlib = require('advlib-identifier');
const Raddec = require('raddec');


const PACKET_PREFIX = 'adv:';
const PACKET_SUFFIX = '\n';
const PACKET_ELEMENT_SEPARATOR = ' ';
const ELEMENTS_PER_PACKET = 3;


/**
 * Decode a serial packet from the given ASCII string.
 * @param {String} packet The packet as an ASCII string.
 * @param {String} origin Origin of the data stream.
 * @param {String} time The time of the data capture.
 * @param {Object} options The packet decoding options.
 */
function decodeSerialPacket(packet, origin, time, options) {
  let elements = packet.split(PACKET_ELEMENT_SEPARATOR);
  let isValidNumberOfElements = (elements.length === ELEMENTS_PER_PACKET);

  if(isValidNumberOfElements) {
    let isAdvPacket = (elements[0].substring(0, PACKET_PREFIX.length) ===
                       PACKET_PREFIX);

    if(isAdvPacket) {
      elements[0] = elements[0].substring(PACKET_PREFIX.length);

      let transmitterId = elements[0].substring(2).toLowerCase();
      let transmitterIdType = Raddec.identifiers.TYPE_EUI48;
      if(elements[0].substring(0,2) === '03') {
        transmitterIdType = Raddec.identifiers.TYPE_RND48;
      }

      let raddec = new Raddec({ transmitterId: transmitterId,
                                transmitterIdType: transmitterIdType });
      let rssi = parseInt(elements[2]);

      // TODO: reconstruct packet from elements[0, 1]

      raddec.addDecoding({ receiverId: null,
                           receiverIdType: Raddec.identifiers.UNKNOWN,
                           rssi: rssi });

      return raddec;
    }
  }

  return null;
}


/**
 * Decode all the serial packets from the ASCII string.
 * @param {String} queue The queue of packets as ASCII strings.
 * @param {String} origin Origin of the data stream.
 * @param {Number} time The time of the data capture.
 * @param {Object} options The packet decoding options.
 */
function decode(queue, origin, time, options) {
  let packets = queue.split(PACKET_SUFFIX);
  let raddecs = [];

  packets.forEach(function(packet) {
    let raddec = decodeSerialPacket(packet, origin, time, options);

    if(raddec) {
      raddecs.push(raddec);
    }
  });

  return raddecs;
}


module.exports.decode = decode;