/*
 * Author: Zoltán Lajos Kis <zoltan.lajos.kis@ericsson.com>
 */

"use strict";

module.exports.bin = [
               0x02,                    // version = 2
               0x0c,                    // type = 12
               0x00, 0x50,              // length = 80
               0x49, 0x96, 0x02, 0xd2,  // xid = 1234567890
                 0x01,                  // reason = 1
                 0x00, 0x00, 0x00, 0x00,
                 0x00, 0x00, 0x00,        // pad
                   0x00, 0x00, 0x00, 0x12,             // port_no = 18,
                   0x00, 0x00, 0x00, 0x00,             // pad
                   0x11, 0x22, 0x11, 0x33, 0x11, 0x44, // hw_addr = 11:22:11:33:11:44
                   0x00, 0x00,                         // pad
                   0x65, 0x74, 0x68, 0x31,
                   0x00, 0x00, 0x00, 0x00,
                   0x00, 0x00, 0x00, 0x00,
                   0x00, 0x00, 0x00, 0x00,             // name = "eth1"
                   0x00, 0x00, 0x00, 0x60,             // config = 0110 0000
                   0x00, 0x00, 0x00, 0x04,             // state = 0000 0100
                   0x00, 0x00, 0x00, 0x40,             // curr = 0100 0000
                   0x00, 0x00, 0x00, 0x70,             // advertised = 0111 0000
                   0x00, 0x00, 0x00, 0x7c,             // supported = 0111 1100
                   0x00, 0x00, 0x00, 0x00,             // peer = 0 (unsupported)
                   0x00, 0x00, 0x00, 0x80,             // curr_speed = 128
                   0x00, 0x00, 0x01, 0x00              // max_speed = 256
            ];

module.exports.obj = {
                version : '1.1',
                header : {
                    type : 'OFPT_PORT_STATUS',
                    xid : 1234567890,
                },
                body : {
                    reason : 'OFPPR_DELETE',
                    desc : {
                        port_no : 18,
                        hw_addr : '11:22:11:33:11:44',
                        name : 'eth1',
                        config : ['OFPPC_NO_FWD', 'OFPPC_NO_PACKET_IN'],
                        state : ['OFPPS_LIVE'],
                        curr : ['OFPPF_10GB_FD'],
                        advertised : ['OFPPF_10GB_FD', 'OFPPF_1GB_FD', 'OFPPF_1GB_HD'],
                        supported : ['OFPPF_10GB_FD', 'OFPPF_1GB_FD', 'OFPPF_1GB_HD', 'OFPPF_100MB_FD', 'OFPPF_100MB_HD'],
                        curr_speed : 128,
                        max_speed : 256
                    }
                }
            };
