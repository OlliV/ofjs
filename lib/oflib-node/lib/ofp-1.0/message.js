/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

const util = require('util');
const ofp = require('./ofp.js');

const barrierReply = require('./messages/barrier-reply.js');
const barrierRequest = require('./messages/barrier-request.js');
const echoReply = require('./messages/echo-reply.js');
const echoRequest = require('./messages/echo-request.js');
const error = require('./messages/error.js');
const featuresReply = require('./messages/features-reply.js');
const featuresRequest = require('./messages/features-request.js');
const flowMod = require('./messages/flow-mod.js');
const flowRemoved = require('./messages/flow-removed.js');
const getConfigReply = require('./messages/get-config-reply.js');
const getConfigRequest = require('./messages/get-config-request.js');
const hello = require('./messages/hello.js');
const packetIn = require('./messages/packet-in.js');
const packetOut = require('./messages/packet-out.js');
const portMod = require('./messages/port-mod.js');
const portStatus = require('./messages/port-status.js');
const queueGetConfigReply = require('./messages/queue-get-config-reply.js');
const queueGetConfigRequest = require('./messages/queue-get-config-request.js');
const setConfig = require('./messages/set-config.js');
const statsReply = require('./messages/stats-reply.js');
const statsRequest = require('./messages/stats-request.js');
const vendor = require('./messages/vendor.js');

const offsets = ofp.offsets.ofp_header;

module.exports = {
  struct: 'message',
  unpack: function (buffer, offset) {
    if (buffer.length < offset + ofp.sizes.ofp_header) {
      throw new Error(util.format('message at offset %d is too short (%d).',
                                  offset, (buffer.length - offset)));
    }

    const version = buffer.readUInt8(offset + offsets.version, true);
    if (version !== ofp.OFP_VERSION) {
      throw new Error(util.format('message at offset %d has wrong version (%d).',
                                  offset, version));
    }

    const len = buffer.readUInt16BE(offset + offsets.length, true);
    if (buffer.length < offset + len) {
      throw new Error(util.format('message at offset %d is too short (%d).',
                                  offset, (buffer.length - offset)));
    }

    let unpack;
    const type = buffer.readUInt8(offset + offsets.type, true);
    switch (type) {
      case ofp.ofp_type.OFPT_HELLO: { unpack = hello.unpack(buffer, offset); break; }
      case ofp.ofp_type.OFPT_ERROR: { unpack = error.unpack(buffer, offset); break; }
      case ofp.ofp_type.OFPT_ECHO_REQUEST: { unpack = echoRequest.unpack(buffer, offset); break; }
      case ofp.ofp_type.OFPT_ECHO_REPLY: { unpack = echoReply.unpack(buffer, offset); break; }
      case ofp.ofp_type.OFPT_VENDOR: { unpack = vendor.unpack(buffer, offset); break; }
      case ofp.ofp_type.OFPT_FEATURES_REQUEST: { unpack = featuresRequest.unpack(buffer, offset); break; }
      case ofp.ofp_type.OFPT_FEATURES_REPLY: { unpack = featuresReply.unpack(buffer, offset); break; }
      case ofp.ofp_type.OFPT_GET_CONFIG_REQUEST: { unpack = getConfigRequest.unpack(buffer, offset); break; }
      case ofp.ofp_type.OFPT_GET_CONFIG_REPLY: { unpack = getConfigReply.unpack(buffer, offset); break; }
      case ofp.ofp_type.OFPT_SET_CONFIG: { unpack = setConfig.unpack(buffer, offset); break; }
      case ofp.ofp_type.OFPT_PACKET_IN: { unpack = packetIn.unpack(buffer, offset); break; }
      case ofp.ofp_type.OFPT_FLOW_REMOVED: { unpack = flowRemoved.unpack(buffer, offset); break; }
      case ofp.ofp_type.OFPT_PORT_STATUS: { unpack = portStatus.unpack(buffer, offset); break; }
      case ofp.ofp_type.OFPT_PACKET_OUT: { unpack = packetOut.unpack(buffer, offset); break; }
      case ofp.ofp_type.OFPT_FLOW_MOD: { unpack = flowMod.unpack(buffer, offset); break; }
      case ofp.ofp_type.OFPT_PORT_MOD: { unpack = portMod.unpack(buffer, offset); break; }
      case ofp.ofp_type.OFPT_STATS_REQUEST: { unpack = statsRequest.unpack(buffer, offset); break; }
      case ofp.ofp_type.OFPT_STATS_REPLY: { unpack = statsReply.unpack(buffer, offset); break; }
      case ofp.ofp_type.OFPT_BARRIER_REQUEST: { unpack = barrierRequest.unpack(buffer, offset); break; }
      case ofp.ofp_type.OFPT_BARRIER_REPLY: { unpack = barrierReply.unpack(buffer, offset); break; }
      case ofp.ofp_type.OFPT_QUEUE_GET_CONFIG_REQUEST: { unpack = queueGetConfigRequest.unpack(buffer, offset); break; }
      case ofp.ofp_type.OFPT_QUEUE_GET_CONFIG_REPLY: { unpack = queueGetConfigReply.unpack(buffer, offset); break; }
      default:
        throw new Error(util.format('message at offset %d has invalid type (%d).', offset, type));
    }

    unpack.message.version = '1.0';
    unpack.message.header.xid = buffer.readUInt32BE(offset + offsets.xid, true);
    return unpack;
  },
  pack: function (message, buffer, offset) {
    if (buffer.length < offset + ofp.sizes.ofp_header) {
      throw new Error(`message at offset ${offset} does not fit the buffer.`);
    }

    let pack;
    switch (message.header.type) {
      case 'OFPT_HELLO': { pack = hello.pack(message, buffer, offset); break; }
      case 'OFPT_ERROR': { pack = error.pack(message, buffer, offset); break; }
      case 'OFPT_ECHO_REQUEST': { pack = echoRequest.pack(message, buffer, offset); break; }
      case 'OFPT_ECHO_REPLY': { pack = echoReply.pack(message, buffer, offset); break; }
      case 'OFPT_VENDOR': { pack = vendor.pack(message, buffer, offset); break; }
      case 'OFPT_FEATURES_REQUEST': { pack = featuresRequest.pack(message, buffer, offset); break; }
      case 'OFPT_FEATURES_REPLY': { pack = featuresReply.pack(message, buffer, offset); break; }
      case 'OFPT_GET_CONFIG_REQUEST': { pack = getConfigRequest.pack(message, buffer, offset); break; }
      case 'OFPT_GET_CONFIG_REPLY': { pack = getConfigReply.pack(message, buffer, offset); break; }
      case 'OFPT_SET_CONFIG': { pack = setConfig.pack(message, buffer, offset); break; }
      case 'OFPT_PACKET_IN': { pack = packetIn.pack(message, buffer, offset); break; }
      case 'OFPT_FLOW_REMOVED': { pack = flowRemoved.pack(message, buffer, offset); break; }
      case 'OFPT_PORT_STATUS': { pack = portStatus.pack(message, buffer, offset); break; }
      case 'OFPT_PACKET_OUT': { pack = packetOut.pack(message, buffer, offset); break; }
      case 'OFPT_FLOW_MOD': { pack = flowMod.pack(message, buffer, offset); break; }
      case 'OFPT_PORT_MOD': { pack = portMod.pack(message, buffer, offset); break; }
      case 'OFPT_STATS_REQUEST': { pack = statsRequest.pack(message, buffer, offset); break; }
      case 'OFPT_STATS_REPLY': { pack = statsReply.pack(message, buffer, offset); break; }
      case 'OFPT_BARRIER_REQUEST': { pack = barrierRequest.pack(message, buffer, offset); break; }
      case 'OFPT_BARRIER_REPLY': { pack = barrierReply.pack(message, buffer, offset); break; }
      case 'OFPT_QUEUE_GET_CONFIG_REQUEST': { pack = queueGetConfigRequest.pack(message, buffer, offset); break; }
      case 'OFPT_QUEUE_GET_CONFIG_REPLY': { pack = queueGetConfigReply.pack(message, buffer, offset); break; }
      default:
        throw new Error(util.format('unknown message at %d (%s).', offset, message.header.type));
    }

    buffer.writeUInt8(ofp.OFP_VERSION, offset + offsets.version, true);
    buffer.writeUInt16BE(pack.offset - offset, offset + offsets.length, true);
    buffer.writeUInt32BE(message.header.xid, offset + offsets.xid, true);

    return pack;
  },
};
