/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

(function () {
  const util = require('util');
  const ofp = require('../ofp.js');
  const packet = require('../../packet.js');

  let offsets = ofp.offsets.ofp_action_vlan_pcp;

  module.exports = {
    unpack: function (buffer, offset) {
      let action = {
        header: {type: 'OFPAT_SET_VLAN_PCP'},
        body: {}
      };

      let len = buffer.readUInt16BE(offset + offsets.len, true);
      if (len !== ofp.sizes.ofp_action_vlan_pcp) {
        throw new Error(util.format('%s action at offset %d has invalid length (%d).',
                                    action.header.type, offset, len));
      }

      action.body.vlan_pcp = buffer.readUInt8(offset + offsets.vlan_pcp, true);

      if (action.body.vlan_pcp > packet.VLAN_PCP_MAX) {
        console.warn('%s action at offset %d has invalid pcp (%d).',
                     action.header.type, offset, action.body.vlan_pcp);
      }

      return {
        action: action,
        offset: offset + len
      };
    }
  };
})();
