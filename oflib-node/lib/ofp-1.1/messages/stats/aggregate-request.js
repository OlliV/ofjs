/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

"use strict";

(function() {

var util = require('util');

var ofp = require('../../ofp.js');
var ofputil = require('../../../util.js');

var match = require('../../structs/match.js');

var offsetsHeader = ofp.offsets.ofp_header;
var offsetsStats = ofp.offsets.ofp_stats_request;
var offsets = ofp.offsets.ofp_aggregate_stats_request;

module.exports = {
            "unpack" : function(buffer, offset) {
                    var stats = {
                            "header" : {"type" : 'OFPST_AGGREGATE'},
                            "body" : {}
                        };
                    var warnings = [];

                    var len = buffer.readUInt16BE(offset + offsetsHeader.length, true);

                    // NOTE: ofp_aggregate_stats_request contains a standard match structure
                    if (len != ofp.sizes.ofp_stats_request + ofp.sizes.ofp_aggregate_stats_request) {
                        return {
                            "error" : {
                                "desc" : util.format('%s stats message at offset %d has invalid length (%d).', stats.header.type, offset, len),
                                "type" : 'OFPET_BAD_REQUEST', "code" : 'OFPBRC_BAD_LEN'
                            }
                        }
                    }


                    stats.body.table_id = buffer.readUInt8(offset + ofp.sizes.ofp_stats_request + offsets.table_id, true);
                    if (stats.body.table_id == ofp.ofp_table.OFPTT_ALL) {
                        stats.body.table_id = 'OFPTT_ALL';
                    }

                    var out_port = buffer.readUInt32BE(offset + ofp.sizes.ofp_stats_request + offsets.out_port, true);
                    if (out_port > ofp.ofp_port_no.OFPP_MAX) {
                        if (out_port != ofp.ofp_port_no.OFPP_ANY) {
                            stats.body.out_port = out_port;
                            warnings.push({
                                        "desc" : util.format('%s stats message at offset %d has invalid out_port (%d).', stats.header.type, offset, out_port),
                                        "type" : 'OFPET_BAD_REQUEST', "code" : 'OFPBRC_BAD_STAT'
                                    });
                        }
                    } else {
                        stats.body.out_port = out_port;
                    }

                    var out_group = buffer.readUInt32BE(offset + ofp.sizes.ofp_stats_request + offsets.out_group, true);
                    if (out_group > ofp.ofp_group.OFPG_MAX) {
                        if (out_group != ofp.ofp_group.OFPG_ANY) {
                            stats.body.out_group = out_group;
                            warnings.push({
                                        "desc" : util.format('%s stats message at offset %d has invalid out_port (%d).', stats.header.type, offset, out_port),
                                        "type" : 'OFPET_BAD_REQUEST', "code" : 'OFPBRC_BAD_STAT'
                                    });
                        }
                    } else {
                        stats.body.out_group = out_group;
                    }

                    // TODO : check if mask is correct
                    var cookie_mask = [buffer.readUInt32BE(offset + ofp.sizes.ofp_stats_request + offsets.cookie_mask, true),
                                       buffer.readUInt32BE(offset + ofp.sizes.ofp_stats_request + offsets.cookie_mask + 4, true)];

                    if (!ofputil.isUint64All(cookie_mask)) {
                        if (!ofputil.isUint64None(cookie_mask)) {
                                stats.body.cookie_mask = new Buffer(8);
                                buffer.copy(stats.body.cookie_mask, 0, offset + ofp.sizes.ofp_stats_request + offsets.cookie_mask, offset + ofp.sizes.ofp_stats_request + offsets.cookie_mask + 8);
                            }
                        stats.body.cookie = new Buffer(8);
                        buffer.copy(stats.body.cookie, 0, offset + ofp.sizes.ofp_stats_request + offsets.cookie, offset + ofp.sizes.ofp_stats_request + offsets.cookie + 8);
                    }

                    var unpack = match.unpack(buffer, offset + ofp.sizes.ofp_stats_request + offsets.match);
                    if ('error' in unpack) {
                        return unpack;
                    }
                    if ('warnings' in unpack) {
                        warnings.concat(unpack.warnings);
                    }
                    stats.body.match = unpack.match;

                    if (warnings.length = 0) {
                        return {
                            "stats" : stats,
                            "offset" : offset + len
                        }
                    } else {
                        return {
                            "stats" : stats,
                            "warnings" : warnings,
                            "offset" : offset + len
                        }
                    }
            },

            "pack" : function(stats, buffer, offset) {
                    var warnings = [];

                    if (buffer.length < offset + ofp.sizes.ofp_stats_request + ofp.sizes.ofp_aggregate_stats_request) {
                        return {
                            error : { desc : util.format('%s statistics message at offset %d does not fit the buffer.', stats.header.type, offset)}
                        }
                    }

                    // TODO validate
                    if ('table_id' in stats.body) {
                        var table_id = stats.body.table_id;
                    } else {
                        var table_id = ofp.ofp_table.OFPTT_ALL;
                    }
                    buffer.writeUInt8(table_id, offset + ofp.sizes.ofp_stats_request + offsets.table_id);

                    buffer.fill(0, offset + ofp.sizes.ofp_stats_request + offsets.pad, offset + ofp.sizes.ofp_stats_request + offsets.pad + 3);

                    // TODO: validate
                    if ('out_port' in stats.body) {
                        var out_port = stats.body.out_port;
                    } else {
                        var out_port = ofp.ofp_port_no.OFPP_ANY;
                    }
                    buffer.writeUInt32BE(out_port, offset + ofp.sizes.ofp_stats_request + offsets.out_port, true);

                    // TODO: validate
                    if ('out_group' in stats.body) {
                        var out_group = stats.body.out_group;
                    } else {
                        var out_group = ofp.ofp_group.OFPG_ANY;
                    }
                    buffer.writeUInt32BE(out_group, offset + ofp.sizes.ofp_stats_request + offsets.out_group, true);
                    buffer.fill(0, offset + ofp.sizes.ofp_stats_request + offsets.pad2, offset + ofp.sizes.ofp_stats_request + offsets.pad2 + 4);

                    if ('cookie' in stats.body) {
                        if ('cookie_mask' in stats.body) {
                            stats.body.cookie_mask.copy(buffer, offset + ofp.sizes.ofp_stats_request + offsets.cookie_mask);
                        } else {
                            buffer.fill(0x00, offset + ofp.sizes.ofp_stats_request + offsets.cookie_mask, offset + ofp.sizes.ofp_stats_request + offsets.cookie_mask + 8); // TODO fill ?
                        }
                        stats.body.cookie.copy(buffer, offset + ofp.sizes.ofp_stats_request + offsets.cookie);
                    } else {
                        buffer.fill(0x00, offset + ofp.sizes.ofp_stats_request + offsets.cookie, offset + ofp.sizes.ofp_stats_request + offsets.cookie + 8); // TODO fill ?
                        buffer.fill(0xff, offset + ofp.sizes.ofp_stats_request + offsets.cookie_mask, offset + ofp.sizes.ofp_stats_request + offsets.cookie_mask + 8); // TODO fill ?
                    }

                    var pack = match.pack(stats.body.match, buffer, offset + ofp.sizes.ofp_stats_request + offsets.match);
                    if ('error' in pack) {
                        return pack;
                    }

                    if ('warnings' in pack) {
                        warnings.concat(pack.warnings);
                    }

                    if (warnings.length == 0) {
                        return {
                            offset : pack.offset
                        }
                    } else {
                        return {
                            warnings: warnings,
                            offset : pack.offset
                        }
                    }
        }
}

})();
