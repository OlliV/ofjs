/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

"use strict";

(function() {

var util = require('util');
var ofp = require('../ofp.js');
var packet = require('../../packet.js');

var offsets = ofp.offsets.ofp_action_nw_ecn;

module.exports = {
            "unpack" : function(buffer, offset) {
                    var action = {
                            "header" : {"type" : 'OFPAT_SET_NW_ECN'},
                            "body" : {}
                        };

                    var len = buffer.readUInt16BE(offset + offsets.len, true);

                    if (len != ofp.sizes.ofp_action_nw_ecn) {
                        return {
                            "error" : {
                                "desc" : util.format('%s action at offset %d has invalid length (%d).', action.header.type, offset, len),
                                "type" : 'OFPET_BAD_ACTION', "code" : 'OFPBAC_BAD_LEN'
                            }
                        }
                    }

                    action.body.nw_ecn = buffer.readUInt8(offset + offsets.nw_ecn);

                    if (action.body.nw_ecn > packet.IP_ECN_MAX) {
                        return {
                            "action" : action,
                            "warnings" : [{
                                "desc" : util.format('%s action at offset %d has invalid ecn (%d).', action.header.type, offset, action.body.nw_ecn),
                                "type" : 'OFPET_BAD_ACTION', "code" : 'OFPBAC_BAD_OUT_ARGUMENT'
                            }],
                            "offset" : offset + len
                        }
                    }

                    return {
                        "action" : action,
                        "offset" : offset + len
                    }
            },

            "pack" : function(action, buffer, offset) {
                    if (buffer.length < offset + ofp.sizes.ofp_action_nw_ecn) {
                        return {
                            error : { desc : util.format('%s action at offset %d does not fit the buffer.', action.header.type, offset)}
                        }
                    }
                    buffer.writeUInt16BE(ofp.ofp_action_type.OFPAT_SET_NW_ECN, offset + offsets.type, true);
                    buffer.writeUInt16BE(ofp.sizes.ofp_action_nw_ecn, offset + offsets.len, true);
                    buffer.writeUInt8(action.body.nw_ecn, offset + offsets.nw_ecn, true);
                    buffer.fill(0, offset + offsets.pad, offset + offsets.pad + 3);

                    if (action.body.nw_ecn > packet.IP_ECN_MAX) {
                        return {
                            warnings: [{
                                desc: util.format('%s action at offset %d has invalid ecn (%d).', action.header.type, offset, action.body.nw_ecn)
                            }],
                            offset : offset + ofp.sizes.ofp_action_nw_ecn
                        }
                    }

                    return {
                        offset : offset + ofp.sizes.ofp_action_nw_ecn
                    }
            }

}

})();
