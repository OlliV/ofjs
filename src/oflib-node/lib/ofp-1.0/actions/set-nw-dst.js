/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

(function () {
  const util = require('util');
  const ofp = require('../ofp.js');
  const packet = require('../../packet.js');

  let offsets = ofp.offsets.ofp_action_nw_addr;

  module.exports = {
    unpack: function (buffer, offset) {
      let action = {
        header: {type: 'OFPAT_SET_NW_DST'},
        body: {}
      };

      var len = buffer.readUInt16BE(offset + offsets.len, true);

      if (len !== ofp.sizes.ofp_action_nw_addr) {
        throw new Error(util.format('%s action at offset %d has invalid length (%d).',
                                    action.header.type, offset, len));
      }

      action.body.nw_addr = packet.ipv4ToString(buffer, offset + offsets.nw_addr);

      return {
        action: action,
        offset: offset + len
      };
    }
  };
})();
