/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

"use strict";

(function() {

var util = require('util');
var ofp = require('../ofp.js');

var aggregate = require('./stats/aggregate-request.js');
var desc = require('./stats/desc-request.js');
var vendor = require('./stats/vendor-request.js');
var flow = require('./stats/flow-request.js');
var port = require('./stats/port-request.js');
var queue = require('./stats/queue-request.js');
var table = require('./stats/table-request.js');

var offsetsHeader = ofp.offsets.ofp_header;
var offsets = ofp.offsets.ofp_stats_request;

module.exports = {
            "unpack" : function(buffer, offset) {
                    var message = {
                            "header" : {"type" : 'OFPT_STATS_REQUEST'}
                        };
                    var warnings = [];

                    var len = buffer.readUInt16BE(offset + offsetsHeader.length, true);

                    if (len < ofp.sizes.ofp_stats_request) {
                        return {
                            "error" : {
                                "desc" : util.format('%s message at offset %d has invalid length (%d).', message.header.type, offset, len),
                                "type" : 'OFPET_BAD_REQUEST', "code" : 'OFPBRC_BAD_LEN'
                            }
                        }
                    }

                    var type = buffer.readUInt16BE(offset + offsets.type, true);

                    switch (type) {
                        case ofp.ofp_stats_types.OFPST_DESC: { var unpack = desc.unpack(buffer, offset); break; }
                        case ofp.ofp_stats_types.OFPST_FLOW: { var unpack = flow.unpack(buffer, offset); break; }
                        case ofp.ofp_stats_types.OFPST_AGGREGATE: { var unpack = aggregate.unpack(buffer, offset); break; }
                        case ofp.ofp_stats_types.OFPST_TABLE: { var unpack = table.unpack(buffer, offset); break; }
                        case ofp.ofp_stats_types.OFPST_PORT: { var unpack = port.unpack(buffer, offset); break; }
                        case ofp.ofp_stats_types.OFPST_QUEUE: { var unpack = queue.unpack(buffer, offset); break; }
                        case ofp.ofp_stats_types.OFPST_vendor: { var unpack = vendor.unpack(buffer, offset); break; }
                        default: {
                            return {
                                "error" : {
                                    "desc" : util.format('%s message at offset %d has invalid type (%d).', message.header.type, offset, type),
                                    "type" : 'OFPET_BAD_REQUEST', "code" : 'OFPBRC_BAD_STAT'
                                }
                            }
                        }
                    }

                    if ('error' in unpack) {
                        return unpack;
                    }
                    if ('warnings' in unpack) {
                        warnings.concat(unpack.warnings);
                    }
                    message.body = unpack.stats;


                    var flags = buffer.readUInt16BE(offset + offsets.flags, true);
                    if (flags != 0) {
                        warnings.push({
                                "desc" : util.format('%s message at offset %d has invalid flags (%d).', message.header.type, offset, flags),
                                "type" : 'OFPET_BAD_REQUEST', "code" : 'OFPBRC_BAD_STAT'
                        });
                    }
                    message.body.header.flags = [];

                    if (warnings.length == 0) {
                        return {
                            "message" : message,
                            "offset" : offset + len
                        }
                    } else {
                        return {
                            "message" : message,
                            "warnings" : warnings,
                            "offset" : offset + len
                        }
                    }
            }

}

})();
