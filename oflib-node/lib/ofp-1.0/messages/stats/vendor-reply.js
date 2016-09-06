/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

"use strict";

(function() {

var util = require('util');
var ofp = require('../../ofp.js');

var offsetsHeader = ofp.offsets.ofp_header;
var offsetsStats = ofp.offsets.ofp_stats_reply;

module.exports = {
            "unpack" : function(buffer, offset) {
                    var stats = {
                            "header" : {"type" : 'OFPST_VENDOR'},
                            "body" : {}
                        };

                    var len = buffer.readUInt16BE(offset + offsetsHeader.length, true);

                    if (len < ofp.sizes.ofp_stats_request + 4) {  // 4 : vendor
                        return {
                            "error" : {
                                "desc" : util.format('%s stats message at offset %d has invalid length (%d).', stats.header.type, offset, len)
                            }
                        }
                    }

                    stats.body.vendorr = buffer.readUInt32BE(offset + ofp.sizes.ofp_stats_request, true);

                    var dataLen = len - offset - ofp.sizes.ofp_stats_request - 4;
                    if (dataLen > 0) {
                        stats.body.data = new Buffer(dataLen);
                        buffer.copy(stats.body.data, 0, offset + ofp.sizes.ofp_header + ofp.sizes.ofp_stats_request + 4, offset + ofp.sizes.ofp_header + ofp.sizes.ofp_stats_request + 4+ dataLen);
                    }

                    return {
                        "stats" : stats,
                        "offset" : offset + len
                    }
            }

}

})();
