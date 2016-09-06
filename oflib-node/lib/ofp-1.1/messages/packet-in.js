/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

"use strict";

(function() {

var util = require('util');
var ofp = require('../ofp.js');
var ofputil = require('../../util.js');

var offsetsHeader = ofp.offsets.ofp_header;
var offsets = ofp.offsets.ofp_packet_in;

module.exports = {
            "unpack" : function(buffer, offset) {
                    var message = {
                            "header" : {"type" : 'OFPT_PACKET_IN'},
                            "body" : {}
                        };
                    var warnings = [];

                    var len = buffer.readUInt16BE(offset + offsetsHeader.length, true);

                    if (len < ofp.sizes.ofp_packet_in) {
                        return {
                            "error" : {
                                "desc" : util.format('%s message at offset %d has invalid length (%d).', message.header.type, offset, len)
                            }
                        }
                    }

                    ofputil.setIfNotEq(message.body, 'buffer_id', buffer.readUInt32BE(offset + offsets.buffer_id, true), 0xffffffff);

                    var in_port = buffer.readUInt32BE(offset + offsets.in_port, true);
                    if (in_port > ofp.ofp_port_no.OFPP_MAX) {
                        if (in_port == ofp.ofp_port_no.OFPP_LOCAL) {
                            message.body.in_port = 'OFPP_LOCAL';
                        } else {
                            message.body.in_port = in_port;
                            warnings.push({"desc" : util.format('%s message at offset %d has invalid in_port (%d).', message.header.type, offset, in_port)});
                        }
                    } else {
                        message.body.in_port = in_port;
                    }

                    var in_phy_port = buffer.readUInt32BE(offset + offsets.in_port, true);
                    if (in_phy_port > ofp.ofp_port_no.OFPP_MAX) {
                            warnings.push({"desc" : util.format('%s message at offset %d has invalid in_port (%d).', message.header.type, offset, in_port)});
                    }

                    ofputil.setIfNotEq(message.body, 'in_phy_port', in_phy_port, message.body.in_port);

                    message.body.total_len = buffer.readUInt16BE(offset + offsets.total_len, true);

                    var reason = buffer.readUInt8(offset + offsets.reason, true);
                    if (!(ofputil.setEnum(message.body, 'reason', reason, ofp.ofp_packet_in_reason_rev))) {
                        message.body.reason = reason;
                        warnings.push({"desc" : util.format('%s message at offset %d has invalid reason (%d).', message.header.type, offset, reason)});
                    }

                    message.body.table_id = buffer.readUInt8(offset + offsets.table_id, true);
                    if (message.body.table_id > ofp.ofp_table.OFPTT_MAX) {
                        warnings.push({"desc" : util.format('%s message at offset %d has invalid table_id (%d).', message.header.type, offset, table_id)});
                    }

                    var dataLen = len - ofp.sizes.ofp_packet_in - 2; // 2 for padding
                    if (dataLen > message.body.total_len) {
                        warnings.push({"desc" : util.format('%s message at offset %d has invalid total_len (%d).', message.header.type, offset, total_len)});
                    }

                    if (dataLen > 0) {
                        message.body.data = new Buffer(dataLen);
                        buffer.copy(message.body.data, 0, offset + offsets.data + 2, offset + offsets.data + dataLen + 2);
                    }

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
            },


            "pack" : function(message, buffer, offset) {
                    var warnings = [];

                    if (buffer.length < offset + ofp.sizes.ofp_packet_in) {
                        return {
                            error : { desc : util.format('%s message at offset %d does not fit the buffer.', message.header.type, offset)}
                        }
                    }

                    buffer.writeUInt8(ofp.ofp_type.OFPT_PACKET_IN, offset + offsetsHeader.type, true);

                    //TODO: validate
                    if ('buffer_id' in message.body) {
                        var buffer_id = message.body.buffer_id;
                    } else {
                        var buffer_id = 0xffffffff;
                    }
                    buffer.writeUInt32BE(buffer_id, offset + offsets.buffer_id, true);

                    //TODO: validate
                    buffer.writeUInt32BE(message.body.in_port, offset + offsets.in_port, true);

                    //TODO: validate
                    if ('in_phy_port' in message.body) {
                        var in_phy_port = message.body.in_phy_port;
                    } else {
                        var in_phy_port = message.body.in_port;
                    }
                    buffer.writeUInt32BE(in_phy_port, offset + offsets.in_phy_port, true);

                    buffer.writeUInt16BE(message.body.total_len, offset + offsets.total_len, true);

                    if (message.body.reason in ofp.ofp_packet_in_reason) {
                        var reason = ofp.ofp_packet_in_reason[message.body.reason];
                    } else {
                        var reason = 0;
                        warnings.push({desc: util.format('%s message at offset %d has invalid reason (%s).', message.header.type, offset, message.body.reson)});
                    }
                    buffer.writeUInt8(reason, offset + offsets.reason, true);

                    //TODO: validate
                    buffer.writeUInt8(message.body.table_id, offset + offsets.table_id, true);

                    var len = ofp.sizes.ofp_packet_in;
                    if ('data' in message.body) {
                        len += message.body.data.length + 2;
                        buffer.fill(0, offset + offsets.data, offset + offsets.data + 2);

                        message.body.data.copy(buffer, offset + offsets.data + 2);
                    }

                    buffer.writeUInt16BE(len, offset + offsetsHeader.length, true);

                    if (warnings.length == 0) {
                        return {
                            offset : offset + len
                        }
                    } else {
                        return {
                            warnings: warnings,
                            offset : offset + len
                        }
                    }
            }


}

})();
