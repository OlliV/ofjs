/*16BE
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

(function() {

  const util = require('util');
  const ofp = require('../ofp.js');
  const ofputil = require('../../util.js');

  const offsets = ofp.offsets.ofp_queue_stats;

  module.exports = {
    struct: 'queue-stats',

    unpack: function(buffer, offset) {
      var queueStats = {};

      if (buffer.length < ofp.sizes.ofp_queue_stats) {
        throw new Error(util.format('queue-stats at offset %d has invalid length (%d).', offset, len));
      }

      queueStats.port_no = buffer.readUInt16BE(offset + offsets.port_no, true);

      if (queueStats.port_no > ofp.ofp_port.OFPP_MAX) {
        if (queueStats.port_no == ofp.ofp_port.OFPP_LOCAL) {
          queueStats.port_no = 'OFPP_LOCAL';
        } else {
          console.warn('queue-stats at offset %d has invalid port_no (%d).',
                       offset, queueStats.port_no);
        }
      }

      queueStats.queue_id = buffer.readUInt32BE(offset + offsets.queue_id, true);
      if (queueStats.queue_id > ofp.OFPQ_MAX) {
        console.warn('queue-stats at offset %d has invalid queue_id (%d).',
                     offset, queueStats.queue_id);
      }

      var tx_bytes = [buffer.readUInt32BE(offset + offsets.tx_bytes, true), buffer.readUInt32BE(offset + offsets.tx_bytes + 4, true)];
      if (!ofputil.isUint64All(tx_bytes)) {
        queueStats.tx_bytes = tx_bytes;
      }

      var tx_packets = [buffer.readUInt32BE(offset + offsets.tx_packets, true), buffer.readUInt32BE(offset + offsets.tx_packets + 4, true)];
      if (!ofputil.isUint64All(tx_packets)) {
        queueStats.tx_packets = tx_packets;
      }

      var tx_errors = [buffer.readUInt32BE(offset + offsets.tx_errors, true), buffer.readUInt32BE(offset + offsets.tx_errors + 4, true)];
      if (!ofputil.isUint64All(tx_errors)) {
        queueStats.tx_errors = tx_errors;
      }

      return {
        'queue-stats': queueStats,
        offset: offset + ofp.sizes.ofp_queue_stats
      };
    }
  }
})();
