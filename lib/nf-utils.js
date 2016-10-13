// Example OpenFlow Controller written for Node.js
// Prototype eventing system handling of OF messages
//
// Copyright 2016 (C) Olli Vanhoja
// Copyright 2011-2012 (C) Cisco Systems, Inc.
// Author : Gary Berger, Cisco Systems, inc.

const oflib = require('./oflib-node');

exports.setSyncmessage = setSyncmessage;
function setSyncmessage (type, obj) {
  return {
    message: {
      header: {
        type: type,
        xid: obj.message.header.xid || 1, // don't care?
      },
      version: 0x01,
      // TODO
      body: {},
    },
  };
}

exports.fillBuffer = fillBuffer;
function fillBuffer (obj, buffer) {
  try {
    oflib.pack(obj, buffer, 0);
  } catch (error) {
    console.log(`fillBuffer Error packing object ${error}`);
  }
}

exports.setOutFloodPacket = setOutFloodPacket;
function setOutFloodPacket (obj, inPort) {
  const bufId = obj.message.body.buffer_id || 0xffffffff;
  let msg = {
    message: {
      header: {
        type: 'OFPT_PACKET_OUT',
        xid: obj.message.header.xid,
      },
      body: {
        buffer_id: bufId,
        in_port: inPort,
        actions: [{
          header: {
            type: 'OFPAT_OUTPUT',
          },
          body: {
            port: 'OFPP_FLOOD',
          },
        }],
      },
      version: 0x01,
    },
  };

  // If the switch doesn't support buffers we must include the packet
  // in the packet out response.
  if (!obj.message.body.buffer_id) {
    msg.message.body.data = obj.message.body.data;
  }

  return msg;
}

exports.extractFlow = extractFlow;
function extractFlow (packet) {
  let flow = {
    dl_src: packet.shost,
    dl_dst: packet.dhost,
    dl_type: packet.ethertype,
  };

  if (packet.hasOwnProperty('vlan')) {
    // TODO
    flow.dl_vlan = packet.vlan;
    flow.dl_vlan_pcp = packet.priority;
  } else {
    flow.dl_vlan = 0xffff;
    flow.dl_vlan_pcp = 0;
  }

  if (packet.hasOwnProperty('ip')) {
    flow.nw_src = packet.ip.saddr;
    flow.nw_dst = packet.ip.daddr;
    flow.nw_proto = packet.ip.protocol;

    if (packet.ip.hasOwnProperty('udp' || 'tcp')) {
      flow.tp_src = packet.ip.saddr;
      flow.tp_dst = packet.ip.daddr;
    } else {
      if (packet.ip.hasOwnProperty('icmp')) {
        flow.tp_src = packet.ip.icmp.type;
        flow.tp_dst = packet.ip.icmp.code;
      } else {
        flow.tp_src = '0.0.0.0';
        flow.tp_dst = '0.0.0.0';
      }
    }
  } else {
    flow.nw_src = '0.0.0.0';
    flow.nw_dst = '0.0.0.0';
    flow.nw_proto = 0;
    flow.tp_src = '0.0.0.0';
    flow.tp_dst = '0.0.0.0';
  }

  return flow;
}

exports.setFlowModPacket = setFlowModPacket;
function setFlowModPacket (obj, packet, inPort, outPort) {
  let flow = extractFlow(packet);

  flow.in_port = inPort;

  return {
    message: {
      version: 0x01,
      header: {
        type: 'OFPT_FLOW_MOD',
        xid: obj.message.header.xid,
      },
      body: {
        command: 'OFPFC_ADD',
        hard_timeout: 0,
        idle_timeout: 100,
        priority: 0x8000,
        buffer_id: obj.message.body.buffer_id,
        out_port: 'OFPP_NONE',
        flags: ['OFPFF_SEND_FLOW_REM'],
        match: {
          header: {
            type: 'OFPMT_STANDARD',
          },
          body: {
            wildcards: 0,
            in_port: flow.inPort,
            dl_src: flow.dl_src,
            dl_dst: flow.dl_dst,
            dl_vlan: flow.dl_vlan,
            dl_vlan_pcp: flow.dl_vlan_pcp,
            dl_type: flow.dl_type,
            nw_proto: flow.nw_proto,
            nw_src: flow.nw_src,
            nw_dst: flow.nw_dst,
            tp_src: flow.tp_src,
            tp_dst: flow.tp_dst,
          },
        },
        actions: {
          header: {
            type: 'OFPAT_OUTPUT',
          },
          body: {
            port: outPort,
          },
        },
      },
    },
  };
}
