/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

const util = require('util');
const ofp = require('../ofp.js');
const ofputil = require('../../util.js');
const phyPort = require('../structs/phy-port.js');

const offsetsHeader = ofp.offsets.ofp_header;
const offsets = ofp.offsets.ofp_switch_features;

module.exports = {
  unpack: function (buffer, offset) {
    let message = {
      header: {type: 'OFPT_FEATURES_REPLY'},
      body: {},
    };

    let len = buffer.readUInt16BE(offset + offsetsHeader.length, true);

    if (len < ofp.sizes.ofp_switch_features) {
      throw new Error(util.format('%s message at offset %d has invalid length (%d).',
                                  message.header.type, offset, len));
    }

    message.body.datapath_id = buffer.toString('hex', offset + offsets.datapath_id,
                                               offset + offsets.datapath_id + 8);
    message.body.n_buffers = buffer.readUInt32BE(offset + offsets.n_buffers, true);
    message.body.n_tables = buffer.readUInt8(offset + offsets.n_tables, true);

    let capabilities = buffer.readUInt32BE(offset + offsets.capabilities, true);
    let capabilitiesParsed = ofputil.parseFlags(capabilities, ofp.ofp_capabilities);
    if (capabilitiesParsed.remain !== 0) {
      console.warn('%s message at offset %d has invalid capabilities (%d).',
                   message.header.type, offset, capabilities);
    }
    message.body.capabilities = capabilitiesParsed.array;

    let actions = buffer.readUInt32BE(offset + offsets.actions, true);
    let actionsParsed = ofputil.parseFlags(actions, ofp.ofp_action_type_flags);
    message.body.actions = actionsParsed.array;
    if (actionsParsed.remain !== 0) {
      console.warn('%s message at offset %d has invalid actions (%d).',
                   message.header.type, offset, actions);
    }

    message.body.ports = [];

    let pos = offset + offsets.ports;
    while (pos < offset + len) {
      let unpack = phyPort.unpack(buffer, pos);

      message.body.ports.push(unpack['phy-port']);
      pos = unpack.offset;
    }

    if (pos !== offset + len) {
      throw new Error(util.format('%s message at offset %d has extra bytes (%d).', message.header.type, offset, (pos - len)));
    }

    return {
      message: message,
      offset: offset + len,
    };
  },
};
