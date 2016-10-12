/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

(function () {
  const util = require('util');
  const ofp = require('../ofp.js');

  let offsetsHeader = ofp.offsets.ofp_header;
  let offsets = ofp.offsets.ofp_switch_config;

  module.exports = {
    unpack: function (buffer, offset) {
      let message = {
        header: {type: 'OFPT_SET_CONFIG'},
        body: {}
      };

      let len = buffer.readUInt16BE(offset + offsetsHeader.length, true);
      if (len !== ofp.sizes.ofp_switch_config) {
        throw new Error(util.format('%s message at offset %d has invalid length (%d).',
                        message.header.type, offset, len));
      }

      message.body.flags = [];

      let flags = buffer.readUInt16BE(offset + offsets.flags, true);

      switch (flags & ofp.ofp_config_flags.OFPC_FRAG_MASK) {
        case ofp.ofp_config_flags.OFPC_FRAG_NORMAL: {
          message.body.flags.push('OFPC_FRAG_NORMAL');
          break;
        }
        case ofp.ofp_config_flags.OFPC_FRAG_DROP: {
          message.body.flags.push('OFPC_FRAG_DROP');
          break;
        }
        case ofp.ofp_config_flags.OFPC_FRAG_REASM: {
          message.body.flags.push('OFPC_FRAG_REASM');
          break;
        }
        default: {
          console.warn('%s message at offset %d has invalid frag flags (%d).',
                       message.header.type, offset,
                       flags & ofp.ofp_config_flags.OFPC_FRAG_MASK);
        }
      }

      if (flags > ofp.ofp_config_flags.OFPC_FRAG_MASK) {
        console.warn('%s message at offset %d has invalid flags (%d).',
                     message.header.type, offset, flags);
      }

      message.body.miss_send_len = buffer.readUInt16BE(offset + offsets.miss_send_len, true);
      // TODO: validate?

      return {
        message: message,
        offset: offset + len
      };
    }
  };
})();
