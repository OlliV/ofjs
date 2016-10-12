/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

"use strict";

(function() {
  const util = require('util');
  const ofp = require('../ofp.js');
  const aggregate = require('./stats/aggregate-request.js');
  const desc = require('./stats/desc-request.js');
  const vendor = require('./stats/vendor-request.js');
  const flow = require('./stats/flow-request.js');
  const port = require('./stats/port-request.js');
  const queue = require('./stats/queue-request.js');
  const table = require('./stats/table-request.js');

  const offsetsHeader = ofp.offsets.ofp_header;
  const offsets = ofp.offsets.ofp_stats_request;

  module.exports = {
    unpack: function(buffer, offset) {
      var message = {
        header: {type: 'OFPT_STATS_REQUEST'}
      };

      var len = buffer.readUInt16BE(offset + offsetsHeader.length, true);

      if (len < ofp.sizes.ofp_stats_request) {
        throw new Error(util.format('%s message at offset %d has invalid length (%d).',
                                    message.header.type, offset, len));
      }

      var type = buffer.readUInt16BE(offset + offsets.type, true);

      switch (type) {
        case ofp.ofp_stats_types.OFPST_DESC: { var unpack = desc.unpack(buffer, offset); break; }
        case ofp.ofp_stats_types.OFPST_FLOW: { var unpack = flow.unpack(buffer, offset); break; }
        case ofp.ofp_stats_types.OFPST_AGGREGATE: { var unpack = aggregate.unpack(buffer, offset); break; }
        case ofp.ofp_stats_types.OFPST_TABLE: { var unpack = table.unpack(buffer, offset); break; }
        case ofp.ofp_stats_types.OFPST_PORT: { var unpack = port.unpack(buffer, offset); break; }
        case ofp.ofp_stats_types.OFPST_QUEUE: { var unpack = queue.unpack(buffer, offset); break; }
        case ofp.ofp_stats_types.OFPST_vendor: { var unpack = vendor.unpack(buffer, offset); break; }
        default:
          throw new Error(util.format('%s message at offset %d has invalid type (%d).',
                                      message.header.type, offset, type));
      }
      message.body = unpack.stats;


      var flags = buffer.readUInt16BE(offset + offsets.flags, true);
      if (flags !== 0) {
        console.warn('%s message at offset %d has invalid flags (%d).',
                     message.header.type, offset, flags);
      }
      message.body.header.flags = [];

      return {
        message: message,
        offset: offset + len
      }
    }
  }
})();
