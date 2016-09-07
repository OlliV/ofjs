// Example OpenFlow Controller written for Node.js
// Prototype eventing system handling of OF messages
//
// Copyright 2016 (C) Olli Vanhoja
// Copyright 2011-2012 (C) Cisco Systems, Inc.
// Author : Gary Berger, Cisco Systems, inc.

import EventEmitter from 'events';
import net from 'net';
import oflib from './oflib-node';
// import ofpp from '../oflib-node/lib/ofp-1.0/ofp.js';
import decode from './decoder.js';
import * as nfutils from './nf-utils.js';

const debug = process.env.DEBUG;

const switchStream = new oflib.Stream();

export default class NodeFlowServer extends EventEmitter {
  constructor () {
    super();
    this.sessions = [];
    this.server = net.createServer();
  }

  start (address, port) {
    const self = this;

    this.server.listen(port, address, (err, result) => {
      console.log(`NodeFlow Controller listening on ${address}:${port}`);
      this.emit('started', {
        'Config': this.server.address()
      });
    });

    this.server.on('connection', (sock) => {
      // Using Nagle seems to improve the performance a lot?
      sock.setNoDelay(false);

      const sessionID = `${sock.remoteAddress}:${sock.remotePort}`;
      this.sessions[sessionID] = { sessionSocket: sock, dpid: [], l2tables: new Map() };

      console.log(`Connection from : ${sessionID}`);

      sock.on('data', (data) => {
        var msgs = switchStream.process(data);
        msgs.forEach(function (msg) {
          self._processMessage(msg, sessionID);
        });
      });

      sock.on('close', (data) => {
        delete this.sessions[`${sock.remoteAddress}:${sock.remotePort}`];
        console.log('Client Disconnect');
      });

      sock.on('error', (data) => {
        console.log('Client Error');
      });
    });

    this.on('OFPT_PACKET_IN', (obj) => {
      const session = self.sessions[obj.sessionID];
      const dpid = obj.dpid;
      const packet = decode.decodeethernet(obj.message.body.data, 0);

      if (!session.l2tables.has(dpid)) {
        session.l2tables.set(dpid, new Map());
      }
      const l2table = session.l2tables.get(dpid);
      self.doL2Learning(l2table, obj, packet);

      self._forwardL2Packet(l2table, obj, packet);
    });

    this.on('SENDPACKET', (obj) => {
      const sock = self.sessions[obj.packet.sessionID].sessionSocket;
      nfutils.sendPacket(sock, obj.type, obj.packet.outmessage);
    });
  }

  _setDPId (obj, sessionID) {
    var dpid = obj.message.body.datapath_id;
    this.sessions[sessionID].dpid = dpid;
  }

  _processMessage (obj, sessionID) {
    if (obj.hasOwnProperty('message')) {
      const self = this;
      const type = obj.message.header.type;
      const sock = this.sessions[sessionID].sessionSocket;

      switch (type) {
        case 'OFPT_HELLO':
          nfutils.sendPacket(sock, type,
                             nfutils.setSyncmessage('OFPT_HELLO', obj));
          nfutils.sendPacket(sock, type,
                             nfutils.setSyncmessage('OFPT_FEATURES_REQUEST', obj));
          break;
        case 'OFPT_ERROR':
          // TODO
          break;
        case 'OFPT_ECHO_REQUEST':
          nfutils.sendPacket(sock, type,
                             nfutils.setSyncmessage('OFPT_ECHO_REPLY', obj));
          break;
        case 'OFPT_PACKET_IN':

          this.emit('OFPT_PACKET_IN', {
            'message': obj.message,
            'sessionID': sessionID,
            'dpid': self.sessions[sessionID].dpid
          });

          break;
        case 'OFPT_FEATURES_REPLY':
          this._setDPId(obj, sessionID);
          break;
        case 'OFPT_PORT_STATUS':
          // TODO
          break;
        case 'OFPT_FLOW_REMOVED':
          // TODO
          break;
        default:
          // TODO
          console.log(`Unknown OF Type : ${type}`);
          break;
      }
    } else {
      console.log('Failed to get header');

      return;
    }
  }

  doL2Learning (l2table, obj, packet) {
    const dlSrc = packet.shost;
    const inPort = obj.message.body.in_port;

    if (dlSrc === 'ff:ff:ff:ff:ff:ff') {
      console.log('Warning source set to Broadcast');
      return;
    }

    if (l2table.has(dlSrc)) {
      const dst = l2table.get(dlSrc);
      if (dst !== inPort) {
        console.log(`MAC has moved from ${dst} to ${inPort}`);
      } else {
        return;
      }
    } else {
      if (debug) {
        console.log(`learned mac ${dlSrc} port : ${inPort}`);
      }
      l2table.set(dlSrc, inPort);
    }
  }

  _forwardL2Packet (l2table, obj, packet) {
    const dlDst = packet.dhost;
    const dlSrc = packet.shost;
    const inPort = l2table.get(dlSrc);
    const prt = l2table.get(dlDst);

    if (dlDst !== 'ff:ff:ff:ff:ff:ff' && prt) {
      if (prt === inPort) {
        console.log(`*warning* learned port = ${inPort}, system=nodeFlow`);
        obj.outmessage = nfutils.setOutFloodPacket(obj, prt);
        this.emit('SENDPACKET', {
          'packet': obj,
          'type': 'OFPT_PACKET_OUT'
        });
      } else {
        const outPort = prt;
        if (debug) {
          console.log('Installing flow for destination: ' +
                      '%s source: %s  inPort: %s\toutPort: %s\tsystem=NodeFlow',
                      dlDst, dlSrc, inPort, outPort);
        }
        obj.outmessage = nfutils.setFlowModPacket(obj, packet, inPort, outPort);
        this.emit('SENDPACKET', {
          'packet': obj,
          'type': 'OFPT_FLOW_MOD'
        });
      }
    } else {
      if (debug) {
        console.log(`Flooding Unknown Buffer id: ${obj.message.body.buffer_id}`);
      }
      obj.outmessage = nfutils.setOutFloodPacket(obj, inPort);
      this.emit('SENDPACKET', {
        'packet': obj,
        'type': 'OFPT_PACKET_OUT'
      });
    }
  }
}
