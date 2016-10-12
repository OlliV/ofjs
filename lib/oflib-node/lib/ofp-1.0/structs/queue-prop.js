/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

const util = require('util');
const ofp = require('../ofp.js');
const none = require('./queue-props/none.js');
const minRate = require('./queue-props/min-rate.js');

const offsets = ofp.offsets.ofp_queue_prop_header;

module.exports = {
  struct: 'queue-prop',
  unpack: function (buffer, offset) {
    if (buffer.length < offset + ofp.sizes.ofp_queue_prop_header) {
      throw new Error(util.format('queue-prop at offset %d is too short (%d).',
                                  offset, (buffer.length - offset)));
    }

    const len = buffer.readUInt16BE(offset + offsets.len, true);
    if (buffer.length < offset + len) {
      throw new Error(util.format(
            'queue-prop at offset %d has invalid length (set to %d, but only %d received).',
             offset, len, (buffer.length - offset)));
    }

    const property = buffer.readUInt16BE(offset + offsets.property, true);
    switch (property) {
      case ofp.ofp_queue_properties.OFPQT_NONE: { return none.unpack(buffer, offset); }
      case ofp.ofp_queue_properties.OFPQT_MIN_RATE: { return minRate.unpack(buffer, offset); }
      default:
        throw new Error(util.format('queue-prop at offset %d has invalid property (%d).', offset, property));
    }
  },
};
