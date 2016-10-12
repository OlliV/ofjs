/*
 * 16BE
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

const util = require('util');
const ofp = require('../ofp.js');
const ofputil = require('../../util.js');

const offsets = ofp.offsets.ofp_queue_stats;

module.exports = {
  struct: 'queue-stats',
  unpack: function (buffer, offset) {
    let queueStats = {};

    if (buffer.length < ofp.sizes.ofp_queue_stats) {
      throw new Error(util.format('queue-stats at offset %d has invalid length (%d).',
                                  offset, buffer.length));
    }

    queueStats.port_no = buffer.readUInt16BE(offset + offsets.port_no, true);

    if (queueStats.port_no > ofp.ofp_port.OFPP_MAX) {
      if (queueStats.port_no === ofp.ofp_port.OFPP_LOCAL) {
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

    const txBytes = [buffer.readUInt32BE(offset + offsets.tx_bytes, true), buffer.readUInt32BE(offset + offsets.tx_bytes + 4, true)];
    if (!ofputil.isUint64All(txBytes)) {
      queueStats.tx_bytes = txBytes;
    }

    const txPackets = [buffer.readUInt32BE(offset + offsets.tx_packets, true), buffer.readUInt32BE(offset + offsets.tx_packets + 4, true)];
    if (!ofputil.isUint64All(txPackets)) {
      queueStats.tx_packets = txPackets;
    }

    const txErrors = [buffer.readUInt32BE(offset + offsets.tx_errors, true), buffer.readUInt32BE(offset + offsets.tx_errors + 4, true)];
    if (!ofputil.isUint64All(txErrors)) {
      queueStats.tx_errors = txErrors;
    }

    return {
      'queue-stats': queueStats,
      offset: offset + ofp.sizes.ofp_queue_stats,
    };
  },
};
