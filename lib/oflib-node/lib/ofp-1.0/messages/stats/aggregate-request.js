/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

const util = require('util');
const ofp = require('../../ofp.js');
const match = require('../../structs/match.js');

const offsetsHeader = ofp.offsets.ofp_header;
const offsets = ofp.offsets.ofp_aggregate_stats_request;

module.exports = {
  unpack: function (buffer, offset) {
    let stats = {
      header: {type: 'OFPST_AGGREGATE'},
      body: {},
    };

    var len = buffer.readUInt16BE(offset + offsetsHeader.length, true);

    // NOTE: ofp_aggregate_stats_request contains a standard match structure
    if (len !== ofp.sizes.ofp_stats_request + ofp.sizes.ofp_aggregate_stats_request) {
      throw new Error(util.format('%s stats message at offset %d has invalid length (%d).',
                                  stats.header.type, offset, len));
    }

    var unpack = match.unpack(buffer, offset + ofp.sizes.ofp_stats_request + offsets.match);
    stats.body.match = unpack.match;

    stats.body.table_id = buffer.readUInt8(offset + ofp.sizes.ofp_stats_request + offsets.table_id, true);
    if (stats.body.table_id === ofp.ofp_table.OFPTT_EMERG) {
      stats.body.table_id = 'OFPTT_EMERG';
    }
    if (stats.body.table_id === ofp.ofp_table.OFPTT_ALL) {
      stats.body.table_id = 'OFPTT_ALL';
    }

    var out_port = buffer.readUInt16BE(offset + ofp.sizes.ofp_stats_request + offsets.out_port, true);
    if (out_port > ofp.ofp_port.OFPP_MAX) {
      if (out_port !== ofp.ofp_port.OFPP_ALL) {
        stats.body.out_port = out_port;
        console.warn('%s stats message at offset %d has invalid out_port (%d).',
                     stats.header.type, offset, out_port);
      }
    } else {
      stats.body.out_port = out_port;
    }

    return {
      stats: stats,
      offset: offset + len,
    };
  },
};
