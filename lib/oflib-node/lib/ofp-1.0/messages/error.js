/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

const util = require('util');
const ofp = require('../ofp.js');
const ofputil = require('../../util.js');

const offsetsHeader = ofp.offsets.ofp_header;
const offsets = ofp.offsets.ofp_error_msg;

module.exports = {
  unpack: function (buffer, offset) {
    let message = {
      header: {type: 'OFPT_ERROR'},
      body: {},
    };

    let len = buffer.readUInt16BE(offset + offsetsHeader.length, true);
    if (len < ofp.sizes.ofp_error_msg) {
      throw new Error(util.format('%s message at offset %d has invalid length (%d).',
                                  message.header.type, offset, len));
    }

    let type = buffer.readUInt16BE(offset + offsets.type, true);
    let code = buffer.readUInt16BE(offset + offsets.code, true);

    if (ofputil.setEnum(message.body, 'type', type, ofp.ofp_error_type_rev)) {
      // NOTE: hackish
      let errorCodeMapName = message.body.type.toLowerCase().replace('ofpet_', 'ofp_') + '_code_rev';
      if (!(ofputil.setEnum(message.body, 'code', code, ofp[errorCodeMapName]))) {
        message.body.code = code;
        console.warn('%s message at offset %d has invalid code (%d).',
                     message.header.type, offset, code);
      }
    } else {
      message.body.type = type;
      message.body.code = code;
      console.warn('%s message at offset %d has invalid type (%d).',
                   message.header.type, offset, type);
    }

    var dataLen = len - ofp.sizes.ofp_error_msg;
    if (dataLen > 0) {
      message.body.data = new Buffer(dataLen);
      buffer.copy(message.body.data, 0, offset + ofp.sizes.ofp_error_msg,
                  offset + ofp.sizes.ofp_error_msg + dataLen);
    }

    return {
      message: message,
      offset: offset + len,
    };
  },
};
