/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

const util = require('util');
const ofp = require('../ofp.js');

const offsets = ofp.offsets.ofp_header;

module.exports = {
  unpack: function (buffer, offset) {
    var message = {
      header: {type: 'OFPT_HELLO'},
    };

    const len = buffer.readUInt16BE(offset + offsets.length, true);
    if (len !== ofp.sizes.ofp_header) {
      throw new Error(util.format('%s message at offset %d has invalid length (%d).',
                                  message.header.type, offset, len));
    }

    return {
      message: message,
      offset: offset + len,
    };
  },
  pack: function (message, buffer, offset) {
    buffer.writeUInt8(ofp.ofp_type.OFPT_HELLO, offset + offsets.type, true);
    buffer.writeUInt16BE(ofp.sizes.ofp_header, offset + offsets.length, true);

    return {
      offset: offset + ofp.sizes.ofp_header,
    };
  },
};
