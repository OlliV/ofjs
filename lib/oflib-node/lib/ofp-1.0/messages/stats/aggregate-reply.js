/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

const util = require('util');
const ofp = require('../../ofp.js');

const offsetsHeader = ofp.offsets.ofp_header;
const offsets = ofp.offsets.ofp_aggregate_stats_reply;

module.exports = {
  unpack: function (buffer, offset) {
    let stats = {
      header: {type: 'OFPST_AGGREGATE'},
      body: {},
    };

    const len = buffer.readUInt16BE(offset + offsetsHeader.length, true);
    if (len !== ofp.sizes.ofp_stats_reply + ofp.sizes.ofp_aggregate_stats_reply) {
      throw new Error(util.format('%s stats message at offset %d has invalid length (%d).',
                                  stats.header.type, offset, len));
    }

    stats.body.packet_count = [buffer.readUInt32BE(offset + ofp.sizes.ofp_stats_reply + offsets.packet_count, true),
    buffer.readUInt32BE(offset + ofp.sizes.ofp_stats_reply + offsets.packet_count + 4, true)];

    stats.body.byte_count = [buffer.readUInt32BE(offset + ofp.sizes.ofp_stats_reply + offsets.byte_count, true),
    buffer.readUInt32BE(offset + ofp.sizes.ofp_stats_reply + offsets.byte_count + 4, true)];

    stats.body.flow_count = buffer.readUInt32BE(offset + ofp.sizes.ofp_stats_reply + offsets.flow_count, true);

    return {
      stats: stats,
      offset: offset + len,
    };
  },
};
