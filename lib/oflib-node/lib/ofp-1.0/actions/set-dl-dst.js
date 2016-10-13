/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

const util = require('util');
const ofp = require('../ofp.js');
const packet = require('../../packet.js');

const offsets = ofp.offsets.ofp_action_dl_addr;

module.exports = {
  unpack: function (buffer, offset) {
    let action = {
      header: {type: 'OFPAT_SET_DL_DST'},
      body: {},
    };

    const len = buffer.readUInt16BE(offset + offsets.len, true);
    if (len !== ofp.sizes.ofp_action_dl_addr) {
      throw new Error(util.format('%s action at offset %d has invalid length (%d).',
                      action.header.type, offset, len));
    }

    action.body.dl_addr = packet.ethToString(buffer, offset + offsets.dl_addr);

    return {
      action: action,
      offset: offset + len,
    };
  },
};
