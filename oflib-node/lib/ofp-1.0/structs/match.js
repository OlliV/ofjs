/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

"use strict";

(function() {

    var util = require('util');

    var ofp = require('../ofp.js');
    var ofputil = require('../../util.js');
    var packet = require('../../packet.js');

    var offsets = ofp.offsets.ofp_match;

    module.exports = {
        "struct": 'match',

        "unpack": function(buffer, offset) {
            var match = {};
            var warnings = [];

            if (buffer.length < offset + ofp.sizes.ofp_match) {
                return {
                    "error": {
                        "desc": util.format('match at offset %d is too short (%d).', offset, (buffer.length - offset)),
                        "type": 'OFPET_BAD_MATCH',
                        "code": 'OFPBMC_BAD_LEN'
                    }
                }
            }

            var wildcards = buffer.readUInt32BE(offset + offsets.wildcards, true);

            if ((wildcards & ofp.ofp_flow_wildcards.OFPFW_IN_PORT) == 0) {
                var in_port = buffer.readUInt16BE(offset + offsets.in_port, true);
                if (in_port > ofp.ofp_port.OFPP_MAX) {
                    if (in_port == ofp.ofp_port.OFPP_LOCAL) {
                        match.in_port = 'OFPP_LOCAL';
                    } else {
                        match.in_port = in_port;
                        warnings.push({
                            "desc": util.format('%s match at offset %d has invalid in_port (%d).', match.header.type, offset, in_port),
                            "type": 'OFPET_BAD_MATCH',
                            "code": 'OFPBMC_BAD_VALUE'
                        });
                    }
                } else {
                    match.in_port = in_port;
                }
            }

            if ((wildcards & ofp.ofp_flow_wildcards.OFPFW_DL_SRC) == 0) {
                match.dl_src = packet.ethToString(buffer, offset + offsets.dl_src);
            }

            if ((wildcards & ofp.ofp_flow_wildcards.OFPFW_DL_DST) == 0) {
                match.dl_dst = packet.ethToString(buffer, offset + offsets.dl_dst);
            }

            if ((wildcards & ofp.ofp_flow_wildcards.OFPFW_DL_VLAN) == 0) {
                var dl_vlan = buffer.readUInt16BE(offset + offsets.dl_vlan, true);
                if (dl_vlan == ofp.OFP_VLAN_NONE) {
                    match.dl_vlan = 'OFP_VLAN_NONE';
                } else {
                    match.dl_vlan = dl_vlan;
                }
                // TODO: validate
            }

            if ((wildcards & ofp.ofp_flow_wildcards.OFPFW_DL_VLAN_PCP) == 0) {
                match.dl_vlan_pcp = buffer.readUInt8(offset + offsets.dl_vlan_pcp, true);
                // TODO: validate
            }

            if ((wildcards & ofp.ofp_flow_wildcards.OFPFW_DL_TYPE) == 0) {
                match.dl_type = buffer.readUInt16BE(offset + offsets.dl_type, true);
            }

            if ((wildcards & ofp.ofp_flow_wildcards.OFPFW_NW_TOS) == 0) {
                match.nw_tos = buffer.readUInt8(offset + offsets.nw_tos, true);
                // TODO: validate
            }

            if ((wildcards & ofp.ofp_flow_wildcards.OFPFW_NW_PROTO) == 0) {
                match.nw_proto = buffer.readUInt8(offset + offsets.nw_proto, true);
            }

            var nw_src_mask = (wildcards & ofp.OFPFW_NW_SRC_MASK) >> ofp.OFPFW_NW_SRC_SHIFT;
            if (nw_src_mask < 32) {
                if (nw_src_mask > 0) {
                    match.nw_src_mask = nw_src_mask;
                }
                match.nw_src = packet.ipv4ToString(buffer, offset + offsets.nw_src, offset + offsets.nw_src + 4);
            }

            var nw_dst_mask = (wildcards & ofp.OFPFW_NW_DST_MASK) >> ofp.OFPFW_NW_DST_SHIFT;
            if (nw_dst_mask < 32) {
                if (nw_dst_mask > 0) {
                    match.nw_dst_mask = nw_dst_mask;
                }
                match.nw_dst = packet.ipv4ToString(buffer, offset + offsets.nw_dst, offset + offsets.nw_dst + 4);
            }

            if ((wildcards & ofp.ofp_flow_wildcards.OFPFW_TP_SRC) == 0) {
                match.tp_src = buffer.readUInt16BE(offset, true);
            }

            if ((wildcards & ofp.ofp_flow_wildcards.OFPFW_TP_DST) == 0) {
                match.tp_dst = buffer.readUInt16BE(offset, true);
            }

            if (warnings.length == 0) {
                return {
                    "match": match,
                    "offset": offset + ofp.sizes.ofp_match
                }
            } else {
                return {
                    "match": match,
                    "warnings": warnings,
                    "offset": offset + ofp.sizes.ofp_match
                }
            }
        },
        "pack": function(match, buffer, offset) {
            
            var warnings = [];

            if (buffer.length < offset + ofp.sizes.ofp_match) {
                return {
                    error: {
                        desc: util.format('match at offset %d does not fit the buffer.', offset)
                    }
                }
            }

            // buffer.writeUInt16BE(ofp.sizes.ofp_match, offset + offsets.length, true); //offsets.length?
            // util.log("File: match.js line 143")
            // console.dir(buffer)

            var wildcards = 0;

           
            // TODO validate
            if ('in_port' in match.body) {
                if (match.body.in_port == 'OFPP_LOCAL') {
                    var in_port = ofp.ofp_port_no.OFPP_LOCAL;
                } else {
                    var in_port = match.body.in_port;
                }
            } else {
                wildcards != ofp.ofp_clow_wildcards.OFPFW_IN_PORT;
                var in_port = 0;
            }
            buffer.writeUInt16BE(in_port, offset + offsets.in_port, true);
           

            if ('dl_src' in match.body) {
                packet.stringToEth(match.body.dl_src, buffer, offset + offsets.dl_src);
            } else {
                buffer.fill(0x00, offset + offsets.dl_src, offset + offsets.dl_src + ofp.OFP_ETH_ALEN); // TODO fill ?
                buffer.fill(0xff, offset + offsets.dl_src_mask, offset + offsets.dl_src_mask + ofp.OFP_ETH_ALEN); // TODO fill ?
            }
           

            if ('dl_dst' in match.body) {
                packet.stringToEth(match.body.dl_dst, buffer, offset + offsets.dl_dst);
            } else {
                buffer.fill(0x00, offset + offsets.dl_dst, offset + offsets.dl_dst + ofp.OFP_ETH_ALEN); // TODO fill ?
                buffer.fill(0xff, offset + offsets.dl_dst_mask, offset + offsets.dl_dst_mask + ofp.OFP_ETH_ALEN); // TODO fill ?
            }
            

            if ('dl_vlan' in match.body) {
                if (match.body.dl_vlan == 'OFP_VLAN_NONE') {
                    var dl_vlan = ofp.OFP_VLAN_NONE;
                } else {
                    var dl_vlan = match.body.dl_vlan;
                }
            } else {
                var dl_vlan = 0;
                wildcards |= ofp.ofp_flow_wildcards.OFPFW_DL_VLAN;
            }
            buffer.writeUInt16BE(dl_vlan, offset + offsets.dl_vlan, true);
           

            if ('dl_vlan_pcp' in match.body) {
                var dl_vlan_pcp = match.body.dl_vlan_pcp;
            } else {
                var dl_vlan_pcp = 0;
                wildcards |= ofp.ofp_flow_wildcards.OFPFW_DL_VLAN_PCP;
            }
            buffer.writeUInt8(dl_vlan_pcp, offset + offsets.dl_vlan_pcp, true);

            // buffer.fill(0, offset + offsets.pad1, offset + offsets.pad1 + 1);

           

            if ('dl_type' in match.body) {
                var dl_type = match.body.dl_type;
            } else {
                var dl_type = 0;
                wildcards |= ofp.ofp_flow_wildcards.OFPFW_DL_TYPE;
            }
            buffer.writeUInt16BE(dl_type, offset + offsets.dl_type, true);
           
            // TODO validate
            if ('nw_tos' in match.body) {
                var nw_tos = match.body.nw_tos;
            } else {
                var nw_tos = 0;
                wildcards |= ofp.ofp_flow_wildcards.OFPFW_NW_TOS;
            }
            buffer.writeUInt8(nw_tos, offset + offsets.nw_tos, true);
            
            
            if ('nw_proto' in match.body) {
                var nw_proto = match.body.nw_proto;
            } else {
                var nw_proto = 0;
                wildcards |= ofp.ofp_flow_wildcards.OFPFW_NW_PROTO;
            }
            buffer.writeUInt8(nw_proto, offset + offsets.nw_proto, true);
           
            if ('nw_src' in match.body) {
                packet.stringToIPv4(match.body.nw_src, buffer, offset + offsets.nw_src);
            } else {
                // buffer.fill(0x00, offset + offsets.nw_src, offset + offsets.nw_src + 4); // TODO fill ?
                // buffer.fill(0xff, offset + offsets.nw_src_mask, offset + offsets.nw_src_mask + 4); // TODO fill ?
            }
           

            if ('nw_dst' in match.body) {
                packet.stringToIPv4(match.body.nw_dst, buffer, offset + offsets.nw_dst);
            } else {
                // buffer.fill(0x00, offset + offsets.nw_dst, offset + offsets.nw_dst + 4); // TODO fill ?
                // buffer.fill(0xff, offset + offsets.nw_dst_mask, offset + offsets.nw_dst_mask + 4); // TODO fill ?
            }

            if ('tp_src' in match.body) {
                var tp_src = match.body.tp_src;
            } else {
                var tp_src = 0;
                wildcards |= ofp.ofp_flow_wildcards.OFPFW_TP_SRC;
            }
            buffer.writeUInt16BE(tp_src, offset + offsets.tp_src, true);
           

            if ('tp_dst' in match.body) {
                var tp_dst = match.body.tp_dst;
            } else {
                var tp_dst = 0;
                wildcards |= ofp.ofp_flow_wildcards.OFPFW_TP_DST;
            }
            buffer.writeUInt16BE(tp_dst, offset + offsets.tp_dst, true);
            

            // buffer.fill(0, offset + offsets.pad2, offset + offsets.pad2 + 3);

            buffer.writeUInt32BE(wildcards, offset + offsets.wildcards, true);
           

            if (warnings.length == 0) {
                return {
                    offset: offset + ofp.sizes.ofp_match
                }
            } else {
                return {
                    warnings: warnings,
                    offset: offset + ofp.sizes.ofp_match
                }
            }

        }

    }

})();