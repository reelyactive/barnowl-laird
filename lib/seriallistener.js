/**
 * Copyright reelyActive 2020
 * We believe in an open Internet of Things
 */


// Constants
const PROTOCOL = 'serial';
const DEFAULT_BAUDRATE = 115200;
const AUTO_PATH = 'auto';
const AUTO_MANUFACTURER = 'FTDI';


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
    let path = options.path || AUTO_PATH;
    let baudrate = options.baudrate || DEFAULT_BAUDRATE;

    this.decoder = options.decoder;
    this.decodingOptions = options.decodingOptions || {};

    openSerialPort(path, baudrate, function(err, serialPort, path) {
      if(err) {
        return console.log('barnowl-laird: error opening serial port',
                           err.message);
      }
      self.serialPort = serialPort;
      self.path = path;
      handleSerialEvents(self);
    });
  }
}


/**
 * Handle events from the serial port.
 * @param {SerialListener} instance The SerialListener instance.
 */
function handleSerialEvents(instance) {
  instance.serialPort.on('data', function(data) {
    let origin = instance.path;
    let time = new Date().getTime();
    instance.decoder.handleSerialData(data.toString('hex'), origin, time,
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
 * @param {String} path Path to serial port, ex: /dev/ttyUSB0 or auto.
 * @param {Number} baudrate Baud rate to listen for.
 * @param {function} callback The function to call on completion.
 */
function openSerialPort(path, baudrate, callback) {
  let SerialPort = require('serialport');
  let serialPort;
  let options = { baudRate: baudrate };

  if(path === AUTO_PATH) {
    let detectedPath;
    SerialPort.list(function(err, ports) {
      if(err) {
        return callback(err);
      }
      ports.forEach(function(port) {
        if(port.manufacturer === AUTO_MANUFACTURER) {
          detectedPath = port.comName;
          serialPort = new SerialPort(detectedPath, options, function(err) {
            console.log('barnowl-laird: auto serial path: \"' + path +
                        '\" was selected');
            return callback(err, serialPort, detectedPath);
          });
        }
        else if(port.manufacturer) {
          console.log('barnowl-laird: alternate serial path: \"' +
                      port.comName + '\" is a ' + port.manufacturer +
                      'device.');
        }
      });
      if(!serialPort) {
        return callback( { message: "Can't auto-determine serial port" } );
      }
    });
  }
  else {
    serialPort = new SerialPort(path, options, function(err) {
      return callback(err, serialPort, path);
    });
  }
}


module.exports = SerialListener;
