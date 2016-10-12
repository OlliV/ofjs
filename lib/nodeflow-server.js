// Example OpenFlow Controller written for Node.js
// Prototype eventing system handling of OF messages
//
// Copyright 2016 (C) Olli Vanhoja
// Copyright 2011-2012 (C) Cisco Systems, Inc.
// Author : Gary Berger, Cisco Systems, inc.

const EventEmitter = require('events');
const net = require('net');
const oflib = require('./oflib-node');
const ofpp = require('./oflib-node/lib/ofp-1.0/ofp.js');
const decode = require('./decoder.js');
const nfutils = require('./nf-utils.js');
const L2Table = require('./l2table.js');
const l2 = require('./l2forwarding.js');

const debug = process.env.DEBUG;
const switchStream = new oflib.Stream();

module.exports = class NodeFlowServer extends EventEmitter {
  constructor () {
    super();
    this.sessions = new Map();
    this.server = net.createServer();
    this.l2Tables = new Map(); // dpid to L2Table mapping
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
      this.sessions.set(sessionID, { sessionSocket: sock, dpid: [] });

      console.log(`Connection from : ${sessionID}`);

      sock.on('data', (data) => {
        try {
          const msgs = switchStream.process(data);
          msgs.forEach(function (msg) {
            self._processMessage(msg, sessionID);
          });
        } catch (err) {
          console.error(err);
        }
      });

      sock.on('close', (data) => {
        this.sessions.delete(`${sock.remoteAddress}:${sock.remotePort}`);
        console.log('Client Disconnect');
      });

      sock.on('error', (data) => {
        console.log('Client Error');
      });
    });

    this.on('OFPT_PACKET_IN', (obj) => {
      const dpid = obj.dpid;
      const packet = decode.decodeethernet(obj.message.body.data, 0);

      if (!this.l2Tables.has(dpid)) this.l2Tables.set(dpid, new L2Table());
      const l2Table = this.l2Tables.get(dpid);

      l2.doL2Learning(l2Table, obj, packet);
      l2.forwardL2Packet(this, l2Table, obj, packet);
    });

    this.on('SENDPACKET', (obj) => {
      self.sendPacket(obj.socket, obj.messageType, obj.outmessage);
    });
  }

  _setDPId (obj, sessionID) {
    const dpid = obj.message.body.datapath_id;
    this.sessions.get(sessionID).dpid = dpid;
  }

  _processMessage (obj, sessionID) {
    if (obj.hasOwnProperty('message')) {
      const type = obj.message.header.type;
      const sock = this.sessions.get(sessionID).sessionSocket;
      const dpid = this.sessions.get(sessionID).dpid;

      switch (type) {
        case 'OFPT_HELLO':
          this.sendPacket(sock, type,
                          nfutils.setSyncmessage('OFPT_HELLO', obj));
          this.sendPacket(sock, type,
                          nfutils.setSyncmessage('OFPT_FEATURES_REQUEST', obj));
          break;
        case 'OFPT_ERROR':
          // TODO
          break;
        case 'OFPT_ECHO_REQUEST':
          this.sendPacket(sock, type,
                          nfutils.setSyncmessage('OFPT_ECHO_REPLY', obj));
          break;
        case 'OFPT_PACKET_IN':
          this.emit('OFPT_PACKET_IN', {
            message: obj.message,
            sessionID: sessionID,
            socket: sock,
            dpid: dpid
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

  sendMsg (type, obj) {
    obj.messageType = type;
    this.emit('SENDPACKET', obj);
  }

  sendPacket (socket, type, obj) {
    let bufsize = ofpp.H_SIZES[type];

    if (type === 'OFPT_PACKET_OUT') {
      if (obj.message.body.data) bufsize += obj.message.body.data.length;
    }

    const buf = new Buffer(bufsize);

    try {
      oflib.pack(obj, buf, 0);
      socket.write(buf);
    } catch (error) {
      console.log(`_sendPacket Error packing object ${error}`);
    }
  }
}
