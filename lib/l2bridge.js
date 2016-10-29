const mac = require('mac-address');
const L2Table = require('.,/lib/l2table.js');
const nfutils = require('../lib/nf-utils.js');

const debug = process.env.DEBUG;

module.exports = class L2Bridge {
  constructor (server, dpid) {
    const self = this;

    const portEventEmitter = server.portEventEmitters.get(dpid);

    const l2Table = new L2Table();
    this.l2Table = l2Table;

    portEventEmitter.on('OFPT_PORT_STATUS', (obj) => {
      const body = obj.message.body;

      if (body.reason === 'OFPPR_DELETE') {
        // The port is permanently removed
        l2Table.delPort(body.desc.hw_addr);
      }
    });

    portEventEmitter.on('OFPT_PACKET_IN', (obj) => {
      self.doL2Learning(l2Table, obj, obj.packet);
      self.forwardL2Packet(server, l2Table, obj.packet);
    });
  }

  doL2Learning (l2Table, obj, packet) {
    const dlSrc = packet.shost;
    const inPort = obj.message.body.in_port;

    if (dlSrc === mac.BROADCAST) {
      console.log('Warning source set to Broadcast');
      return;
    }

    const dst = l2Table.getPort(dlSrc);
    if (dst) {
      if (dst !== inPort) {
        if (debug) console.log(`MAC has moved from ${dst} to ${inPort}`);
        l2Table.setPort(dlSrc, inPort);
      }
    } else {
      if (debug) {
        console.log(`Learned mac ${dlSrc} port : ${inPort}`);
      }
      l2Table.setPort(dlSrc, inPort);
    }
  }

  forwardL2Packet (server, l2Table, obj) {
    const packet = obj.packet;
    const dlDst = packet.dhost;
    const dlSrc = packet.shost;
    const inPort = l2Table.getPort(dlSrc);
    const prt = l2Table.getPort(dlDst);

    if (dlDst !== mac.BROADCAST && prt) {
      if (prt === inPort) {
        console.log(`*warning* learned port = ${inPort}, system=nodeFlow`);
        obj.outmessage = nfutils.setOutFloodPacket(obj, prt);
        server.sendMsg('OFPT_PACKET_OUT', obj);
      } else {
        const outPort = prt;
        if (debug) {
          console.log('Installing flow for destination: ' +
                      '%s source: %s  inPort: %s\toutPort: %s\tsystem=NodeFlow',
                      dlDst, dlSrc, inPort, outPort);
        }
        obj.outmessage = nfutils.setFlowModPacket(obj, packet, inPort, outPort);
        server.sendMsg('OFPT_FLOW_MOD', obj);
      }
    } else {
      if (debug) {
        console.log(`Flooding Unknown Buffer id: ${obj.message.body.buffer_id}`);
      }
      obj.outmessage = nfutils.setOutFloodPacket(obj, inPort);
      server.sendMsg('OFPT_PACKET_OUT', obj);
    }
  }
};
