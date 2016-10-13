/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

const ofp = require('./ofp.js');
const msg10 = require('./ofp-1.0/message.js');

module.exports = {
  struct: 'message',
  unpack: function (buffer, offset) {
    if (!offset) offset = 0;
    const version = buffer.readUInt8(offset + ofp.offsets.ofp_header.version, true);

    switch (version) {
      case 0x01: return msg10.unpack(buffer, offset);
      default:
        throw new Error(`message at offset ${offset} has unsupported version (${version}).`);
    }
  },
  pack: function (obj, buffer, offset) {
    if (!offset) offset = 0;
    let message = obj.message;

    switch (message.version) {
      case 0x01: return msg10.pack(message, buffer, offset);
      default:
        throw new Error(`message at offset ${offset} has unsupported version (${message.version}`);
    }
  },
};
