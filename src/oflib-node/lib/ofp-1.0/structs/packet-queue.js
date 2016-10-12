/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

(function() {
  const util = require('util');
  const ofp = require('../ofp.js');
  const ofputil = require('../../util.js');
  const queueProp = require('../structs/queue-prop.js');

  const offsets = ofp.offsets.ofp_packet_queue;

  module.exports = {
    struct: 'packet-queue',

    unpack: function(buffer, offset) {
      var packetQueue = {};

      if (buffer.length < offset + ofp.sizes.ofp_packet_queue) {
        throw new Error(util.format('packet-queue at offset %d has invalid length (%d).',
              offset, (buffer.length - offset)));
      }

      var len = buffer.readUInt16BE(offset + offsets.len, true);

      if (len < ofp.sizes.ofp_packet_queue) {
        throw new Error(util.format('packet-queue at offset %d has invalid length (%d).',
              offset, (buffer.length - offset)));
      }

      packetQueue.queue_id = buffer.readUInt32BE(offset, true);
      if (packetQueue.queue_id === ofp.OFPQ_ALL) {
        console.warn('packet-queue at offset %d has invalid queue_id (%d).',
                     offset, packetQueue.queue_id);
      }

      packetQueue.properties = [];

      var pos = offset + offsets.properties;
      while (pos < offset + len) {
        var prop = queueProp.unpack(buffer, pos);

        packetQueue.properties.push(prop['queue-prop']);
        pos = prop.offset;
      }

      if (pos !== offset + len) {
        throw new Error(util.format('queue-prop at offset %d has extra bytes (%d).',
              offset, (pos - len)));
      }

      return {
        'packet-queue': packetQueue,
        offset: offset + len
      }
    }
  }
})();
