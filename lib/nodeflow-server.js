// Example OpenFlow Controller written for Node.js
// Prototype eventing system handling of OF messages
//
// Copyright 2016 (C) Olli Vanhoja
// Copyright 2011-2012 (C) Cisco Systems, Inc.
// Author : Gary Berger, Cisco Systems, inc.

import EventEmitter from 'events';
import net from 'net';
import oflib from '../oflib-node';
import decode from './decoder.js';
import * as nfutils from './nf-utils.js';

const debug = process.env.DEBUG;

const switchStream = new oflib.Stream();

export default class NodeFlowServer extends EventEmitter {
  constructor () {
    super();
    this.sessions = [];
    this.socket = [];
    this.server = net.createServer();
    this.l2table = {};
    this.flowtable = {};
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
      sock.setNoDelay();

      const sessionID = `${sock.remoteAddress}:${sock.remotePort}`;
      this.sessions[sessionID] = { sessionSocket: sock, dpid: [] };

      console.log(`Connection from : ${sessionID}`);

      sock.on('data', (data) => {
        var msgs = switchStream.process(data);
        msgs.forEach(function (msg) {
          if (msg.hasOwnProperty('message')) {
            self._processMessage(msg, sessionID);
          } else {
            console.log('Error: Message is unparseable');
            console.dir(data);
          }
        });
      });

      sock.on('close', (data) => {
        delete this.sessions[this.socket.remoteAddress + this.socket.remotePort];
        console.log('Client Disconnect');
      });

      sock.on('error', (data) => {
        console.log('Client Error');
      });
    });

    this.on('OFPT_PACKET_IN', (obj) => {
      const packet = decode.decodeethernet(obj.message.body.data, 0);
      nfutils.doL2Learning(this.l2table, obj, packet);
      self._forwardL2Packet(obj, packet);
      // this._forwardL2PacketEnhanced(obj, packet)
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

  _forwardL2Packet (obj, packet) {
    const dlDst = packet.dhost;
    const dlSrc = packet.shost;
    const inPort = this.l2table[obj.dpid][dlSrc];
    const dpid = obj.dpid;

    if (dlDst !== 'ff:ff:ff:ff:ff:ff' &&
        this.l2table[dpid].hasOwnProperty(dlDst)) {
      const prt = this.l2table[dpid][dlDst];
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
          console.log('Installing flow for destination: %s source: %s  inPort: %s\t' +
                      'outPort: %s\tsystem=NodeFlow',
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
