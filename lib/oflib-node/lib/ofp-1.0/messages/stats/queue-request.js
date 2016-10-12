/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

"use strict";

(function() {
  const util = require('util');
  const ofp = require('../../ofp.js');

  const offsetsHeader = ofp.offsets.ofp_header;
  const offsetsStats = ofp.offsets.ofp_stats_request;
  const offsets = ofp.offsets.ofp_queue_stats_request;

  module.exports = {
    unpack: function(buffer, offset) {
      var stats = {
        header: {type: 'OFPST_QUEUE'},
        body: {}
      };

      var len = buffer.readUInt16BE(offset + offsetsHeader.length, true);

      if (len !== ofp.sizes.ofp_stats_request + ofp.sizes.ofp_queue_stats_request) {
        throw new Error(util.format('%s stats message at offset %d has invalid length (%d).',
                                    stats.header.type, offset, len));
      }

      var port = buffer.readUInt16BE(offset + ofp.sizes.ofp_stats_request + offsets.port_no, true);
      if (port > ofp.ofp_port.OFPP_MAX) {
        if (port !== ofp.ofp_port.OFPP_ANY) {
          stats.body.port_no = port;
          console.warn('%s stats message at offset %d has invalid port (%d).',
                       stats.header.type, offset, port);
        }
      } else {
        stats.body.port_no = port;
      }

      var queue_id = buffer.readUInt32BE(offset + ofp.sizes.ofp_stats_request + offsets.queue_id, true);
      if (queue_id !== ofp.OFPQ_ALL) {
        stats.body.queue_id = queue_id;
      }

      return {
        stats: stats,
        offset: offset + len
      }
    }
  }
})();
