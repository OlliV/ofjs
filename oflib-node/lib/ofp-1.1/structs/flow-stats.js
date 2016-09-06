/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

"use strict";

(function() {

var util = require('util');
var ofp = require('../ofp.js');
var ofputil = require('../../util.js');
var match = require('../structs/match.js');
var instruction = require('../instruction.js');

var offsets = ofp.offsets.ofp_flow_stats;

module.exports = {
            "struct" : 'flow-stats',

            "unpack" : function(buffer, offset) {
                    var flowStats = {};
                    var warnings = [];

                    // NOTE: ofp_flow_stats contains a whole standard match structure
                    if (buffer.length < offset + ofp.sizes.ofp_flow_stats) {
                        return {
                            "error" : {
                                "desc" : util.format('flow-stats at offset %d has invalid length (%d).', offset, (buffer.length - offset))
                            }
                        }
                    }

                    var len = buffer.readUInt16BE(offset + offsets.length, true);
                    // NOTE: ofp_flow_stats contains a whole standard match structure
                    if (len < ofp.sizes.ofp_flow_stats) {
                        return {
                            "error" : {
                                "desc" : util.format('flow-stats at offset %d has invalid length (%d).', offset, len),
                            }
                        }
                    }

                    flowStats.table_id = buffer.readUInt8(offset + offsets.table_id, true);
                    if (flowStats.table_id > ofp.ofp_table.OFPTT_MAX) {
                        warnings.push({"desc" : util.format('flow-stats at offset %d has invalid table_id (%d).', offset, flowStats.table_id)});
                    }

                    flowStats.duration_sec = buffer.readUInt32BE(offset + offsets.duration_sec, true);
                    flowStats.duration_nsec = buffer.readUInt32BE(offset + offsets.duration_nsec, true);

                    flowStats.priority = buffer.readUInt16BE(offset + offsets.priority, true);

                    ofputil.setIfNotEq(flowStats, "idle_timeout", buffer.readUInt16BE(offset + offsets.idle_timeout, true), 0);
                    ofputil.setIfNotEq(flowStats, "hard_timeout", buffer.readUInt16BE(offset + offsets.hard_timeout, true), 0);

                    flowStats.cookie = new Buffer(8);
                    buffer.copy(flowStats.cookie, 0, offset + offsets.cookie, offset + offsets.cookie + 8);

                    flowStats.packet_count = [buffer.readUInt32BE(offset + offsets.packet_count, true),
                                              buffer.readUInt32BE(offset + offsets.packet_count + 4, true)];

                    flowStats.byte_count = [buffer.readUInt32BE(offset + offsets.byte_count, true),
                                            buffer.readUInt32BE(offset + offsets.byte_count+ 4, true)];


                    var unpack = match.unpack(buffer, offset + offsets.match);
                    if ('error' in unpack) {
                        return unpack;
                    }
                    if ('warnings' in unpack) {
                        warnings.concat(unpack.warnings);
                    }
                    flowStats.match = unpack.match;

                    flowStats.instructions = [];

                    // NOTE: ofp_flow_stats contains a whole standard match structure
                    var pos = offset + offsets.instructions;
                    while (pos < offset + len) {
                        var inst = instruction.unpack(buffer, pos);
                        if ('error' in inst) {
                            return inst;
                        }

                        if ('warnings' in inst) {
                            warnings.concat(inst.warnings);
                        }
                        flowStats.instructions.push(inst.instruction);
                        pos = inst.offset;
                    }

                    if (pos != offset + len) {
                        return {
                            "error" : {
                                "desc" : util.format('flow-stats at offset %d has extra bytes (%d).', offset, (pos - len)),
                            }
                        }
                    }

                    if (warnings.length == 0) {
                        return {
                            "flow-stats" : flowStats,
                            "offset" : offset + len
                        }
                    } else {
                        return {
                            "flow-stats" : flowStats,
                            "warnings" : warnings,
                            "offset" : offset + len
                        }
                    }
            },

            "pack" : function(flowStats, buffer, offset) {
                    var warnings = [];

                    if (buffer.length < offset + ofp.sizes.ofp_flow_stats) {
                        return {
                            "error" : {
                                "desc" : util.format('flow-stats at offset %d has invalid length (%d).', offset, (buffer.length - offset))
                            }
                        }
                    }

                    buffer.writeUInt8(flowStats.table_id, offset + offsets.table_id, true);
                    if (flowStats.table_id > ofp.ofp_table.OFPTT_MAX) {
                        warnings.push({"desc" : util.format('flow-stats at offset %d has invalid table_id (%d).', offset, flowStats.table_id)});
                    }

                    buffer.fill(0, offset + offsets.pad, offset + offsets.pad + 1);

                    buffer.writeUInt32BE(flowStats.duration_sec, offset + offsets.duration_sec, true);
                    buffer.writeUInt32BE(flowStats.duration_nsec, offset + offsets.duration_nsec, true);

                    if ('priority' in flowStats) {
                        var priority = flowStats.priority;
                    } else {
                        var priority = ofp.OFP_DEFAULT_PRIORITY;
                    }
                    buffer.writeUInt16BE(priority, offset + offsets.priority, true);

                    if ('idle_timeout' in flowStats) {
                        var idle_timeout = flowStats.idle_timeout;
                    } else {
                        var idle_timeout = 0;
                    }
                    buffer.writeUInt16BE(idle_timeout, offset + offsets.idle_timeout, true);

                    if ('hard_timeout' in flowStats) {
                        var hard_timeout = flowStats.hard_timeout;
                    } else {
                        var hard_timeout = 0;
                    }
                    buffer.writeUInt16BE(hard_timeout, offset + offsets.hard_timeout, true);

                    buffer.fill(0, offset + offsets.pad2, offset + offsets.pad2 + 6);

                    flowStats.cookie.copy(buffer, offset + offsets.cookie);

                    buffer.writeUInt32BE(flowStats.packet_count[0], offset + offsets.packet_count, true);
                    buffer.writeUInt32BE(flowStats.packet_count[1], offset + offsets.packet_count + 4, true);

                    buffer.writeUInt32BE(flowStats.byte_count[0], offset + offsets.byte_count, true);
                    buffer.writeUInt32BE(flowStats.byte_count[1], offset + offsets.byte_count + 4, true);

                    var pack = match.pack(flowStats.match, buffer, offset + offsets.match);
                    if ('error' in pack) {
                        return pack;
                    }
                    if ('warnings' in pack) {
                        warnings.concat(pack.warnings);
                    }

                    var pos = pack.offset;
                    flowStats.instructions.forEach(function(inst) {
                        pack = instruction.pack(inst, buffer, pos);

                        if ('error' in pack) {
                            return pack;
                        }
                        if ('warnings' in pack) {
                            warnings.concat(pack.warnings);
                        }

                        pos = pack.offset;
                    });

                    buffer.writeUInt16BE(pos - offset, offset + offsets.length, true);

                    if (warnings.length == 0) {
                        return {
                            offset : pos
                        }
                    } else {
                        return {
                            warnings: warnings,
                            offset : pos
                        }
                    }
            }

}

})();
