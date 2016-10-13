/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

const util = require('util');
const ofp = require('../../ofp.js');

const offsetsHeader = ofp.offsets.ofp_header;

module.exports = {
  unpack: function (buffer, offset) {
    let stats = {
      header: {type: 'OFPST_VENDOR'},
      body: {},
    };

    const len = buffer.readUInt16BE(offset + offsetsHeader.length, true);
    if (len < ofp.sizes.ofp_stats_request + 4) {  // 4 : vendor
      throw new Error(util.format('%s stats message at offset %d has invalid length (%d).',
                                  stats.header.type, offset, len));
    }

    stats.body.vendor = buffer.readUInt32BE(offset + ofp.sizes.ofp_stats_request, true);

    let dataLen = len - offset - ofp.sizes.ofp_stats_request - 4;
    if (dataLen > 0) {
      stats.body.data = new Buffer(dataLen);
      buffer.copy(stats.body.data,
                  0,
                  offset + ofp.sizes.ofp_header + ofp.sizes.ofp_stats_request + 4,
                  offset + ofp.sizes.ofp_header + ofp.sizes.ofp_stats_request + 4 + dataLen);
    }

    return {
      stats: stats,
      offset: offset + len,
    };
  },
};
