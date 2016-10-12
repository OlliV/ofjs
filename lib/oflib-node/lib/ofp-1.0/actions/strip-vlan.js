/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

(function () {
  const util = require('util');
  const ofp = require('../ofp.js');

  let offsets = ofp.offsets.ofp_action_header;

  module.exports = {
    unpack: function (buffer, offset) {
      let action = {
        header: {type: 'OFPAT_STRIP_VLAN'},
        body: {}
      };

      let len = buffer.readUInt16BE(offset + offsets.len, true);

      if (len !== ofp.sizes.ofp_action_header) {
        throw new Error(util.format('%s action at offset %d has invalid length (%d).',
                                    action.header.type, offset, len));
      }

      return {
        action: action,
        offset: offset + len
      };
    }
  };
})();
