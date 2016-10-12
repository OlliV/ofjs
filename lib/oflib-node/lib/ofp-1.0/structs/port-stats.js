/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

const util = require('util');
const ofp = require('../ofp.js');
const ofputil = require('../../util.js');

const offsets = ofp.offsets.ofp_port_stats;

module.exports = {
  struct: 'port-stats',
  unpack: function (buffer, offset) {
    var portStats = {};

    if (buffer.length < ofp.sizes.ofp_port_stats) {
      throw new Error(util.format('port-stats at offset %d has invalid length (%d).',
                                  offset, buffer.length));
    }

    portStats.port_no = buffer.readUInt16BE(offset + offsets.port_no, true);

    if (portStats.port_no > ofp.ofp_port.OFPP_MAX) {
      if (portStats.port_no === ofp.ofp_port.OFPP_LOCAL) {
        portStats.port_no = 'OFPP_LOCAL';
      } else {
        console.warn('port-stats at offset %d has invalid port_no (%d).',
                     offset, portStats.port_no);
      }
    }

    const rxPackets = [buffer.readUInt32BE(offset + offsets.rx_packets, true), buffer.readUInt32BE(offset + offsets.rx_packets + 4, true)];
    if (!ofputil.isUint64All(rxPackets)) {
      portStats.rx_packets = rxPackets;
    }

    const txPackets = [buffer.readUInt32BE(offset + offsets.tx_packets, true), buffer.readUInt32BE(offset + offsets.tx_packets + 4, true)];
    if (!ofputil.isUint64All(txPackets)) {
      portStats.tx_packets = txPackets;
    }

    const rxBytes = [buffer.readUInt32BE(offset + offsets.rx_bytes, true), buffer.readUInt32BE(offset + offsets.rx_bytes + 4, true)];
    if (!ofputil.isUint64All(rxBytes)) {
      portStats.rx_bytes = rxBytes;
    }

    const txBytes = [buffer.readUInt32BE(offset + offsets.tx_bytes, true), buffer.readUInt32BE(offset + offsets.tx_bytes + 4, true)];
    if (!ofputil.isUint64All(txBytes)) {
      portStats.tx_bytes = txBytes;
    }

    const rxDropped = [buffer.readUInt32BE(offset + offsets.rx_dropped, true), buffer.readUInt32BE(offset + offsets.rx_dropped + 4, true)];
    if (!ofputil.isUint64All(rxDropped)) {
      portStats.rx_dropped = rxDropped;
    }

    const txDropped = [buffer.readUInt32BE(offset + offsets.tx_dropped, true), buffer.readUInt32BE(offset + offsets.tx_dropped + 4, true)];
    if (!ofputil.isUint64All(txDropped)) {
      portStats.tx_dropped = txDropped;
    }

    const rxErrors = [buffer.readUInt32BE(offset + offsets.rx_errors, true), buffer.readUInt32BE(offset + offsets.rx_errors + 4, true)];
    if (!ofputil.isUint64All(rxErrors)) {
      portStats.rx_errors = rxErrors;
    }

    const txErrors = [buffer.readUInt32BE(offset + offsets.tx_errors, true), buffer.readUInt32BE(offset + offsets.tx_errors + 4, true)];
    if (!ofputil.isUint64All(txErrors)) {
      portStats.tx_errors = txErrors;
    }

    const rxFrameErr = [buffer.readUInt32BE(offset + offsets.rx_frame_err, true), buffer.readUInt32BE(offset + offsets.rx_frame_err + 4, true)];
    if (!ofputil.isUint64All(rxFrameErr)) {
      portStats.rx_frame_err = rxFrameErr;
    }

    const rxOverErr = [buffer.readUInt32BE(offset + offsets.rx_over_err, true), buffer.readUInt32BE(offset + offsets.rx_over_err + 4, true)];
    if (!ofputil.isUint64All(rxOverErr)) {
      portStats.rx_over_err = rxOverErr;
    }

    const rxCrcErr = [buffer.readUInt32BE(offset + offsets.rx_crc_err, true), buffer.readUInt32BE(offset + offsets.rx_crc_err + 4, true)];
    if (!ofputil.isUint64All(rxCrcErr)) {
      portStats.rx_crc_err = rxCrcErr;
    }

    const collisions = [buffer.readUInt32BE(offset + offsets.collisions, true), buffer.readUInt32BE(offset + offsets.collisions + 4, true)];
    if (!ofputil.isUint64All(collisions)) {
      portStats.collisions = collisions;
    }

    return {
      'port-stats': portStats,
      offset: offset + ofp.sizes.ofp_port_stats,
    };
  },
};
