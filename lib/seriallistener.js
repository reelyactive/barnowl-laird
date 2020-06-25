/**
 * Copyright reelyActive 2020
 * We believe in an open Internet of Things
 */


const Raddec = require('raddec');


// Constants
const PROTOCOL = 'serial';
const DEFAULT_PATH = '/dev/ttyS2';
const BL654_APP_NAME = 'node_ble';
const DEFAULT_BAUDRATE = 115200;
const DEFAULT_SERIAL_PORT_OPTIONS = {                                       
    baudRate: DEFAULT_BAUDRATE,
    parity: "none",
    stopBits: 1,
    autoOpen: true,
    rtscts: true
};
const BREAK_SET_MILLISECONDS = 17;
const BREAK_HOLDOFF_MILLISECONDS = 3000;


/**
 * SerialListener Class
 * Listens for reel data on a UDP port.
 */
class SerialListener {

  /**
   * SerialListener constructor
   * @param {Object} options The options as a JSON object.
   * @constructor
   */
  constructor(options) {
    options = options || {};
    let self = this;
    let path = options.path || DEFAULT_PATH;

    this.decoder = options.decoder;
    this.decodingOptions = options.decodingOptions || {};
    this.receiverSignature = null;

    openSerialPort(path, DEFAULT_SERIAL_PORT_OPTIONS,
                   function(err, serialPort, path) {
      if(err) {
        return console.log('barnowl-laird: error opening serial port',
                           err.message);
      }
      self.serialPort = serialPort;
      self.path = path;

      sendBreak(serialPort, function() {
        initialiseBL654(self, serialPort, function() {
          initialiseScanning(serialPort);
          handleSerialEvents(self);
        });
      });
    });
  }
}


/**
 * Handle events from the serial port.
 * @param {SerialListener} instance The SerialListener instance.
 */
function handleSerialEvents(instance) {
  instance.serialPort.on('data', function(data) {
    let origin = instance.receiverSignature;
    let time = new Date().getTime();
    instance.decoder.handleSerialData(data.toString(), origin, time,
                                      instance.decodingOptions);
  });
  instance.serialPort.on('close', function() {
    console.log('barnowl-laird: serial port closed');
  });
  instance.serialPort.on('error', function(err) {
    console.log('barnowl-laird: serial port error', err.message);
  });
}


/**
 * Open the serial port based on the given path.
 * @param {String} path Path to serial port, ex: /dev/ttyS2.
 * @param {Object} options The serial port options.
 * @param {function} callback The function to call on completion.
 */
function openSerialPort(path, options, callback) {
  let SerialPort = require('serialport');
  let serialPort = new SerialPort(path, options, function(err) {
    return callback(err, serialPort, path);
  });
}


/**
 * Send a serial break (for the BL654 to accept AT commands).
 * @param {SerialPort} serialPort The serial port instance.
 * @param {function} callback The function to call on completion.
 */
function sendBreak(serialPort, callback) {
  function setBreak(state, duration, callback) {
    serialPort.set({ brk: state }, function() {});
    setTimeout(callback, duration);
  }

  setBreak(true, BREAK_SET_MILLISECONDS, function() {
    setBreak(false, BREAK_HOLDOFF_MILLISECONDS, callback);
  });
}


/**
 * Initialise the BL654 module by querying the firmware and application
 * versions, then starting the software application.
 * @param {SerialListener} instance The SerialListener instance.
 * @param {SerialPort} serialPort The serial port instance.
 * @param {function} callback The function to call on completion.
 */
function initialiseBL654(instance, serialPort, callback) {
  queryBL654Id(instance, serialPort, function() {
    queryFirmwareHex(serialPort, function() {
      startApplication(serialPort, callback);
    });
  });
}


/**
 * Query the BL654 receiver signature and print it to the console.
 * @param {SerialListener} instance The SerialListener instance.
 * @param {SerialPort} serialPort The serial port instance.
 * @param {function} callback The function to call on completion.
 */
function queryBL654Id(instance, serialPort, callback) {
  serialPort.write('ati 4\r\n');
  serialPort.flush();
  serialPort.once('data', function(data) {
    let bl654 = data.toString().match(new RegExp(/\w{2} \w{12}/));
    if(bl654 === null) {
      console.log('BL654 failed to respond to identifier query');
      process.exit(1);
    }                                                                
    else {
      let receiver = bl654[0].split(' ');
      let receiverId = receiver[1].toLowerCase();
      let receiverIdType = Raddec.identifiers.TYPE_EUI48;
      if(receiver[0] === '01') {
        receiverIdType = Raddec.identifiers.TYPE_RND48;
      }
      instance.receiverSignature = receiverId +
                                   Raddec.identifiers.SIGNATURE_SEPARATOR +
                                   receiverIdType;
      console.log('BL654 receiverSignature:', instance.receiverSignature);
      return callback();
    }
  });
}


/**
 * Query the firmware hex and print it to the console.
 * @param {SerialPort} serialPort The serial port instance.
 * @param {function} callback The function to call on completion.
 */
function queryFirmwareHex(serialPort, callback) {
  serialPort.write('ati 13\r\n');
  serialPort.flush();
  serialPort.once('data', function(data) {
    let firmwareHex = data.toString().match(new RegExp(/\w{4} \w{4}/));
    if(firmwareHex === null) {
      console.log('BL654 failed to respond to firmware hex query');
      process.exit(1); // TODO: fail in the standard way
    }
    else {
      console.log('BL654 Firmware:', firmwareHex[0]);
      return callback();
    }
  });
}


/**
 * Query and start the target application if it is installed.
 * @param {SerialPort} serialPort The serial port instance.
 * @param {function} callback The function to call on completion.
 */
function startApplication(serialPort, callback) {
  serialPort.write('at+dir\r\n');
  serialPort.flush();
  serialPort.once('data', function(data) {
    let appName = data.toString().match(new RegExp(BL654_APP_NAME));
    if(appName === null) {
      console.log('BL654', BL654_APP_NAME, 'app not found');
      process.exit(1); // TODO: fail in the standard way
    }
    else {
      serialPort.write(BL654_APP_NAME + '\r\n');
      serialPort.flush();
      console.log('BL654', BL654_APP_NAME, 'app started');
      return callback();
    }
  });
}


/**
 * Send the command to start scanning indefinitely.
 * @param {SerialPort} serialPort The serial port instance.
 */
function initialiseScanning(serialPort) {
  serialPort.write('scan start 0 0\r\n');
  serialPort.flush();
}


module.exports = SerialListener;
