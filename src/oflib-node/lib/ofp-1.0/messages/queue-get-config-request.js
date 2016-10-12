/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

"use strict";

(function() {
  const util = require('util');
  const ofp = require('../ofp.js');

  const offsetsHeader = ofp.offsets.ofp_header;
  const offsets = ofp.offsets.ofp_queue_get_config_request;

  module.exports = {
    unpack: function(buffer, offset) {
      var message = {
        header: {type: 'OFPT_QUEUE_GET_CONFIG_REQUEST'},
        body: {}
      };

      var len = buffer.readUInt16BE(offset + offsetsHeader.length, true);

      if (len != ofp.sizes.ofp_queue_get_config_request) {
        throw new Error(util.format('%s message at offset %d has invalid length (%d).',
                                    message.header.type, offset, len));
      }

      var port = buffer.readUInt16BE(offset + offsets.port, true);
      if (port > ofp.ofp_port.OFPP_MAX) {
        if (port == ofp.ofp_port.OFPP_ALL) {
          message.body.port = 'OFPP_ALL';
        } else {
          message.body.port = port;
          console.warn('%s message at offset %d has invalid port (%d).',
                       message.header.type, offset, port);
        }
      } else {
        message.body.port = port;
      }

      return {
        message: message,
        offset: offset + len
      }
    }
  }
})();


