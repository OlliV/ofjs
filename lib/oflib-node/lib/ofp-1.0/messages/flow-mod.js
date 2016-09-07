/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

"use strict";

(function() {

    var util = require('util');
    var ofp = require('../ofp.js');
    var ofputil = require('../../util.js');

    var match = require('../structs/match.js');
    var action = require('../action.js');

    var offsetsHeader = ofp.offsets.ofp_header;
    var offsets = ofp.offsets.ofp_flow_mod;

    module.exports = {
        "unpack": function(buffer, offset) {
            var message = {
                "header": {
                    "type": 'OFPT_FLOW_MOD'
                },
                "body": {}
            };
            var warnings = [];

            var len = buffer.readUInt16BE(offset + offsetsHeader.length, true);

            if (len < ofp.sizes.ofp_flow_mod) {
                return {
                    "error": {
                        "desc": util.format('%s message at offset %d has invalid length (%d).', message.header.type, offset, len),
                        "type": 'OFPET_BAD_REQUEST',
                        "code": 'OFPBRC_BAD_LEN'
                    }
                }
            }

            var unpack = match.unpack(buffer, offset + offsets.match);
            if ('error' in unpack) {
                return unpack;
            }
            if ('warnings' in unpack) {
                warnings.concat(unpack.warnings);
            }
            message.body.match = unpack.match;

            // TODO: Sanity check and remove unused fields vs. command
            message.body.cookie = new Buffer(8);
            buffer.copy(message.body.cookie, 0, offset + offsets.cookie, offset + offsets.cookie + 8);

            var command = buffer.readUInt16BE(offset + offsets.command, true);
            if (!(ofputil.setEnum(message.body, "command", command, ofp.ofp_flow_mod_command_rev))) {
                message.body.command = command;
                warnings.push({
                    "desc": util.format('%s message at offset %d has invalid command (%d).', message.header.type, offset, len),
                    "type": 'OFPET_FLOW_MOD_FAILED',
                    "code": 'OFPFMFC_BAD_COMMAND'
                });
            }

            ofputil.setIfNotEq(message.body, "idle_timeout", buffer.readUInt16BE(offset + offsets.idle_timeout, true), 0);
            ofputil.setIfNotEq(message.body, "hard_timeout", buffer.readUInt16BE(offset + offsets.hard_timeout, true), 0);

            message.body.priority = buffer.readUInt16BE(offset + offsets.priority, true);

            ofputil.setIfNotEq(message.body, 'buffer_id', buffer.readUInt32BE(offset + offsets.buffer_id, true), 0xffffffff);

            var out_port = buffer.readUInt16BE(offset + offsets.out_port, true);
            if (out_port > ofp.ofp_port.OFPP_MAX) {
                if (out_port != ofp.ofp_port.OFPP_ANY) {
                    message.body.out_port = out_port;
                    warnings.push({
                        "desc": util.format('%s message at offset %d has invalid out_port (%d).', message.header.type, offset, out_port),
                        "type": 'OFPET_FLOW_MOD_FAILED',
                        "code": 'OFPFMFC_BAD_UNKNOWN'
                    });
                }
            } else {
                message.body.out_port = out_port;
            }

            var flags = buffer.readUInt16BE(offset + offsets.flags, true);
            var flagsParsed = ofputil.parseFlags(flags, ofp.ofp_flow_mod_flags);
            if (flagsParsed.remain != 0) {
                warnings.push({
                    "desc": util.format('%s message at offset %d has invalid flags (%d).', message.header.type, offset, flags),
                    "type": 'OFPET_FLOW_MOD_FAILED',
                    "code": 'OFPFMFC_UNKNOWN'
                });
            }
            message.body.flags = flagsParsed.array;


            message.body.actions = [];

            // NOTE: ofp_flow_mod does contain a standard match structure!
            var pos = offset + offsets.actions;
            while (pos < offset + len) {
                var unpack = action.unpack(buffer, pos);
                if ('error' in unpack) {
                    return unpack;
                }

                if ('warnings' in unpack) {
                    warnings.concat(unpack.warnings);
                }
                message.body.actions.push(unpack.action);
                pos = unpack.offset;
            }

            if (pos != offset + len) {
                return {
                    "error": {
                        "desc": util.format('%s message at offset %d has extra bytes (%d).', message.header.type, offset, (pos - len)),
                        "type": 'OFPET_BAD_REQUEST',
                        "code": 'OFPBRC_BAD_LEN'
                    }
                }
            }

            if (warnings.length == 0) {
                return {
                    "message": message,
                    "offset": offset + len
                }
            } else {
                return {
                    "message": message,
                    "warnings": warnings,
                    "offset": offset + len
                }
            }
        },
        "pack": function(message, buffer, offset) {
     
            var warnings = [];

            if (buffer.length < offset + ofp.sizes.ofp_flow_mod) {
                return {
                    error: {
                        desc: util.format('%s message at offset %d does not fit the buffer.', message.header.type, offset)
                    }
                }
            }

            buffer.writeUInt8(ofp.ofp_type.OFPT_FLOW_MOD, offset + offsetsHeader.type, true);

            if ('cookie' in message.body) {
                message.body.cookie.copy(buffer, offset + offsets.cookie);
            } else {
                buffer.fill(0x00, offset + offsets.cookie, offset + offsets.cookie + 8); // TODO fill ?
                // buffer.fill(0xff, offset + offsets.cookie_mask, offset + offsets.cookie_mask + 8); // TODO fill ?
            }

            if (message.body.command in ofp.ofp_flow_mod_command) {
                var command = ofp.ofp_flow_mod_command[message.body.command];
            } else {
                var command = 0;
                warnings.push({
                    desc: util.format('%s message at offset %d has invalid command (%s).', message.header.type, offset, message.body.command)
                });
            }
            buffer.writeUInt16BE(command, offset + offsets.command, true); //GB check this!!


            if ('idle_timeout' in message.body) {
                var idle_timeout = message.body.idle_timeout;
            } else {
                var idle_timeout = 0;
            }
            buffer.writeUInt16BE(idle_timeout, offset + offsets.idle_timeout, true);


            if ('hard_timeout' in message.body) {
                var hard_timeout = message.body.hard_timeout;
            } else {
                var hard_timeout = 0;
            }
            buffer.writeUInt16BE(hard_timeout, offset + offsets.hard_timeout, true);

            if ('priority' in message.body) {
                var priority = message.body.priority;
            } else {
                var priority = ofp.OFP_DEFAULT_PRIORITY;
            }
            buffer.writeUInt16BE(priority, offset + offsets.priority, true);
            if ('buffer_id' in message.body) {
                var buffer_id = message.body.buffer_id;
            } else {
                var buffer_id = 0xffffffff;
            }
            buffer.writeUInt32BE(buffer_id, offset + offsets.buffer_id, true);
            // TODO: validate
            debugger
           
            if ('out_port' in message.body) {
                if(ofp.ofp_port[message.body.out_port] <= ofp.ofp_port.OFPP_MAX){
                    var out_port = message.body.out_port
                }
                if(message.body.out_port in ofp.ofp_port){
                    var out_port = ofp.ofp_port[message.body.out_port]
                }
                
            } else {
                var out_port = ofp.ofp_port_no.OFPP_ANY;
            }
         
            buffer.writeUInt32BE(out_port, offset + offsets.out_port, true);
            
            var flags = 0;
            message.body.flags.forEach(function(f) {
                if (f in ofp.ofp_flow_mod_flags) {
                    flags |= ofp.ofp_flow_mod_flags[f];
                } else {
                    warnings.push({
                        desc: util.format('%s message at offset %d has invalid flag (%s).', message.header.type, offset, f)
                    });
                }
            });
            buffer.writeUInt16BE(flags, offset + offsets.flags, true);
            // buffer.fill(0, offset + offsets.pad, offset + offsets.pad + 2);
            
           
            var pack = match.pack(message.body.match, buffer, offset + offsets.match);
            if ('error' in pack) {
                return pack;
            }
            if ('warnings' in pack) {
                warnings.concat(pack.warnings);
            }

            debugger
            var pack = action.pack(message.body.actions, buffer, offset + offsets.actions);
            if ('error' in pack) {
                return pack;
            }
            if ('warnings' in pack) {
                warnings.concat(pack.warnings);
            }

            var pos = offset + offsets.actions + 8;

            if (warnings.length == 0) {
                return {
                    offset: pos
                }
            } else {
                return {
                    warnings: warnings,
                    offset: pos
                }
            }
        }

    }

})();