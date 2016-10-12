/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

(function () {
  const util = require('util');
  const ofp = require('../ofp.js');
  const ofputil = require('../../util.js');
  const match = require('../structs/match.js');

  const offsetsHeader = ofp.offsets.ofp_header;
  const offsets = ofp.offsets.ofp_flow_removed;

  module.exports = {
    unpack: function (buffer, offset) {
      let message = {
        header: {type: 'OFPT_FLOW_REMOVED'},
        body: {}
      };

      let len = buffer.readUInt16BE(offset + offsetsHeader.length, true);

      if (len < ofp.sizes.ofp_flow_removed) {
        throw new Error(util.format('%s message at offset %d has invalid length (%d).',
                                    message.header.type, offset, len));
      }

      // NOTE: ofp_flow_mod does contain a standard match structure!
      var unpack = match.unpack(buffer, offset + offsets.match);
      message.body.match = unpack.match;

      message.body.cookie = new Buffer(8);
      buffer.copy(message.body.cookie, 0, offset + offsets.cookie, offset + offsets.cookie + 8);

      message.body.priority = buffer.readUInt16BE(offset + offsets.priority, true);

      let reason = buffer.readUInt8(offset + offsets.reason, true);
      if (!ofputil.setEnum(message.body, 'reason', reason, ofp.ofp_flow_removed_reason_rev)) {
        message.body.reason = reason;
        console.warn('%s message at offset %d has invalid reason (%d).',
                     message.header.type, offset, reason);
      }

      message.body.duration_sec = buffer.readUInt32BE(offset + offsets.duration_sec);
      message.body.duration_nsec = buffer.readUInt32BE(offset + offsets.duration_nsec);

      ofputil.setIfNotEq(message.body, 'idle_timeout', buffer.readUInt16BE(offset + offsets.idle_timeout, true), 0);

      message.body.packet_count = [buffer.readUInt32BE(offset + offsets.packet_count, true),
      buffer.readUInt32BE(offset + offsets.packet_count + 4, true)];

      message.body.byte_count = [buffer.readUInt32BE(offset + offsets.byte_count, true),
      buffer.readUInt32BE(offset + offsets.byte_count + 4, true)];

      return {
        message: message,
        offset: offset + len
      };
    }
  };
})();
