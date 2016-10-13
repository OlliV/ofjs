/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

const util = require('util');
const ofp = require('../ofp.js');
const ofputil = require('../../util.js');
const match = require('../structs/match.js');
const action = require('../action.js');

const offsetsHeader = ofp.offsets.ofp_header;
const offsets = ofp.offsets.ofp_flow_mod;

module.exports = {
  unpack: function (buffer, offset) {
    let message = {
      header: {
        type: 'OFPT_FLOW_MOD',
      },
      body: {},
    };

    const len = buffer.readUInt16BE(offset + offsetsHeader.length, true);
    if (len < ofp.sizes.ofp_flow_mod) {
      throw new Error(util.format('%s message at offset %d has invalid length (%d).',
                                  message.header.type, offset, len));
    }

    let unpack = match.unpack(buffer, offset + offsets.match);
    message.body.match = unpack.match;

    // TODO: Sanity check and remove unused fields vs. command
    message.body.cookie = new Buffer(8);
    buffer.copy(message.body.cookie, 0, offset + offsets.cookie, offset + offsets.cookie + 8);

    let command = buffer.readUInt16BE(offset + offsets.command, true);
    if (!(ofputil.setEnum(message.body, 'command', command, ofp.ofp_flow_mod_command_rev))) {
      message.body.command = command;
      console.warn('%s message at offset %d has invalid command (%d).', message.header.type, offset, len);
    }

    ofputil.setIfNotEq(message.body, 'idle_timeout', buffer.readUInt16BE(offset + offsets.idle_timeout, true), 0);
    ofputil.setIfNotEq(message.body, 'hard_timeout', buffer.readUInt16BE(offset + offsets.hard_timeout, true), 0);

    message.body.priority = buffer.readUInt16BE(offset + offsets.priority, true);

    ofputil.setIfNotEq(message.body, 'buffer_id', buffer.readUInt32BE(offset + offsets.buffer_id, true), 0xffffffff);

    let out_port = buffer.readUInt16BE(offset + offsets.out_port, true);
    if (out_port > ofp.ofp_port.OFPP_MAX) {
      if (out_port !== ofp.ofp_port.OFPP_ANY) {
        message.body.out_port = out_port;
        console.warn('%s message at offset %d has invalid out_port (%d).',
                     message.header.type, offset, out_port);
      }
    } else {
      message.body.out_port = out_port;
    }

    let flags = buffer.readUInt16BE(offset + offsets.flags, true);
    let flagsParsed = ofputil.parseFlags(flags, ofp.ofp_flow_mod_flags);
    if (flagsParsed.remain !== 0) {
        console.warn('%s message at offset %d has invalid flags (%d).', message.header.type, offset, flags);
    }
    message.body.flags = flagsParsed.array;

    message.body.actions = [];

    // NOTE: ofp_flow_mod does contain a standard match structure!
    let pos = offset + offsets.actions;
    while (pos < offset + len) {
      let unpack = action.unpack(buffer, pos);

      message.body.actions.push(unpack.action);
      pos = unpack.offset;
    }

    if (pos !== offset + len) {
      throw new Error(util.format('%s message at offset %d has extra bytes (%d).',
                                  message.header.type, offset, (pos - len)));
    }

    return {
      message: message,
      offset: offset + len,
    };
  },
  pack: function (message, buffer, offset) {
    if (buffer.length < offset + ofp.sizes.ofp_flow_mod) {
      throw new Error(util.format('%s message at offset %d does not fit the buffer.',
                                  message.header.type, offset));
    }

    buffer.writeUInt8(ofp.ofp_type.OFPT_FLOW_MOD, offset + offsetsHeader.type, true);

    if ('cookie' in message.body) {
      message.body.cookie.copy(buffer, offset + offsets.cookie);
    } else {
      buffer.fill(0x00, offset + offsets.cookie, offset + offsets.cookie + 8); // TODO fill ?
      // buffer.fill(0xff, offset + offsets.cookie_mask, offset + offsets.cookie_mask + 8); // TODO fill ?
    }

    let command;
    if (message.body.command in ofp.ofp_flow_mod_command) {
      command = ofp.ofp_flow_mod_command[message.body.command];
    } else {
      command = 0;
      console.warn('%s message at offset %d has invalid command (%s).',
                   message.header.type, offset, message.body.command);
    }
    buffer.writeUInt16BE(command, offset + offsets.command, true); //GB check this!!


    const idle_timeout = message.body.idle_timeout ? message.body.idle_timeout : 0;
    buffer.writeUInt16BE(idle_timeout, offset + offsets.idle_timeout, true);


    const hard_timeout = message.body.hard_timeout ? message.body.hard_timeout : 0;
    buffer.writeUInt16BE(hard_timeout, offset + offsets.hard_timeout, true);

    const priority = message.body.priority ? message.body.priority : 32768;
    buffer.writeUInt16BE(priority, offset + offsets.priority, true);

    const buffer_id = message.body.buffer_id ? message.body.buffer_id : 0xffffffff;
    buffer.writeUInt32BE(buffer_id, offset + offsets.buffer_id, true);

    let out_port;
    if ('out_port' in message.body) {
      if (ofp.ofp_port[message.body.out_port] <= ofp.ofp_port.OFPP_MAX){
        out_port = message.body.out_port
      }
      if (message.body.out_port in ofp.ofp_port){
        out_port = ofp.ofp_port[message.body.out_port]
      }
    } else {
      out_port = ofp.ofp_port_no.OFPP_ANY;
    }
    buffer.writeUInt32BE(out_port, offset + offsets.out_port, true);

    let flags = 0;
    message.body.flags.forEach((f) => {
      if (f in ofp.ofp_flow_mod_flags) {
        flags |= ofp.ofp_flow_mod_flags[f];
      } else {
        console.warn('%s message at offset %d has invalid flag (%s).',
                     message.header.type, offset, f);
      }
    });
    buffer.writeUInt16BE(flags, offset + offsets.flags, true);
    // buffer.fill(0, offset + offsets.pad, offset + offsets.pad + 2);


    const pack1 = match.pack(message.body.match, buffer, offset + offsets.match);
    const pack2 = action.pack(message.body.actions, buffer, offset + offsets.actions);
    const pos = offset + offsets.actions + 8;

    return { offset: pos };
  },
};
