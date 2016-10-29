// Example OpenFlow Controller written for Node.js
// Prototype eventing system handling of OF messages
//
// Copyright 2016 (C) Olli Vanhoja
// Copyright 2011-2012 (C) Cisco Systems, Inc.
// Author : Gary Berger, Cisco Systems, inc.

const EventEmitter = require('events');
const net = require('net');
const promisify = require('es6-promisify');
const decode = require('../lib/decoder.js');
const nfutils = require('../lib/nf-utils.js');
const oflib = require('../lib/oflib-node');
const ofpp = require('../lib/oflib-node/lib/ofp-1.0/ofp.js');

const debug = process.env.DEBUG;
const switchStream = new oflib.Stream();

const dataPathEventEmitter = new EventEmitter();
exports.dpee = dataPathEventEmitter;

exports.default = class NodeFlowServer {
  constructor () {
    this.server = net.createServer();
    this.sessions = new Map();
    this.portEventEmitters = new Map();
  }

  async start (address, port) {
    const self = this;
    const listen = promisify(this.server.listen, this.server);

    await listen(port, address);
    console.log(`NodeFlow Controller listening on ${address}:${port}`);

    this.server.on('connection', (sock) => {
      // Using Nagle seems to improve the performance a lot?
      sock.setNoDelay(false);

      const sessionID = `${sock.remoteAddress}:${sock.remotePort}`;
      this.sessions.set(sessionID, { sock: sock, dpid: undefined });

      console.log(`Connection from : ${sessionID}`);

      sock.on('data', (data) => {
        try {
          const msgs = switchStream.processData(data);
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
  }

  _processMessage (obj, sessionID) {
    if (obj.hasOwnProperty('message')) {
      const type = obj.message.header.type;
      const session = this.sessions.get(sessionID);

      switch (type) {
        case 'OFPT_HELLO':
          this.sendPacket(session.sock, type,
                          nfutils.setSyncmessage('OFPT_HELLO', obj));
          this.sendPacket(session.sock, type,
                          nfutils.setSyncmessage('OFPT_FEATURES_REQUEST', obj));
          break;
        case 'OFPT_ERROR':
          console.error(`Received error: ${obj.message.body.type}:${obj.message.body.code}`);
          // TODO Error handling
          break;
        case 'OFPT_ECHO_REQUEST':
          this.sendPacket(session.sock, type,
                          nfutils.setSyncmessage('OFPT_ECHO_REPLY', obj));
          break;
        case 'OFPT_PACKET_IN': {
          const packet = decode.decodeethernet(obj.message.body.data, 0, { decodeEthernetPayload: false });
          const emitter = this.portEventEmitters.get(session.dpid);

          emitter.emit('OFPT_PACKET_IN', {
            sessionID: sessionID,
            session: session,
            message: obj.message,
            packet: packet,
          });
          break;
        }
        case 'OFPT_FEATURES_REPLY': {
          // Init rest of the session data
          const dpid = obj.message.body.datapath_id;
          this.sessions.get(sessionID).dpid = dpid;
          this.portEventEmitters.set(dpid, new EventEmitter());
          dataPathEventEmitter.emit('INIT', { server: this, dpid });
          break;
        }
        case 'OFPT_PORT_STATUS':
          this.emit('OFPT_PORT_STATUS', {
            message: obj.message,
            sessionID: sessionID,
            session: session,
          });
          break;
        case 'OFPT_FLOW_REMOVED':
          // TODO
          break;
        default:
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
    this.sendPacket(obj.session.sock, obj.messageType, obj.outmessage);
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
};
