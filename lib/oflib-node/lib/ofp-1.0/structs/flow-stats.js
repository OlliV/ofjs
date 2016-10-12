/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

"use strict";

const util = require('util');
const ofp = require('../ofp.js');
const ofputil = require('../../util.js');
const match = require('../structs/match.js');
const action = require('../action.js');

const offsets = ofp.offsets.ofp_flow_stats;

module.exports = {
  struct : 'flow-stats',

  unpack : function (buffer, offset) {
    var flowStats = {};

    if (buffer.length < offset + ofp.sizes.ofp_flow_stats) {
      throw new Error(util.format('flow-stats at offset %d has invalid length (%d).',
            offset, (buffer.length - offset)));
    }

    var len = buffer.readUInt16BE(offset + offsets.length, true);
    // NOTE: ofp_flow_stats contains a whole standard match structure
    if (len < ofp.sizes.ofp_flow_stats) {
      throw new Error(util.format('flow-stats at offset %d has invalid length (%d).',
            offset, len));
    }

    flowStats.table_id = buffer.readUInt8(offset + offsets.table_id);
    if (flowStats.table_id > ofp.ofp_table.OFPTT_MAX) {
      console.warn('flow-stats at offset %d has invalid table_id (%d).',
                   offset, flowStats.table_id);
    }

    var unpack = match.unpack(buffer, offset + offsets.match);
    flowStats.match = unpack.match;

    flowStats.duration_sec = buffer.readUInt32BE(offset + offsets.duration_sec, true);
    flowStats.duration_nsec = buffer.readUInt32BE(offset + offsets.duration_nsec, true);

    flowStats.priority = buffer.readUInt16BE(offset + offsets.priority, true);

    ofputil.setIfNotEq(flowStats, "idle_timeout", buffer.readUInt16BE(offset + offsets.idle_timeout, true), 0);
    ofputil.setIfNotEq(flowStats, "hard_timeout", buffer.readUInt16BE(offset + offsets.hard_timeout, true), 0);

    flowStats.cookie = new Buffer(8);
    buffer.copy(flowStats.cookie, 0, offset + offsets.cookie, offset + offsets.cookie + 8);

    flowStats.packet_count = [buffer.readUInt32BE(offset + offsets.packet_count, true),
    buffer.readUInt32BE(offset + offsets.packet_count + 4, true)];

    flowStats.byte_count = [buffer.readUInt32BE(offset + offsets.byte_count, true),
    buffer.readUInt32BE(offset + offsets.byte_count+ 4, true)];



    flowStats.actions = [];

    // NOTE: ofp_flow_stats contains a whole standard match structure
    var pos = offset + offsets.actions;
    while (pos < offset + len) {
      var act = action.unpack(buffer, pos);

      flowStats.actions.push(act.action);
      pos = act.offset;
    }

    if (pos !== offset + len) {
      throw new Error(util.format('flow-stats at offset %d has extra bytes (%d).',
                      offset, (pos - len)));
    }

    return {
      'flow-stats': flowStats,
      offset: offset + len
    };
  },
};
