/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

"use strict";

(function() {
  const util = require('util');
  const ofp = require('../../ofp.js');
  const flowStats = require('../../structs/flow-stats.js');

  const offsetsHeader = ofp.offsets.ofp_header;

  module.exports = {
    unpack: function(buffer, offset) {
      var stats = {
        header: {type: 'OFPST_FLOW'},
        body: {}
      };

      var len = buffer.readUInt16BE(offset + offsetsHeader.length, true);

      if (len < ofp.sizes.ofp_stats_reply) {
        throw new Error(util.format('%s stats message at offset %d has invalid length (%d).',
                                    stats.header.type, offset, len));
      }

      stats.body.stats = [];

      var pos = offset + ofp.sizes.ofp_stats_reply;
      while (pos < offset + len) {
        var unpack = flowStats.unpack(buffer, pos);

        stats.body.stats.push(unpack['flow-stats']);
        pos = unpack.offset;
      }

      if (pos !== offset + len) {
        throw new Error(util.format('%s stats message at offset %d has extra bytes (%d).',
                                    stats.header.type, offset, (pos - len)));
      }

      return {
        stats: stats,
        offset: offset + len
      }
    }
  }
})();
