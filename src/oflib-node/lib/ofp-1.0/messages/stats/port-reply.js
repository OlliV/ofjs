/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

(function () {
  const util = require('util');
  const ofp = require('../../ofp.js');
  const portStats = require('../../structs/port-stats.js');

  let offsetsHeader = ofp.offsets.ofp_header;

  module.exports = {
    unpack: function (buffer, offset) {
      let stats = {
        header: {type: 'OFPST_PORT'},
        body: {}
      };

      let len = buffer.readUInt16BE(offset + offsetsHeader.length, true);

      if (len < ofp.sizes.ofp_stats_reply) {
        throw new Error(util.format('%s stats message at offset %d has invalid length (%d).',
                                    stats.header.type, offset, len));
      }

      stats.body.stats = [];

      let pos = offset + ofp.sizes.ofp_stats_reply;
      while (pos < offset + len) {
        let unpack = portStats.unpack(buffer, pos);

        stats.body.stats.push(unpack['port-stats']);
        pos = unpack.offset;
      }

      if (pos !== offset + len) {
        throw new Error(util.format('%s stats message at offset %d has extra bytes (%d).',
                                    stats.header.type, offset, (pos - len)));
      }

      return {
        stats: stats,
        offset: offset + len
      };
    }
  };
})();
