/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

"use strict";

(function() {
  const util = require('util');
  const ofp = require('../ofp.js');
  const ofputil = require('../../util.js');
  const packet = require('../../packet.js');

  var offsetsHeader = ofp.offsets.ofp_header;
  var offsets = ofp.offsets.ofp_port_mod;

  module.exports = {
    "unpack" : function(buffer, offset) {
      var message = {
        "header" : {"type" : 'OFPT_PORT_MOD'},
        "body" : {}
      };

      var len = buffer.readUInt16BE(offset + offsetsHeader.length, true);

      if (len !== ofp.sizes.ofp_port_mod) {
        throw new Error(util.format('%s message at offset %d has invalid length (%d).',
                                    message.header.type, offset, len));
      }

      message.body.port_no = buffer.readUInt16BE(offset + offsets.port_no, true);
      if (message.body.port_no > ofp.ofp_port.OFPP_MAX) {
        console.error('%s message at offset %d has invalid port_no (%d).',
                      message.header.type, offset, message.body.port_no);
      }

      message.body.hw_addr = packet.ethToString(buffer, offset + offsets.hw_addr);

      var config = buffer.readUInt32BE(offset + offsets.config, true);
      var mask = buffer.readUInt32BE(offset + offsets.mask, true);

      var configSetParsed = ofputil.parseFlags((config & mask), ofp.ofp_port_config);
      if (configSetParsed.remain !== 0) {
        console.error('%s message at offset %d has invalid config (%d).',
                      message.header.type, offset, config);
      }
      message.body.config_set = configSetParsed.array;

      var configUnsetParsed = ofputil.parseFlags((~config & mask), ofp.ofp_port_config);
      if (configUnsetParsed.remain !== 0) {
        console.error('%s message at offset %d has invalid config (%d).',
                      message.header.type, offset, config);
      }
      message.body.config_unset = configUnsetParsed.array;

      var advertise = buffer.readUInt32BE(offset + offsets.advertise, true);
      var advertiseParsed = ofputil.parseFlags(advertise, ofp.ofp_port_features);
      if (advertiseParsed.remain !== 0) {
        console.error('%s message at offset %d has invalid advertise (%d).',
                      message.header.type, offset, advertise);
      }
      message.body.advertise = advertiseParsed.array;

      return {
        "message" : message,
        "offset" : offset + len
      }
    }
  }
})();
