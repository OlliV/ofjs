/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

const util = require('util');
const ofp = require('../ofp.js');
const packet = require('../../packet.js');

const offsets = ofp.offsets.ofp_action_vlan_vid;

module.exports = {
  unpack: function (buffer, offset) {
    let action = {
      header: {type: 'OFPAT_SET_VLAN_VID'},
      body: {},
    };

    const len = buffer.readUInt16BE(offset + offsets.len, true);
    if (len !== ofp.sizes.ofp_action_vlan_vid) {
      throw new Error(util.format('%s action at offset %d has invalid length (%d).',
                                  action.header.type, offset, len));
    }

    action.body.vlan_vid = buffer.readUInt16BE(offset + offsets.vlan_vid, true);
    if (action.body.vlan_pcp > packet.VLAN_VID_MAX) {
      console.warn('%s action at offset %d has invalid vid (%d).',
                   action.header.type, offset, action.body.vlan_vid);
    }

    return {
      action: action,
      offset: offset + len,
    };
  },
};
