/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

const util = require('util');
const ofp = require('../ofp.js');

const offsets = ofp.offsets.ofp_action_output;

module.exports = {
  unpack: function (buffer, offset) {
    let action = {
      header: {type: 'OFPAT_OUTPUT'},
      body: {},
    };

    let len = buffer.readUInt16BE(offset + offsets.len, true);
    if (len !== ofp.sizes.ofp_action_output) {
      throw new Error(util.format('%s action at offset %d has invalid length (%d).',
                                  action.header.type, offset, len));
    }

    action.body.port = buffer.readUInt16BE(offset + offsets.port, true);

    if (action.body.port === 0) {
      console.warn('%s action at offset %d has invalid port (%d).',
                   action.header.type, offset, action.body.port);
      return {
        action: action,
        offset: offset + len,
      };
    }

    if (action.body.port <= ofp.ofp_port.OFPP_MAX) {
      return {
        action: action,
        offset: offset + len,
      };
    }

    if (action.body.port === ofp.ofp_port.OFPP_CONTROLLER) {
      action.body.port = 'OFPP_CONTROLLER';
      action.body.max_len = buffer.readUInt16BE(offset + offsets.max_len, true);

      return {
        action: action,
        offset: offset + len,
      };
    }

    if (action.body.port === ofp.ofp_port.OFPP_ALL) {
      action.body.port = 'OFPP_ALL';

      console.warn('%s action at offset %d has invalid port (%d).',
                   action.header.type, offset, action.body.port);
      return {
        action: action,
        offset: offset + len,
      };
    }

    /* special values */
    if (action.body.port in ofp.ofp_port_rev) {
      action.body.port = ofp.ofp_port_rev[action.body.port];
      return {
        action: action,
        offset: offset + len,
      };
    } else {
      console.warn('%s action at offset %d has invalid port (%d).',
                   action.header.type, offset, action.body.port);
      return {
        action: action,
        offset: offset + len,
      };
    }
  },
  pack: function (action, buffer, offset) {
    if (buffer.length < offset + ofp.sizes.ofp_action_output) {
      throw new Error(util.format('%s action at offset %d does not fit the buffer.',
                                  action.header.type, offset));
    }

    buffer.writeUInt16BE(ofp.ofp_action_type.OFPAT_OUTPUT, offset + offsets.type, true);
    buffer.writeUInt16BE(ofp.sizes.ofp_action_output, offset + offsets.len, true);

    if (action.body.port <= ofp.ofp_port.OFPP_MAX) {  // TODO: Check OFPP_MAX
      buffer.writeUInt16BE(action.body.port, offset + offsets.port, true);
      // buffer.writeUInt16BE(0, offset + offsets.max_len, true);
      // buffer.fill(0, offset + offsets.pad, offset + offsets.pad + 6);

      return { offset: offset + ofp.sizes.ofp_action_output };
    }

    if (action.body.port === 'OFPP_CONTROLLER') {
      buffer.writeUInt32BE(ofp.ofp_port.OFPP_CONTROLLER, offset + offsets.port, true);
      buffer.writeUInt16BE(action.body.max_len, offset + offsets.max_len, true);
      // buffer.fill(0, offset + offsets.pad, offset + offsets.pad + 6);

      return { offset: offset + ofp.sizes.ofp_action_output };
    }

    if (action.body.port === 'OFPP_ANY') {
      buffer.writeUInt32BE(ofp.ofp_port.OFPP_ANY, offset + offsets.port, true);
      // buffer.writeUInt16BE(0, offset + offsets.max_len, true);
      // buffer.fill(0, offset + offsets.pad, offset + offsets.pad + 6);

      console.warn('%s action at offset %d has invalid port (%d).',
                   action.header.type, offset, action.body.port);
      return { offset: offset + ofp.sizes.ofp_action_output };
    }

    /* special values */
    if (action.body.port in ofp.ofp_port) {  // TODO  :ofp_port_no?
      buffer.writeUInt16BE(ofp.ofp_port[action.body.port], offset + offsets.port, true);
      // buffer.writeUInt16BE(0, offset + offsets.max_len, true);
      // buffer.fill(0, offset + offsets.pad, offset + offsets.pad + 6);
      return { offset: offset + ofp.sizes.ofp_action_output };
    } else {
      buffer.writeUInt16BE(action.body.port, offset + offsets.port, true);
      // buffer.writeUInt16BE(0, offset + offsets.max_len, true);
      // buffer.fill(0, offset + offsets.pad, offset + offsets.pad + 6);
      console.warn('%s action at offset %d has invalid port (%d).',
                   action.header.type, offset, action.body.port);
      return {
        offset: offset + ofp.sizes.ofp_action_output,
      };
    }
  },
};
