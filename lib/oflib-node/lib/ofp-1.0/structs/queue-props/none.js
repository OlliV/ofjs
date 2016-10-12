/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

const util = require('util');
const ofp = require('../../ofp.js');

const offsets = ofp.offsets.ofp_queue_prop_header;

module.exports = {
  unpack: function (buffer, offset) {
    let queueProp = {
      header: {property: 'OFPQT_NONE'},
    };

    const len = buffer.readUInt16BE(offset + offsets.len, true);
    if (len !== ofp.sizes.ofp_queue_prop_header) {
      throw new Error(util.format('%s queue-prop at offset %d has invalid length (%d).',
                                  queueProp.header.property, offset, len));
    }

    return {
      'queue-prop': queueProp,
      offset: offset + len,
    };
  },
};
