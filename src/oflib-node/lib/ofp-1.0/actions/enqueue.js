/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

(function () {
  const util = require('util');
  const ofp = require('../ofp.js');

  var offsets = ofp.offsets.ofp_action_enqueue;

  module.exports = {
    unpack: function (buffer, offset) {
      var action = {
        header: {type: 'OFPAT_ENQUEUE'},
        body: {}
      };

      var len = buffer.readUInt16BE(offset + offsets.len, true);

      if (len !== ofp.sizes.ofp_action_enqueue) {
        throw new Error(util.format('%s action at offset %d has invalid length (%d).',
                                    action.header.type, offset, len));
      }

      action.body.port = buffer.readUInt16BE(offset + offsets.port, true);

      if (action.body.port === 0) {
        console.warn('%s action at offset %d has invalid port (%d).',
                     action.header.type, offset, action.body.port);
      } else if (action.body.port > ofp.ofp_port.OFPP_MAX) {
        if (action.body.port === ofp.ofp_port.OFPP_IN_PORT) {
          action.body.port = 'OFPP_IN_PORT';
        } else {
          console.warn('%s action at offset %d has invalid port (%d).',
                       action.header.type, offset, action.body.port);
        }
      }

      action.body.queue_id = buffer.readUInt32BE(offset + offsets.queue_id, true);

      if (action.body.queue_id === ofp.OFPQ_ALL) {
          console.warn('%s action at offset %d has invalid queue_id (%d).',
                       action.header.type, offset, action.body.queue_id);
      }

      return {
        action: action,
        offset: offset + len
      };
    }
  };
})();
