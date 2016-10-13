/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

const util = require('util');
const ofp = require('../ofp.js');

const offsets = ofp.offsets.ofp_action_tp_port;

module.exports = {
  unpack: function (buffer, offset) {
    let action = {
      header: {type: 'OFPAT_SET_TP_SRC'},
      body: {},
    };

    const len = buffer.readUInt16BE(offset + offsets.len, true);
    if (len !== ofp.sizes.ofp_action_tp_port) {
      throw new Error(util.format('%s action at offset %d has invalid length (%d).',
                                  action.header.type, offset, len));
    }

    action.body.tp_port = buffer.readUInt16BE(offset + offsets.tp_port, true);

    return {
      action: action,
      offset: offset + len,
    };
  },
};
