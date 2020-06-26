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
const ADVERTISER_ADDRESS_LENGTH_BYTES = 6;


/**
 * Reconstruct a BLE packet (as a hex string) from the given elements.
 * @param {String} headerByte The first byte of the header.
 * @param {String} advertiserAddress The advertiser address.
 * @param {String} payload The BLE payload.
 */
function reconstructPacket(headerByte, advertiserAddress, payload) {
  let payloadLength = (payload.length / 2) + ADVERTISER_ADDRESS_LENGTH_BYTES;
  let packet = headerByte.toLowerCase() +
               ('0' + payloadLength.toString(16)).substr(-2) +
               reverseBytes(advertiserAddress) +
               payload.toLowerCase();

  return packet;
}


/**
 * Reverse the order of the bytes in the data.
 * @param {String} data The data as a hexadecimal-string.
 */
function reverseBytes(data) {
  let result = '';
  for(let cChar = (data.length - 2); cChar >= 0; cChar -= 2) {
    result += data.substring(cChar, cChar + 2);
  }
  return result;
}


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

      let receiver = origin.split(Raddec.identifiers.SIGNATURE_SEPARATOR);
      let receiverId = receiver[0];
      let receiverIdType = parseInt(receiver[1]);
      let rssi = parseInt(elements[2]);
      let packet = reconstructPacket(elements[0].substring(0,2), transmitterId,
                                     elements[1]);

      raddec.addDecoding({ receiverId: receiverId,
                           receiverIdType: receiverIdType,
                           rssi: rssi });
      raddec.addPacket(packet);

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
