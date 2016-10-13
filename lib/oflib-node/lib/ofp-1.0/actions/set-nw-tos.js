/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

const util = require('util');
const ofp = require('../ofp.js');
const packet = require('../../packet.js');

const offsets = ofp.offsets.ofp_action_nw_tos;

module.exports = {
  unpack: function (buffer, offset) {
    let action = {
      header: {type: 'OFPAT_SET_NW_TOS'},
      body: {},
    };

    let len = buffer.readUInt16BE(offset + offsets.len, true);

    if (len !== ofp.sizes.ofp_action_nw_tos) {
      throw new Error(util.format('%s action at offset %d has invalid length (%d).',
                                  action.header.type, offset, len));
    }

    action.body.nw_tos = buffer.readUInt8(offset + offsets.nw_tos);

    if (action.body.nw_ecn > packet.IP_DSCP_MAX) {
      console.warn('%s action at offset %d has invalid tos (%d).',
                   action.header.type, offset, action.body.nw_tos);
    }

    return {
      action: action,
      offset: offset + len,
    };
  },
};
