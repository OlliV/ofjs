/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

const util = require('util');
const ofp = require('../ofp.js');
const ofputil = require('../../util.js');

const aggregate = require('./stats/aggregate-reply.js');
const desc = require('./stats/desc-reply.js');
const vendor = require('./stats/vendor-reply.js');
const flow = require('./stats/flow-reply.js');
const port = require('./stats/port-reply.js');
const queue = require('./stats/queue-reply.js');
const table = require('./stats/table-reply.js');

const offsetsHeader = ofp.offsets.ofp_header;
const offsets = ofp.offsets.ofp_stats_reply;

module.exports = {
  unpack: function (buffer, offset) {
    let message = {
      header: {type: 'OFPT_STATS_REPLY'},
    };

    const len = buffer.readUInt16BE(offset + offsetsHeader.length, true);
    if (len < ofp.sizes.ofp_stats_reply) {
      throw new Error(util.format('%s message at offset %d has invalid length (%d).',
                                  message.header.type, offset, len));
    }

    let unpack;
    const type = buffer.readUInt16BE(offset + offsets.type, true);
    switch (type) {
      case ofp.ofp_stats_types.OFPST_DESC: { unpack = desc.unpack(buffer, offset); break; }
      case ofp.ofp_stats_types.OFPST_FLOW: { unpack = flow.unpack(buffer, offset); break; }
      case ofp.ofp_stats_types.OFPST_AGGREGATE: { unpack = aggregate.unpack(buffer, offset); break; }
      case ofp.ofp_stats_types.OFPST_TABLE: { unpack = table.unpack(buffer, offset); break; }
      case ofp.ofp_stats_types.OFPST_PORT: { unpack = port.unpack(buffer, offset); break; }
      case ofp.ofp_stats_types.OFPST_QUEUE: { unpack = queue.unpack(buffer, offset); break; }
      case ofp.ofp_stats_types.OFPST_vendor: { unpack = vendor.unpack(buffer, offset); break; }
      default:
        throw new Error(util.format('%s message at offset %d has invalid type (%d).',
                                    message.header.type, offset, type));
    }
    message.body = unpack.stats;

    var flags = buffer.readUInt16BE(offset + offsets.flags, true);
    var flagsParsed = ofputil.parseFlags(flags, ofp.ofp_stats_reply_flags);
    if (flagsParsed.remain !== 0) {
      message.body.header.flags = flags;
      console.warn('%s message at offset %d has invalid flags (%d).',
                   message.header.type, offset, flags);
    }
    message.body.header.flags = flagsParsed.array;

    return {
      message: message,
      offset: offset + len,
    };
  },
};
