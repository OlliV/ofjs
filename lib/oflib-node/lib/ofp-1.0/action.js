/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

const util = require('util');
const ofp = require('./ofp.js');
const enqueue = require('./actions/enqueue.js');
const output = require('./actions/output.js');
const setDlSrc = require('./actions/set-dl-src.js');
const setDlDst = require('./actions/set-dl-dst.js');
const setNwDst = require('./actions/set-nw-dst.js');
const setNwSrc = require('./actions/set-nw-src.js');
const setNwTos = require('./actions/set-nw-tos.js');
const setTpDst = require('./actions/set-tp-dst.js');
const setTpSrc = require('./actions/set-tp-src.js');
const setVlanPcp = require('./actions/set-vlan-pcp.js');
const setVlanVid = require('./actions/set-vlan-vid.js');
const stripVlan = require('./actions/strip-vlan.js');
const vendor = require('./actions/vendor.js');

const offsets = ofp.offsets.ofp_action_output;

module.exports = {
  struct: 'action',
  unpack: function (buffer, offset) {
    if (buffer.length < offset + ofp.sizes.ofp_action_header) {
      throw new Error(util.format('action at offset %d is too short (%d).',
                                  offset, (buffer.length - offset)));
    }

    // Note: (len % 8 == 0) should be true
    const len = buffer.readUInt16BE(offset + offsets.len, true);
    if (buffer.length < offset + len) {
      throw new Error(util.format('action at offset %d has invalid length (set to %d, but only %d received).',
                                  offset, len, (buffer.length - offset)));
    }

    const type = buffer.readUInt16BE(offset + offsets.type, true);

    switch (type) {
      case ofp.ofp_action_type.OFPAT_OUTPUT: { return output.unpack(buffer, offset); }
      case ofp.ofp_action_type.OFPAT_SET_VLAN_VID: { return setVlanVid.unpack(buffer, offset); }
      case ofp.ofp_action_type.OFPAT_SET_VLAN_PCP: { return setVlanPcp.unpack(buffer, offset); }
      case ofp.ofp_action_type.OFPAT_STRIP_VLAN : { return stripVlan.unpack(buffer, offset); }
      case ofp.ofp_action_type.OFPAT_SET_DL_SRC: { return setDlSrc.unpack(buffer, offset); }
      case ofp.ofp_action_type.OFPAT_SET_DL_DST: { return setDlDst.unpack(buffer, offset); }
      case ofp.ofp_action_type.OFPAT_SET_NW_SRC: { return setNwSrc.unpack(buffer, offset); }
      case ofp.ofp_action_type.OFPAT_SET_NW_DST: { return setNwDst.unpack(buffer, offset); }
      case ofp.ofp_action_type.OFPAT_SET_NW_TOS: { return setNwTos.unpack(buffer, offset); }
      case ofp.ofp_action_type.OFPAT_SET_TP_SRC: { return setTpSrc.unpack(buffer, offset); }
      case ofp.ofp_action_type.OFPAT_SET_TP_DST: { return setTpDst.unpack(buffer, offset); }
      case ofp.ofp_action_type.OFPAT_ENQUEUE: { return enqueue.unpack(buffer, offset); }
      case ofp.ofp_action_type.OFPAT_VENDOR: { return vendor.unpack(buffer, offset); }
      default:
        throw new Error(util.format('action at offset %d has invalid type (%d).', offset, type));
    }
  },
  pack: function (action, buffer, offset) {
    if (buffer.length < offset + ofp.sizes.ofp_action_header) {
      throw new Error(util.format('action at offset %d does not fit the buffer.', offset));
    }

    switch (action.header.type) {
      case 'OFPAT_OUTPUT': { return output.pack(action, buffer, offset); }
      case 'OFPAT_SET_VLAN_VID': { return setVlanVid.pack(action, buffer, offset); }
      case 'OFPAT_SET_VLAN_PCP': { return setVlanPcp.pack(action, buffer, offset); }
      case 'OFPAT_SET_DL_SRC': { return setDlSrc.pack(action, buffer, offset); }
      case 'OFPAT_SET_DL_DST': { return setDlDst.pack(action, buffer, offset); }
      case 'OFPAT_SET_NW_SRC': { return setNwSrc.pack(action, buffer, offset); }
      case 'OFPAT_SET_NW_DST': { return setNwDst.pack(action, buffer, offset); }
      case 'OFPAT_SET_NW_TOS': { return setNwTos.pack(action, buffer, offset); }
      case 'OFPAT_SET_NW_ECN': { return setNwEcn.pack(action, buffer, offset); }
      case 'OFPAT_SET_TP_SRC': { return setTpSrc.pack(action, buffer, offset); }
      case 'OFPAT_SET_TP_DST': { return setTpDst.pack(action, buffer, offset); }
      default:
        throw new Error(util.format('unknown action at %d (%s).', offset, action.header.type));
    }
  },
};
