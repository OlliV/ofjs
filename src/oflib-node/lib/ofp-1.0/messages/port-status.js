/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

"use strict";

(function() {
  const util = require('util');
  const ofp = require('../ofp.js');
  const ofputil = require('../../util.js');
  const phyPort = require('../structs/phy-port.js');

  const offsetsHeader = ofp.offsets.ofp_header;
  const offsets = ofp.offsets.ofp_port_status;

  module.exports = {
    unpack: function(buffer, offset) {
      var message = {
        header: {type: 'OFPT_PORT_STATUS'},
        body: {}
      };

      var len = buffer.readUInt16BE(offset + offsetsHeader.length, true);

      if (len != ofp.sizes.ofp_port_status) {
        throw new Error(util.format('%s message at offset %d has invalid length (%d).',
                        message.header.type, offset, len));
      }

      var reason = buffer.readUInt8(offset + offsets.reason, true);
      if (!(ofputil.setEnum(message.body, 'reason', reason, ofp.ofp_port_reason_rev))) {
        console.warn('%s message at offset %d has invalid reason (%d).',
                     message.header.type, offset, reason);
      }

      var desc = phyPort.unpack(buffer, offset + offsets.desc);
      message.body.desc = desc['phy-port'];

      return {
        message: message,
        offset: offset + len
      }
    }
  }
})();
