/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

(function () {
  const util = require('util');
  const ofp = require('../ofp.js');

  const offsets = ofp.offsets.ofp_header;

  module.exports = {
    unpack: function (buffer, offset) {
      var message = {
        header: {type: 'OFPT_ECHO_REQUEST'},
        body: {}
      };

      let len = buffer.readUInt16BE(offset + offsets.length, true);
      if (len < ofp.sizes.ofp_header) {
        throw new Error(util.format('%s message at offset %d has invalid length (%d).',
                        message.header.type, offset, len));
      }

      let dataLen = len - ofp.sizes.ofp_header;
      if (dataLen > 0) {
        message.body.data = new Buffer(dataLen);
        buffer.copy(message.body.data, 0, offset + ofp.sizes.ofp_header,
                    offset + ofp.sizes.ofp_header + dataLen);
      }

      return {
        message: message,
        offset: offset + len
      };
    }
  };
})();
