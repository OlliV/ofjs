/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

const util = require('util');
const ofp = require('../ofp.js');

const offsets = ofp.offsets.ofp_action_vendor_header;

module.exports = {
  unpack: function (buffer, offset) {
    let action = {
      header: {type: 'OFPAT_VENDOR'},
      body: {},
    };

    const len = buffer.readUInt16BE(offset + offsets.len, true);
    if (len < ofp.sizes.ofp_action_vendor_header) {
      throw new Error(util.format('%s action at offset %d has invalid length (%d).',
                                  action.header.type, offset, len));
    }

    action.body.vendor = buffer.readUInt32BE(offset + offsets.vendor, true);

    const dataLen = len - ofp.sizes.ofp_action_vendor_header;
    if (dataLen > 0) {
      action.body.data = new Buffer(dataLen);
      buffer.copy(action.body.data, 0, offset + ofp.sizes.ofp_action_vendor_header, offset + ofp.sizes.ofp_action_vendor_header + dataLen);
    }

    return {
      action: action,
      offset: offset + len,
    };
  },
};
