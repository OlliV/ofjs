/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

(function () {
  const util = require('util');
  const ofp = require('../ofp.js');
  const queue = require('../structs/packet-queue.js');

  const offsetsHeader = ofp.offsets.ofp_header;
  const offsets = ofp.offsets.ofp_queue_get_config_reply;

  module.exports = {
    unpack: function (buffer, offset) {
      let message = {
        header: {type: 'OFPT_QUEUE_GET_CONFIG_REPLY'},
        body: {}
      };

      let len = buffer.readUInt16BE(offset + offsetsHeader.length, true);

      if (len < ofp.sizes.ofp_queue_get_config_reply) {
        throw new Error(util.format('%s message at offset %d has invalid length (%d).',
                        message.header.type, offset, len));
      }

      let port = buffer.readUInt16BE(offset + offsets.port, true);
      if (port > ofp.ofp_port.OFPP_MAX) {
        console.watn('%s message at offset %d has invalid length (%d).',
                     message.header.type, offset, len);
      }
      message.body.port = port;

      message.body.queues = [];

      let pos = offset + offsets.queues;
      while (pos < offset + len) {
        let unpack = queue.unpack(buffer, pos);

        message.body.queues.push(unpack['packet-queue']);
        pos = unpack.offset;
      }

      if (pos !== offset + len) {
        throw new Error(util.format('%s message at offset %d has extra bytes (%d).',
                                    message.header.type, offset, (pos - len)));
      }

      return {
        message: message,
        offset: offset + len
      };
    }
  };
})();
