/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

"use strict";

module.exports.bin = [
               0x02,                          // version = 2
               0x12,                          // type = 18
               0x00, 0x88,                    // length = 136
               0x49, 0x96, 0x02, 0xd2,        // xid = 1234567890
                 0x00, 0x02,                  // type = 2
                 0x00, 0x00,                  // flags = 0
                 0x00, 0x00, 0x00, 0x00,      // pad
                   0x10,                                           // table_id = 16,
                   0x00, 0x00, 0x00,                               // pad
                   0x00, 0x00, 0x00, 0x08,                         // out_port = 8,
                   0xff, 0xff, 0xff, 0xff,                         // out_group = 0 (disabled)
                   0x00, 0x00, 0x00, 0x00,                         // pad2
                   0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, // cookie = "1122334455667788"
                   0xaa, 0xab, 0xac, 0xad, 0xae, 0xaf, 0xba, 0xbb, // cookie_mask = "aaabacadaeafbabb"
                     0x00, 0x00,                         // type = 0
                     0x00, 0x58,                         // length = 88
                     0x00, 0x00, 0x00, 0x10,             // in_port = 16,
                     0x00, 0x00, 0x03, 0xd6,             // wildcards = 11 1101 0110
                     0x11, 0x22, 0x33, 0x44, 0x00, 0x00, // dl_src = "11:22:33:44:00:00"
                     0x00, 0x00, 0x00, 0x00, 0xff, 0xff, // dl_src_mask = "00:00:00:00:ff:ff"
                     0xaa, 0xbb, 0xcc, 0x00, 0x00, 0x00, // dl_dst = "aa:bb:cc:00:00:00"
                     0x00, 0x00, 0x00, 0xff, 0xff, 0xff, // dl_dst_mask = "00:00:00:ff:ff:ff"
                     0x00, 0x00,                         // dl_vlan (wildcarded)
                     0x00,                               // dl_vlan_pcp (wildcarded)
                     0x00,                               // pad
                     0x08, 0x00,                         // dl_type = 2048 (0x800)
                     0x00,                               // nw_tos (wildcarded)
                     0x06,                               // nw_proto = 6
                     0xc0, 0xa8, 0x01, 0x00,             // nw_src = "192.168.1.0"
                     0x00, 0x00, 0x00, 0xff,             // nw_src_mask = 0.0.0.255"
                     0xc0, 0xa8, 0x00, 0x00,             // nw_dst = "192.168.0.0"
                     0x00, 0x00, 0xff, 0xff,             // nw_dst_mask = 0.0.255.255"
                     0x00, 0x00,                         // tp_src (wildcarded)
                     0x00, 0x00,                         // tp_dst (wildcarded)
                     0x00, 0x00, 0x00, 0x00,             // mpls_label (wildcarded)
                     0x00,                               // mpls_tc (wildcarded)
                     0x00, 0x00, 0x00,                   // pad
                     0x11, 0x22, 0x33, 0x44, 0x00, 0x00, 0x00, 0x00, // metadata = "1122334400000000"
                     0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff  // metadata_mask = "00000000ffffffff"
        ];

module.exports.obj = {
                "version" : '1.1',
                "header" : {
                    "type" : 'OFPT_STATS_REQUEST',
                    "xid" : 1234567890
                },
                "body" : {
                    "header" : {
                        "type" : 'OFPST_AGGREGATE',
                        "flags" : []
                    },
                    "body" : {
                        "table_id" : 16,
                        "out_port" : 8,
                        "cookie" : new Buffer([0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88]),
                        "cookie_mask" : new Buffer([0xaa, 0xab, 0xac, 0xad, 0xae, 0xaf, 0xba, 0xbb]),
                        "match" : {
                            "header" : {"type" : 'OFPMT_STANDARD'},
                            "body" : {
                                "in_port" : 16,
                                "dl_src" : '11:22:33:44:00:00',
                                "dl_src_mask" : '00:00:00:00:ff:ff',
                                'dl_dst' : 'aa:bb:cc:00:00:00',
                                "dl_dst_mask" : '00:00:00:ff:ff:ff',
                                "dl_type" : 2048,
                                "nw_proto" : 6,
                                "nw_src" : '192.168.1.0',
                                "nw_src_mask" : '0.0.0.255',
                                "nw_dst" : '192.168.0.0',
                                "nw_dst_mask" : '0.0.255.255',
                                "metadata" : new Buffer([0x11, 0x22, 0x33, 0x44, 0x00, 0x00, 0x00, 0x00]),
                                "metadata_mask" : new Buffer([0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff])
                            }
                        }
                    }
                }
        };
