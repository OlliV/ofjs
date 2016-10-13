/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

const util = require('util');
const ofp = require('../ofp.js');

const offsetsHeader = ofp.offsets.ofp_header;
const offsets = ofp.offsets.ofp_vendor_header;

module.exports = {
  unpack: function (buffer, offset) {
    let message = {
      header: {type: 'OFPT_VENDOR'},
      body: {},
    };

    const len = buffer.readUInt16BE(offset + offsetsHeader.length, true);
    if (len < ofp.sizes.ofp_vendor_header) {
      throw new Error(util.format('%s message at offset %d has invalid length (%d).',
                                  message.header.type, offset, len));
    }

    message.body.vendor = buffer.readUInt32BE(offset + offsets.vendor, true);

    // Note: Padding might also contain data
    const dataLen = len - ofp.sizes.ofp_vendor_header;
    if (dataLen > 0) {
      message.body.data = new Buffer(dataLen);
      buffer.copy(message.body.data, 0, offset + ofp.sizes.ofp_vendor_header, offset + ofp.sizes.ofp_vendor_header + dataLen);
    }

    return {
      message: message,
      offset: offset + len,
    };
  },
};
