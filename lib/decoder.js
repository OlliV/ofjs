// Borrowed this from node-pcap
// tks to the author. 2010 Matthew Ranney

import dns from 'dns';
import events from 'events';
import util from 'util';

const HTTPParser = process.binding('http_parser').HTTPParser;

function Decoder () {
  this.opened = false;
  this.fd = null;

  events.EventEmitter.call(this);
}
util.inherits(Decoder, events.EventEmitter);

exports.Decoder = Decoder;

exports.createSession = function (bufferSize) {
  const session = new Decoder();
  session.open(bufferSize);
  return session;
};


//
// Decoding functions
//
function lpad (str, len) {
  while (str.length < len) {
    str = '0' + str;
  }
  return str;
}

module.exports.dump_bytes = function (rawPacket, offset) {
  for (let i = offset; i < rawPacket.length; i += 1) {
    console.log(`${i}:${rawPacket[i]}`);
  }
};

const unpack = {
  ethernet_addr: function (rawPacket, offset) {
    return `${lpad(rawPacket[offset].toString(16), 2)}:` +
           `${lpad(rawPacket[offset + 1].toString(16), 2)}:` +
           `${lpad(rawPacket[offset + 2].toString(16), 2)}:` +
           `${lpad(rawPacket[offset + 3].toString(16), 2)}:` +
           `${lpad(rawPacket[offset + 4].toString(16), 2)}:` +
           `${lpad(rawPacket[offset + 5].toString(16), 2)}`;
  },
  uint16: function (rawPacket, offset) {
    return ((rawPacket[offset] * 256) + rawPacket[offset + 1]);
  },
  uint32: function (rawPacket, offset) {
    return ((rawPacket[offset] * 16777216) +
        (rawPacket[offset + 1] * 65536) +
        (rawPacket[offset + 2] * 256) +
        rawPacket[offset + 3]);
  },
  uint64: function (rawPacket, offset) {
    return ((rawPacket[offset] * 72057594037927936) +
        (rawPacket[offset + 1] * 281474976710656) +
        (rawPacket[offset + 2] * 1099511627776) +
        (rawPacket[offset + 3] * 4294967296) +
        (rawPacket[offset + 4] * 16777216) +
        (rawPacket[offset + 5] * 65536) +
        (rawPacket[offset + 6] * 256) +
        rawPacket[offset + 7]);
  },
  ipv4_addr: function (rawPacket, offset) {
    return `${rawPacket[offset]}.${rawPacket[offset + 1]}.${rawPacket[offset + 2]}.${rawPacket[offset + 3]}`;
  },
  ipv6_addr: function (rawPacket, offset) {
    let ret = '';
    for (let i = offset; i < offset + 16; i += 2) {
      if (i > offset) {
        ret += ':';
      }
      ret += unpack.uint16(rawPacket, i).toString(16);
    }
    // TODO: do a better job to compress out largest run of zeros.
    return ret.replace(/(0:)+/, ':');
  }
};
module.exports.unpack = unpack;

let decode = {};
// convert raw packet data into JavaScript objects with friendly names
decode.packet = function (rawPacket) {
  return decode.ethernet(rawPacket, 0);
};

decode.rawtype = function (rawPacket, offset) {
  return {ip: decode.ip(rawPacket, 0)};
};

module.exports.getrawtype = function (rawPacket, offset) {
  decode.rawtype(rawPacket, offset);
};

decode.nulltype = function (rawPacket, offset) {
  let ret = {};

  // an oddity about nulltype is that it starts with a 4 byte header, but I can't find a
  // way to tell which byte order is used.  The good news is that all address family
  // values are 8 bits or less.
  if (rawPacket[0] === 0 && rawPacket[1] === 0) {
    // must be one of the endians
    ret.pftype = rawPacket[3];
  } else {
    // and this is the other one
    ret.pftype = rawPacket[0];
  }

  if (ret.pftype === 2) {
    // AF_INET, at least on my Linux and OSX machines right now
    ret.ip = decode.ip(rawPacket, 4);
  } else if (ret.pftype === 30) {
    // AF_INET6, often
    ret.ip = decode.ip6(rawPacket, 4);
  } else {
    console.log(`Decoder.js: decode.nulltype() - Don't know how to decode protocol family ${ret.pftype}`);
  }

  return ret;
};

decode.ethernet = function (rawPacket, offset) {
  let ret = {
    dhost: unpack.ethernet_addr(rawPacket, 0),
    shost: unpack.ethernet_addr(rawPacket, 6),
    ethertype: unpack.uint16(rawPacket, 12)
  };

  offset = 14;

  // Check for a tagged frame
  switch (ret.ethertype) {
    case 0x8100:
      // VLAN-tagged (802.1Q)
      ret.vlan = decode.vlan(rawPacket, 14);

      // Update the ethertype
      ret.ethertype = unpack.uint16(rawPacket, 16);
      offset = 18;
      break;
  }

  if (ret.ethertype < 1536) {
    // this packet is actually some 802.3 type without an ethertype
    ret.ethertype = 0;
  } else {
    // http://en.wikipedia.org/wiki/EtherType
    switch (ret.ethertype) {
      case 0x800:
        // IPv4
        ret.ip = decode.ip(rawPacket, offset);
        break;
      case 0x806:
        // ARP
        ret.arp = decode.arp(rawPacket, offset);
        break;
      case 0x86dd:
        // IPv6 - http://en.wikipedia.org/wiki/IPv6
        ret.ipv6 = decode.ip6(rawPacket, offset);
        break;
      case 0x88cc:
        // LLDP - http://en.wikipedia.org/wiki/Link_Layer_Discovery_Protocol
        ret.lldp = 'need to implement LLDP';
        break;
      default:
        console.log(`Decoder.js: decode.ethernet() - Don't know how to decode ethertype ${ret.ethertype}`);
    }
  }

  return ret;
};

module.exports.decodeethernet = function (rawPacket, offset) {
  return decode.ethernet(rawPacket, offset);
};

decode.vlan = function (rawPacket, offset) {
  // http://en.wikipedia.org/wiki/IEEE_802.1Q
  return {
    priority: (rawPacket[offset] & 0xE0) >> 5,
    canonical_format: (rawPacket[offset] & 0x10) >> 4,
    id: ((rawPacket[offset] & 0x0F) << 8) | rawPacket[offset + 1]
  };
};

decode.arp = function (rawPacket, offset) {
  // http://en.wikipedia.org/wiki/Address_Resolution_Protocol
  let ret = {
    htype: unpack.uint16(rawPacket, offset),
    // 0, 1
    ptype: unpack.uint16(rawPacket, offset + 2),
    // 2, 3
    hlen: rawPacket[offset + 4],
    plen: rawPacket[offset + 5],
    operation: unpack.uint16(rawPacket, offset + 6)
    // 6, 7
  };

  if (ret.operation === 1) {
    ret.operation = 'request';
  } else if (ret.operation === 2) {
    ret.operation = 'reply';
  } else {
    ret.operation = 'unknown';
  }
  if (ret.hlen === 6 && ret.plen === 4) {
    // ethernet + IPv4
    ret.sender_ha = unpack.ethernet_addr(rawPacket, offset + 8);
    // 8, 9, 10, 11, 12, 13
    ret.sender_pa = unpack.ipv4_addr(rawPacket, offset + 14);
    // 14, 15, 16, 17
    ret.target_ha = unpack.ethernet_addr(rawPacket, offset + 18);
    // 18, 19, 20, 21, 22, 23

    ret.target_pa = unpack.ipv4_addr(rawPacket, offset + 24);
    // 24, 25, 26, 27
  }
  // don't know how to decode more exotic ARP types

  return ret;
};

decode.ip = function (rawPacket, offset) {
  // http://en.wikipedia.org/wiki/IPv4
  let ret = {
    version: (rawPacket[offset] & 240) >> 4,
    // first 4 bits
    header_length: rawPacket[offset] & 15,
    // second 4 bits
    header_bytes: ret.header_length * 4,
    diffserv: rawPacket[offset + 1],
    total_length: unpack.uint16(rawPacket, offset + 2),
    // 2, 3
    identification: unpack.uint16(rawPacket, offset + 4),
    // 4, 5
    flags: {
      reserved: (rawPacket[offset + 6] & 128) >> 7,
      df: (rawPacket[offset + 6] & 64) >> 6,
      mf: (rawPacket[offset + 6] & 32) >> 5
    },
    fragment_offset: ((rawPacket[offset + 6] & 31) * 256) + rawPacket[offset + 7],
    // 13-bits from 6, 7
    ttl: rawPacket[offset + 8],
    protocol: rawPacket[offset + 9],
    header_checksum: unpack.uint16(rawPacket, offset + 10),
    // 10, 11
    saddr: unpack.ipv4_addr(rawPacket, offset + 12),
    // 12, 13, 14, 15
    daddr: unpack.ipv4_addr(rawPacket, offset + 16)
    // 16, 17, 18, 19
  };

  // TODO - parse IP "options" if header_length > 5
  switch (ret.protocol) {
    case 1:
      ret.protocol_name = 'ICMP';
      ret.icmp = decode.icmp(rawPacket, offset + (ret.header_length * 4));
      break;
    case 2:
      ret.protocol_name = 'IGMP';
      ret.igmp = decode.igmp(rawPacket, offset + (ret.header_length * 4));
      break;
    case 6:
      ret.protocol_name = 'TCP';
      ret.tcp = decode.tcp(rawPacket, offset + (ret.header_length * 4), ret);
      break;
    case 17:
      ret.protocol_name = 'UDP';
      ret.udp = decode.udp(rawPacket, offset + (ret.header_length * 4));
      break;
    default:
      ret.protocol_name = 'Unknown';
  }

  return ret;
};

decode.ip6_header = function (rawPacket, nextHeader, ip, offset) {
  switch (nextHeader) {
    case 1:
      ip.protocol_name = 'ICMP';
      ip.icmp = decode.icmp(rawPacket, offset);
      break;
    case 2:
      ip.protocol_name = 'IGMP';
      ip.igmp = decode.igmp(rawPacket, offset);
      break;
    case 6:
      ip.protocol_name = 'TCP';
      ip.tcp = decode.tcp(rawPacket, offset, ip);
      break;
    case 17:
      ip.protocol_name = 'UDP';
      ip.udp = decode.udp(rawPacket, offset);
      break;
    default:
      // TODO: capture the extensions
      // decode.ip6_header(rawPacket, rawPacket[offset], offset + rawPacket[offset + 1]);
  }
};

decode.ip6 = function (rawPacket, offset) {
  let ret = {};

  // http://en.wikipedia.org/wiki/IPv6
  ret.version = (rawPacket[offset] & 240) >> 4;
  // first 4 bits
  ret.traffic_class = ((rawPacket[offset] & 15) << 4) + ((rawPacket[offset + 1] & 240) >> 4);
  ret.flow_label = ((rawPacket[offset + 1] & 15) << 16) +
    (rawPacket[offset + 2] << 8) +
    rawPacket[offset + 3];
  ret.payload_length = unpack.uint16(rawPacket, offset + 4);
  ret.total_length = ret.payload_length + 40;
  ret.next_header = rawPacket[offset + 6];
  ret.hop_limit = rawPacket[offset + 7];
  ret.saddr = unpack.ipv6_addr(rawPacket, offset + 8);
  ret.daddr = unpack.ipv6_addr(rawPacket, offset + 24);
  ret.header_bytes = 40;

  decode.ip6_header(rawPacket, ret.next_header, ret, offset + 40);
  return ret;
};

decode.icmp = function (rawPacket, offset) {
  let ret = {};

  // http://en.wikipedia.org/wiki/Internet_Control_Message_Protocol
  ret.type = rawPacket[offset];
  ret.code = rawPacket[offset + 1];
  ret.checksum = unpack.uint16(rawPacket, offset + 2);
  // 2, 3
  ret.id = unpack.uint16(rawPacket, offset + 4);
  // 4, 5
  ret.sequence = unpack.uint16(rawPacket, offset + 6);
  // 6, 7
  switch (ret.type) {
    case 0:
      ret.type_desc = 'Echo Reply';
      break;
    case 1:
    case 2:
      ret.type_desc = 'Reserved';
      break;
    case 3:
      switch (ret.code) {
        case 0:
          ret.type_desc = 'Destination Network Unreachable';
          break;
        case 1:
          ret.type_desc = 'Destination Host Unreachable';
          break;
        case 2:
          ret.type_desc = 'Destination Protocol Unreachable';
          break;
        case 3:
          ret.type_desc = 'Destination Port Unreachable';
          break;
        case 4:
          ret.type_desc = 'Fragmentation required, and DF flag set';
          break;
        case 5:
          ret.type_desc = 'Source route failed';
          break;
        case 6:
          ret.type_desc = 'Destination network unknown';
          break;
        case 7:
          ret.type_desc = 'Destination host unknown';
          break;
        case 8:
          ret.type_desc = 'Source host isolated';
          break;
        case 9:
          ret.type_desc = 'Network administratively prohibited';
          break;
        case 10:
          ret.type_desc = 'Host administratively prohibited';
          break;
        case 11:
          ret.type_desc = 'Network unreachable for TOS';
          break;
        case 12:
          ret.type_desc = 'Host unreachable for TOS';
          break;
        case 13:
          ret.type_desc = 'Communication administratively prohibited';
          break;
        default:
          ret.type_desc = `Destination Unreachable (unknown code ${ret.code})`;
      }
      break;
    case 4:
      ret.type_desc = 'Source Quench';
      break;
    case 5:
      switch (ret.code) {
        case 0:
          ret.type_desc = 'Redirect Network';
          break;
        case 1:
          ret.type_desc = 'Redirect Host';
          break;
        case 2:
          ret.type_desc = 'Redirect TOS and Network';
          break;
        case 3:
          ret.type_desc = 'Redirect TOS and Host';
          break;
        default:
          ret.type_desc = `Redirect (unknown code ${ret.code})`;
          break;
      }
      break;
    case 6:
      ret.type_desc = 'Alternate Host Address';
      break;
    case 7:
      ret.type_desc = 'Reserved';
      break;
    case 8:
      ret.type_desc = 'Echo Request';
      break;
    case 9:
      ret.type_desc = 'Router Advertisement';
      break;
    case 10:
      ret.type_desc = 'Router Solicitation';
      break;
    case 11:
      switch (ret.code) {
        case 0:
          ret.type_desc = 'TTL expired in transit';
          break;
        case 1:
          ret.type_desc = 'Fragment reassembly time exceeded';
          break;
        default:
          ret.type_desc = `Time Exceeded (unknown code ${ret.code}`;
      }
      break;
      // TODO - decode the rest of the well-known ICMP messages
    default:
      ret.type_desc = `type ${ret.type} code ${ret.code}`;
  }

  // There are usually more exciting things hiding in ICMP packets after the headers
  return ret;
};

decode.igmp = function (rawPacket, offset) {
  let ret = {};

  // http://en.wikipedia.org/wiki/Internet_Group_Management_Protocol
  ret.type = rawPacket[offset];
  ret.max_response_time = rawPacket[offset + 1];
  ret.checksum = unpack.uint16(rawPacket, offset + 2);
  // 2, 3
  ret.group_address = unpack.ipv4_addr(rawPacket, offset + 4);
  // 4, 5, 6, 7
  switch (ret.type) {
    case 0x11:
      ret.version = ret.max_response_time > 0 ? 2 : 1;
      ret.type_desc = 'Membership Query';
      break;
    case 0x12:
      ret.version = 1;
      ret.type_desc = 'Membership Report';
      break;
    case 0x16:
      ret.version = 2;
      ret.type_desc = 'Membership Report';
      break;
    case 0x17:
      ret.version = 2;
      ret.type_desc = 'Leave Group';
      break;
    case 0x22:
      ret.version = 3;
      ret.type_desc = 'Membership Report';
      // TODO: Decode v3 message
      break;
    default:
      ret.type_desc = `type ${ret.type}`;
      break;
  }

  return ret;
};

decode.udp = function (rawPacket, offset) {
  // http://en.wikipedia.org/wiki/User_Datagram_Protocol
  let ret = {
    sport: unpack.uint16(rawPacket, offset),
    // 0, 1
    dport: unpack.uint16(rawPacket, offset + 2),
    // 2, 3
    length: unpack.uint16(rawPacket, offset + 4),
    // 4, 5
    checksum: unpack.uint16(rawPacket, offset + 6)
    // 6, 7
  };
  if (ret.sport === 53 || ret.dport === 53) {
    ret.dns = decode.dns(rawPacket, offset + 8);
  }

  return ret;
};

decode.tcp = function (rawPacket, offset, ip) {
  // http://en.wikipedia.org/wiki/Transmission_Control_Protocol
  let ret = {
    sport: unpack.uint16(rawPacket, offset),
    // 0, 1
    dport: unpack.uint16(rawPacket, offset + 2),
    // 2, 3
    seqno: unpack.uint32(rawPacket, offset + 4),
    // 4, 5, 6, 7
    ackno: unpack.uint32(rawPacket, offset + 8),
    // 8, 9, 10, 11
    data_offset: (rawPacket[offset + 12] & 0xf0) >> 4,
    // first 4 bits of 12
    header_bytes: 0,
    // convenience for using data_offset
    reserved: rawPacket[offset + 12] & 15,
    // second 4 bits of 12
    flags: {
      cwr: (rawPacket[offset + 13] & 128) >> 7,
      // all flags packed into 13
      ece: (rawPacket[offset + 13] & 64) >> 6,
      urg: (rawPacket[offset + 13] & 32) >> 5,
      ack: (rawPacket[offset + 13] & 16) >> 4,
      psh: (rawPacket[offset + 13] & 8) >> 3,
      rst: (rawPacket[offset + 13] & 4) >> 2,
      syn: (rawPacket[offset + 13] & 2) >> 1,
      fin: rawPacket[offset + 13] & 1
    },
    window_size: unpack.uint16(rawPacket, offset + 14),
    // 14, 15
    checksum: unpack.uint16(rawPacket, offset + 16),
    // 16, 17
    urgent_pointer: unpack.uint16(rawPacket, offset + 18),
    // 18, 19
    options: {}
  };
  ret.header_bytes = ret.data_offset * 4;

  let optionOffset = offset + 20;
  const optionsEnd = offset + (ret.data_offset * 4);
  while (optionOffset < optionsEnd) {
    switch (rawPacket[optionOffset]) {
      case 0:
        optionOffset += 1;
        break;
      case 1:
        optionOffset += 1;
        break;
      case 2:
        ret.options.mss = unpack.uint16(rawPacket, optionOffset + 2);
        optionOffset += 4;
        break;
      case 3:
        ret.options.window_scale = Math.pow(2, (rawPacket[optionOffset + 2]));
        optionOffset += 3;
        break;
      case 4:
        ret.options.sack_ok = true;
        optionOffset += 2;
        break;
      case 5:
        ret.options.sack = [];
        switch (rawPacket[optionOffset + 1]) {
          case 10:
            ret.options.sack.push([unpack.uint32(rawPacket, optionOffset + 2),
                                   unpack.uint32(rawPacket, optionOffset + 6)]);
            optionOffset += 10;
            break;
          case 18:
            ret.options.sack.push([unpack.uint32(rawPacket, optionOffset + 2),
                                   unpack.uint32(rawPacket, optionOffset + 6)]);
            ret.options.sack.push([unpack.uint32(rawPacket, optionOffset + 10),
                                   unpack.uint32(rawPacket, optionOffset + 14)]);
            optionOffset += 18;
            break;
          case 26:
            ret.options.sack.push([unpack.uint32(rawPacket, optionOffset + 2),
                                   unpack.uint32(rawPacket, optionOffset + 6)]);
            ret.options.sack.push([unpack.uint32(rawPacket, optionOffset + 10),
                                   unpack.uint32(rawPacket, optionOffset + 14)]);
            ret.options.sack.push([unpack.uint32(rawPacket, optionOffset + 18),
                                   unpack.uint32(rawPacket, optionOffset + 22)]);
            optionOffset += 26;
            break;
          case 34:
            ret.options.sack.push([unpack.uint32(rawPacket, optionOffset + 2),
                                   unpack.uint32(rawPacket, optionOffset + 6)]);
            ret.options.sack.push([unpack.uint32(rawPacket, optionOffset + 10),
                                   unpack.uint32(rawPacket, optionOffset + 14)]);
            ret.options.sack.push([unpack.uint32(rawPacket, optionOffset + 18),
                                   unpack.uint32(rawPacket, optionOffset + 22)]);
            ret.options.sack.push([unpack.uint32(rawPacket, optionOffset + 26),
                                   unpack.uint32(rawPacket, optionOffset + 30)]);
            optionOffset += 34;
            break;
          default:
            console.log(`Invalid TCP SACK option length ${rawPacket[optionOffset + 1]}`);
            optionOffset = optionsEnd;
        }
        break;
      case 8:
        ret.options.timestamp = unpack.uint32(rawPacket, optionOffset + 2);
        ret.options.echo = unpack.uint32(rawPacket, optionOffset + 6);
        optionOffset += 10;
        break;
      default:
        throw new Error(`Don't know how to process TCP option ${rawPacket[optionOffset]}`);
    }
  }

  ret.data_offset = offset + ret.header_bytes;
  ret.data_end = offset + ip.total_length - ip.header_bytes;
  ret.data_bytes = ret.data_end - ret.data_offset;
  if (ret.data_bytes > 0) {
    // add a buffer slice pointing to the data area of this TCP packet.
    // Note that this does not make a copy, so ret.data is only valid for
    // this current trip through the capture loop.
    ret.data = rawPacket.slice(ret.data_offset, ret.data_end);
  }

  // automatic protocol decode ends here.  Higher level protocols can be decoded by using payload.
  return ret;
};

// helpers for DNS decoder
const dnsUtil = {
  type_to_string: function (typeNum) {
    switch (typeNum) {
      case 1:
        return 'A';
      case 2:
        return 'NS';
      case 3:
        return 'MD';
      case 4:
        return 'MF';
      case 5:
        return 'CNAME';
      case 6:
        return 'SOA';
      case 7:
        return 'MB';
      case 8:
        return 'MG';
      case 9:
        return 'MR';
      case 10:
        return 'NULL';
      case 11:
        return 'WKS';
      case 12:
        return 'PTR';
      case 13:
        return 'HINFO';
      case 14:
        return 'MINFO';
      case 15:
        return 'MX';
      case 16:
        return 'TXT';
      default:
        return (`Unknown (${typeNum})`);
    }
  },
  qtype_to_string: function (qtypeNum) {
    switch (qtypeNum) {
      case 252:
        return 'AXFR';
      case 253:
        return 'MAILB';
      case 254:
        return 'MAILA';
      case 255:
        return '*';
      default:
        return dnsUtil.type_to_string(qtypeNum);
    }
  },
  class_to_string: function (classNum) {
    switch (classNum) {
      case 1:
        return 'IN';
      case 2:
        return 'CS';
      case 3:
        return 'CH';
      case 4:
        return 'HS';
      default:
        return `Unknown (${classNum})`;
    }
  },
  qclass_to_string: function (qclassNum) {
    if (qclassNum === 255) {
      return '*';
    } else {
      return dnsUtil.class_to_string(qclassNum);
    }
  }
};

decode.dns = function (rawPacket, offset) {
  let ret = {};

  // http://tools.ietf.org/html/rfc1035
  ret.header = {};
  ret.header.id = unpack.uint16(rawPacket, offset);
  // 0, 1
  ret.header.qr = (rawPacket[offset + 2] & 128) >> 7;
  ret.header.opcode = (rawPacket[offset + 2] & 120) >> 3;
  ret.header.aa = (rawPacket[offset + 2] & 4) >> 2;
  ret.header.tc = (rawPacket[offset + 2] & 2) >> 1;
  ret.header.rd = rawPacket[offset + 2] & 1;
  ret.header.ra = (rawPacket[offset + 3] & 128) >> 7;
  ret.header.z = 0;
  // spec says this MUST always be 0
  ret.header.rcode = rawPacket[offset + 3] & 15;
  ret.header.qdcount = unpack.uint16(rawPacket, offset + 4);
  // 4, 5
  ret.header.ancount = unpack.uint16(rawPacket, offset + 6);
  // 6, 7
  ret.header.nscount = unpack.uint16(rawPacket, offset + 8);
  // 8, 9
  ret.header.arcount = unpack.uint16(rawPacket, offset + 10);
  // 10, 11
  let internalOffset = offset + 12;

  ret.question = [];
  for (let i = 0; i < ret.header.qdcount; i += 1) {
    ret.question[i] = {};
    let questionDone = false;
    let parts = [];
    while (!questionDone && internalOffset < rawPacket.Decoder_header.caplen) {
      const len = rawPacket[internalOffset];
      if (len > 0) {
        parts.push(rawPacket.toString('ascii', internalOffset + 1, internalOffset + 1 + len));
      } else {
        questionDone = true;
      }
      internalOffset += (len + 1);
    }
    ret.question[i].qname = parts.join('.');
    ret.question[i].qtype = dnsUtil.qtype_to_string(unpack.uint16(rawPacket, internalOffset));
    internalOffset += 2;
    ret.question[i].qclass = dnsUtil.qclass_to_string(unpack.uint16(rawPacket, internalOffset));
    internalOffset += 2;
  }

  // TODO - actual hard parts here, understand RR compression scheme, etc.
  ret.answer = {};
  ret.authority = {};
  ret.additional = {};

  return ret;
};

module.exports.decode = decode;

// cache reverse DNS lookups for the life of the program
const dnsCache = (function () {
  let cache = {};
  let requests = {};

  function lookupPtr (ip, callback) {
    if (cache[ip]) {
      return cache[ip];
    } else {
      if (!requests[ip]) {
        requests[ip] = true;
        dns.reverse(ip,
            function (err, domains) {
              if (err) {
                cache[ip] = ip;
                // TODO - check for network and broadcast addrs, since we have iface info
              } else {
                cache[ip] = domains[0];
                if (typeof callback === 'function') {
                  callback(domains[0]);
                }
              }
              delete requests[ip];
            });
      }
      return ip;
    }
  }

  return {
    ptr: function (ip, callback) {
      return lookupPtr(ip, callback);
    }
  };
}());
exports.dnsCache = dnsCache;

const print = {};
// simple printers for common types
print.dns = function (packet) {
  let ret = ' DNS';
  const dnsPacket = packet.link.ip.udp.dns;

  if (dnsPacket.header.qr === 0) {
    ret += ' question';
  } else if (dnsPacket.header.qr === 1) {
    ret += ' answer';
  } else {
    return ` DNS format invalid: qr = ${dnsPacket.header.qr}`;
  }

  ret += ` ${dnsPacket.question[0].qname}  ${dnsPacket.question[0].qtype}`;

  return ret;
};

print.ip = function (packet) {
  let ret = '';
  let ip = packet.link.ip;

  switch (ip.protocol_name) {
    case 'TCP':
      ret += ` ${dnsCache.ptr(ip.saddr)}:${ip.tcp.sport} -> ${dnsCache.ptr(ip.daddr)}:${ip.tcp.dport} ` +
          `TCP len ${ip.total_length} [` +
        Object.keys(ip.tcp.flags).filter(function (v) {
          if (ip.tcp.flags[v] === 1) {
            return true;
          }
        }).join(',') + ']';
      break;
    case 'UDP':
      ret += ` ${dnsCache.ptr(ip.saddr)}:${ip.udp.sport} -> ${dnsCache.ptr(ip.daddr)}:${ip.udp.dport}`;
      if (ip.udp.sport === 53 || ip.udp.dport === 53) {
        ret += print.dns(packet);
      } else {
        ret += ` UDP len  ${ip.total_length}`;
      }
      break;
    case 'ICMP':
      ret += ` ${dnsCache.ptr(ip.saddr)} -> ${dnsCache.ptr(ip.daddr)} ICMP ${ip.icmp.type_desc} ${ip.icmp.sequence}`;
      break;
    case 'IGMP':
      ret += ` ${dnsCache.ptr(ip.saddr)} -> ${dnsCache.ptr(ip.daddr)} IGMP ${ip.igmp.type_desc} ${ip.igmp.group_address}`;
      break;
    default:
      ret += ` proto ${ip.protocol_name}`;
      break;
  }

  return ret;
};

print.arp = function (packet) {
  let ret = '';
  const arp = packet.link.arp;

  if (arp.htype === 1 && arp.ptype === 0x800 && arp.hlen === 6 && arp.plen === 4) {
    ret += ` ${arp.sender_pa} ARP ${arp.operation} ${arp.target_pa}`;
    if (arp.operation === 'reply') {
      ret += ` hwaddr ${arp.target_ha}`;
    }
  } else {
    ret = ' unknown arp type';
    ret += util.inspect(arp);
  }

  return ret;
};

print.ethernet = function (packet) {
  let ret = `${packet.link.shost} -> ${packet.link.dhost}`;

  switch (packet.link.ethertype) {
    case 0x0:
      ret += ' 802.3 type ';
      break;
    case 0x800:
      ret += print.ip(packet);
      break;
    case 0x806:
      ret += print.arp(packet);
      break;
    case 0x86dd:
      ret += ' IPv6 ';
      break;
    case 0x88cc:
      ret += ' LLDP ';
      break;
    default:
      console.log(`Decoder.js: print.ethernet() - Don't know how to print ethertype ${packet.link.ethertype}`);
  }

  return ret;
};

print.rawtype = function (packet) {
  let ret = 'raw';

  ret += print.ip(packet);

  return ret;
};

print.nulltype = function (packet) {
  let ret = 'loopback';

  if (packet.link.pftype === 2) {
    // AF_INET, at least on my Linux and OSX machines right now
    ret += print.ip(packet);
  } else if (packet.link.pftype === 30) {
    // AF_INET6, often
    console.log('Decoder.js: print.nulltype() - Don\'t know how to print IPv6 packets.');
  } else {
    console.log(`Decoder.js: print.nulltype() - Don't know how to print protocol family ${packet.link.pftype}`);
  }

  return ret;
};

print.packet = function (packetToPrint) {
  let ret = '';
  ret = print.ethernet(packetToPrint);
  return ret;
};

exports.print = print;

// Meaningfully hold the different types of frames at some point
function WebSocketFrame () {
  this.type = null;
  this.data = '';
}

function WebSocketParser (flag) {
  this.buffer = new Buffer(64 * 1024);
  // 64KB is the max message size
  this.buffer.end = 0;
  if (flag === 'draft76') {
    this.state = 'skip_response';
    this.skipped_bytes = 0;
  } else {
    this.state = 'frame_type';
  }
  this.frame = new WebSocketFrame();

  events.EventEmitter.call(this);
}
util.inherits(WebSocketParser, events.EventEmitter);

WebSocketParser.prototype.execute = function (incomingBuf) {
  let pos = 0;

  while (pos < incomingBuf.length) {
    switch (this.state) {
      case 'skip_response':
        this.skipped_bytes += 1;
        if (this.skipped_bytes === 16) {
          this.state = 'frame_type';
        }
        pos += 1;
        break;
      case 'frame_type':
        this.frame.type = incomingBuf[pos];
        pos += 1;
        this.state = 'read_until_marker';
        break;
      case 'read_until_marker':
        if (incomingBuf[pos] !== 255) {
          this.buffer[this.buffer.end] = incomingBuf[pos];
          this.buffer.end += 1;
          pos += 1;
        } else {
          this.frame.data = this.buffer.toString('utf8', 0, this.buffer.end);
          this.emit('message', this.frame.data);
          // this gets converted to "websocket message" in TCPTracker
          this.state = 'frame_type';
          this.buffer.end = 0;
          pos += 1;
        }
        break;
      default:
        throw new Error(`invalid state ${this.state}`);
    }
  }
};

function TCPTracker () {
  this.sessions = {};
  events.EventEmitter.call(this);
}
util.inherits(TCPTracker, events.EventEmitter);
exports.TCPTracker = TCPTracker;

TCPTracker.prototype.makeSessionKey = function (src, dst) {
  return [src, dst].sort().join('-');
};

TCPTracker.prototype.detectHttpRequest = function (buf) {
  const str = buf.toString('utf8', 0, buf.length);

  return (/^(OPTIONS|GET|HEAD|POST|PUT|DELETE|TRACE|CONNECT|COPY|LOCK|MKCOL|MOVE|PROPFIND|PROPPATCH|UNLOCK) [^\s\r\n]+ HTTP\/\d\.\d\r\n/.test(str));
};

TCPTracker.prototype.sessionStats = function (session) {
  let sendAcks = Object.keys(session.send_acks);
  let recvAcks = Object.keys(session.recv_acks);
  let totalTime = session.close_time - session.syn_time;
  let stats = {};

  sendAcks.sort();
  recvAcks.sort();

  stats.recv_times = {};
  sendAcks.forEach(function (v) {
    if (session.recv_packets[v]) {
      stats.recv_times[v] = session.send_acks[v] - session.recv_packets[v];
    } else {
      //            console.log("send ACK with missing recv seqno: " + v);
    }
  });

  stats.send_times = {};
  recvAcks.forEach(function (v) {
    if (session.send_packets[v]) {
      stats.send_times[v] = session.recv_acks[v] - session.send_packets[v];
    } else {
      //            console.log("recv ACK with missing send seqno: " + v);
    }
  });

  stats.recv_retrans = {};
  Object.keys(session.recv_retrans).forEach(function (v) {
    stats.recv_retrans[v] = session.recv_retrans[v];
  });

  stats.total_time = totalTime;
  stats.send_overhead = session.send_bytes_ip + session.send_bytes_tcp;
  stats.send_payload = session.send_bytes_payload;
  stats.send_total = stats.send_overhead + stats.send_payload;
  stats.recv_overhead = session.recv_bytes_ip + session.recv_bytes_tcp;
  stats.recv_payload = session.recv_bytes_payload;
  stats.recv_total = stats.recv_overhead + stats.recv_payload;

  if (session.http.request) {
    stats.http_request = session.http.request;
  }

  return stats;
};

TCPTracker.prototype.setupHttpTracking = function (session) {
  let self = this;
  let http = {};

  http.request_parser = new HTTPParser('request');
  http.request_parser.onMessageBegin = function () {
    http.request = {
      headers: {},
      url: '',
      method: '',
      body_len: 0,
      http_version: null
    };

    http.request_parser.onURL = function (buf, start, len) {
      const urlString = buf.toString('ascii', start, start + len);
      if (http.request.url) {
        http.request.url += urlString;
      } else {
        http.request.url = urlString;
      }
    };

    http.request_parser.onHeaderField = function (buf, start, len) {
      let field = buf.toString('ascii', start, start + len);
      if (http.request_parser.header_value) {
        http.request.headers[http.request_parser.header_field] = http.request_parser.header_value;
        http.request_parser.header_field = null;
        http.request_parser.header_value = null;
      }
      if (http.request_parser.header_field) {
        http.request_parser.header_field += field;
      } else {
        http.request_parser.header_field = field;
      }
    };

    http.request_parser.onHeaderValue = function (buf, start, len) {
      let value = buf.toString('ascii', start, start + len);
      if (http.request_parser.header_value) {
        http.request_parser.header_value += value;
      } else {
        http.request_parser.header_value = value;
      }
    };

    http.request_parser.onHeadersComplete = function (info) {
      if (http.request_parser.header_field && http.request_parser.header_value) {
        http.request.headers[http.request_parser.header_field] = http.request_parser.header_value;
      }

      http.request.http_version = `${info.versionMajor}.${info.versionMinor}`;

      http.request.method = info.method;
      self.emit('http request', session, http);
    };

    http.request_parser.onBody = function (buf, start, len) {
      http.request.body_len += len;
      self.emit('http request body', session, http, buf.slice(start, start + len));
    };

    http.request_parser.onMessageComplete = function () {
      self.emit('http request complete', session, http);
    };
  };

  http.response_parser = new HTTPParser('response');
  http.response_parser.onMessageBegin = function () {
    http.response = {
      headers: {},
      status_code: null,
      body_len: 0,
      http_version: null
    };
    http.response_parser.onHeaderField = function (buf, start, len) {
      let field = buf.toString('ascii', start, start + len);
      if (http.response_parser.header_value) {
        http.response.headers[http.response_parser.header_field] = http.response_parser.header_value;
        http.response_parser.header_field = null;
        http.response_parser.header_value = null;
      }
      if (http.response_parser.header_field) {
        http.response_parser.header_field += field;
      } else {
        http.response_parser.header_field = field;
      }
    };

    http.response_parser.onHeaderValue = function (buf, start, len) {
      let value = buf.toString('ascii', start, start + len);
      if (http.response_parser.header_value) {
        http.response_parser.header_value += value;
      } else {
        http.response_parser.header_value = value;
      }
    };

    http.response_parser.onHeadersComplete = function (info) {
      if (http.response_parser.header_field && http.response_parser.header_value) {
        http.response.headers[http.response_parser.header_field] = http.response_parser.header_value;
      }

      http.response.http_version = `${info.versionMajor}.${info.versionMinor}`;
      http.response.status_code = info.statusCode;

      if (http.response.status_code === 101 && http.response.headers.Upgrade === 'WebSocket') {
        if (http.response.headers['Sec-WebSocket-Location']) {
          self.setup_websocket_tracking(session, 'draft76');
        } else {
          self.setup_websocket_tracking(session);
        }
        self.emit('websocket upgrade', session, http);
        session.http_detect = false;
        session.websocket_detect = true;
        delete http.response_parser.onMessageComplete;
      } else {
        self.emit('http response', session, http);
      }
    };

    http.response_parser.onBody = function (buf, start, len) {
      http.response.body_len += len;
      self.emit('http response body', session, http, buf.slice(start, start + len));
    };

    http.response_parser.onMessageComplete = function () {
      self.emit('http response complete', session, http);
    };
  };

  session.http = http;
};

TCPTracker.prototype.setupWebsocketTracking = function (session, flag) {
  let self = this;

  session.websocket_parser_send = new WebSocketParser();
  session.websocket_parser_send.on('message',
      function (messageString) {
        self.emit('websocket message', session, 'send', messageString);
      });
  session.websocket_parser_recv = new WebSocketParser(flag);
  session.websocket_parser_recv.on('message',
      function (messageString) {
        self.emit('websocket message', session, 'recv', messageString);
      });
};

TCPTracker.prototype.trackStates = {};

TCPTracker.prototype.trackStates.SYN_SENT = function (packet, session) {
  const ip = packet.link.ip;
  const tcp = ip.tcp;
  const src = `${ip.saddr}:${tcp.sport}`;

  if (src === session.dst && tcp.flags.syn && tcp.flags.ack) {
    session.recv_bytes_ip += ip.header_bytes;
    session.recv_bytes_tcp += tcp.header_bytes;
    session.recv_packets[tcp.seqno + 1] = packet.Decoder_header.time_ms;
    session.recv_acks[tcp.ackno] = packet.Decoder_header.time_ms;
    session.recv_isn = tcp.seqno;
    session.recv_window_scale = tcp.options.window_scale || 1;
    // multiplier, not bit shift value
    session.state = 'SYN_RCVD';
  } else if (tcp.flags.rst) {
    session.state = 'CLOSED';
    delete this.sessions[session.key];
    this.emit('reset', session, 'recv');
    // TODO - check which direction did the reset, probably recv
  } else {
    //        console.log("Didn't get SYN-ACK packet from dst while handshaking: " + util.inspect(tcp, false, 4));
  }
};

TCPTracker.prototype.trackStates.SYN_RCVD = function (packet, session) {
  const ip = packet.link.ip;
  const tcp = ip.tcp;
  const src = `${ip.saddr}:${tcp.sport}`;

  if (src === session.src && tcp.flags.ack) {
    // TODO - make sure SYN flag isn't set, also match src and dst
    session.send_bytes_ip += ip.header_bytes;
    session.send_bytes_tcp += tcp.header_bytes;
    session.send_acks[tcp.ackno] = packet.Decoder_header.time_ms;
    session.handshake_time = packet.Decoder_header.time_ms;
    this.emit('start', session);
    session.state = 'ESTAB';
  } else {
    //        console.log("Didn't get ACK packet from src while handshaking: " + util.inspect(tcp, false, 4));
  }
};

TCPTracker.prototype.trackStates.ESTAB = function (packet, session) {
  const ip = packet.link.ip;
  const tcp = ip.tcp;
  const src = `${ip.saddr}:${tcp.sport}`;

  // TODO - actually implement SACK decoding and tracking
  // if (tcp.options.sack) {
  //     console.log("SACK magic, handle this: " + util.inspect(tcp.options.sack));
  //     console.log(util.inspect(ip, false, 5));
  // }
  // TODO - check for tcp.flags.rst and emit reset event
  if (src === session.src) {
    // this packet came from the active opener / client
    session.send_bytes_ip += ip.header_bytes;
    session.send_bytes_tcp += tcp.header_bytes;
    if (tcp.data_bytes) {
      if (session.send_bytes_payload === 0) {
        session.http_detect = this.detect_http_request(tcp.data);
        if (session.http_detect) {
          this.setup_http_tracking(session);
        }
      }
      session.send_bytes_payload += tcp.data_bytes;
      if (session.send_packets[tcp.seqno + tcp.data_bytes]) {
        this.emit('retransmit', session, 'send', tcp.seqno + tcp.data_bytes);
      } else {
        if (session.http_detect) {
          try {
            session.http.request_parser.execute(tcp.data, 0, tcp.data.length);
          } catch (requestErr) {
            this.emit('http error', session, 'send', requestErr);
          }
        } else if (session.websocket_detect) {
          session.websocket_parser_send.execute(tcp.data);
          // TODO - check for WS parser errors
        }
      }
      session.send_packets[tcp.seqno + tcp.data_bytes] = packet.Decoder_header.time_ms;
    }
    if (session.recv_packets[tcp.ackno]) {
      if (session.send_acks[tcp.ackno]) {
        // console.log("Already sent this ACK, which perhaps is fine.");
      } else {
        session.send_acks[tcp.ackno] = packet.Decoder_header.time_ms;
      }
    } else {
      // console.log("sending ACK for packet we didn't see received: " + tcp.ackno);
    }
    if (tcp.flags.fin) {
      session.state = 'FIN_WAIT';
    }
  } else if (src === session.dst) {
    // this packet came from the passive opener / server
    session.recv_bytes_ip += ip.header_bytes;
    session.recv_bytes_tcp += tcp.header_bytes;
    if (tcp.data_bytes) {
      session.recv_bytes_payload += tcp.data_bytes;
      if (session.recv_packets[tcp.seqno + tcp.data_bytes]) {
        this.emit('retransmit', session, 'recv', tcp.seqno + tcp.data_bytes);
        if (session.recv_retrans[tcp.seqno + tcp.data_bytes]) {
          session.recv_retrans[tcp.seqno + tcp.data_bytes] += 1;
        } else {
          session.recv_retrans[tcp.seqno + tcp.data_bytes] = 1;
        }
      } else {
        if (session.http_detect) {
          try {
            session.http.response_parser.execute(tcp.data, 0, tcp.data.length);
          } catch (responseErr) {
            this.emit('http error', session, 'recv', responseErr);
          }
        } else if (session.websocket_detect) {
          session.websocket_parser_recv.execute(tcp.data);
          // TODO - check for WS parser errors
        }
      }
      session.recv_packets[tcp.seqno + tcp.data_bytes] = packet.Decoder_header.time_ms;
    }
    if (session.send_packets[tcp.ackno]) {
      if (session.recv_acks[tcp.ackno]) {
        //                    console.log("Already received this ACK, which I'm guessing is fine.");
      } else {
        session.recv_acks[tcp.ackno] = packet.Decoder_header.time_ms;
      }
    } else {
      // console.log("receiving ACK for packet we didn't see sent: " + tcp.ackno);
    }
    if (tcp.flags.fin) {
      session.state = 'CLOSE_WAIT';
    }
  } else {
    console.log('non-matching packet in session: ' + util.inspect(packet));
  }
};

TCPTracker.prototype.trackStates.FIN_WAIT = function (packet, session) {
  const ip = packet.link.ip;
  const tcp = ip.tcp;
  const src = `${ip.saddr}:${tcp.sport}`;

  // TODO - need to track half-closed data
  if (src === session.dst && tcp.flags.fin) {
    session.state = 'CLOSING';
  }
};

TCPTracker.prototype.trackStates.CLOSE_WAIT = function (packet, session) {
  const ip = packet.link.ip;
  const tcp = ip.tcp;
  const src = `${ip.saddr}:${tcp.sport}`;

  // TODO - need to track half-closed data
  if (src === session.src && tcp.flags.fin) {
    session.state = 'LAST_ACK';
  }
};

TCPTracker.prototype.trackStates.LAST_ACK = function (packet, session) {
  const ip = packet.link.ip;
  const tcp = ip.tcp;
  const src = `${ip.saddr}:${tcp.sport}`;

  // TODO - need to track half-closed data
  if (src === session.dst) {
    session.close_time = packet.Decoder_header.time_ms;
    session.state = 'CLOSED';
    delete this.sessions[session.key];
    this.emit('end', session);
  }
};

TCPTracker.prototype.trackStates.CLOSING = function (packet, session) {
  const ip = packet.link.ip;
  const tcp = ip.tcp;
  const src = `${ip.saddr}:${tcp.sport}`;

  // TODO - need to track half-closed data
  if (src === session.src) {
    session.close_time = packet.Decoder_header.time_ms;
    session.state = 'CLOSED';
    delete this.sessions[session.key];
    this.emit('end', session);
  }
};

TCPTracker.prototype.trackStates.CLOSED = function (packet, session) {
  // const ip = packet.link.ip;
  // const tcp = ip.tcp;
  // const src = `${ip.saddr}:${tcp.sport}`;

  // The states aren't quite right here.  All possible states of FIN and FIN/ACKs aren't handled.
  // So some of the bytes of the session may not be properly accounted for.
};

TCPTracker.prototype.trackNext = function (key, packet) {
  const session = this.sessions[key];

  if (typeof session !== 'object') {
    throw new Error(`track_next: couldn't find session for ${key}`);
  }

  if (typeof this.track_states[session.state] === 'function') {
    this.track_states[session.state].call(this, packet, session);
  } else {
    console.log(util.debug(session));
    throw new Error(`Don't know how to handle session state ${session.state}`);
  }
};

TCPTracker.prototype.trackPacket = function (packet) {
  const self = this;

  if (packet.link && packet.link.ip && packet.link.ip.tcp) {
    const ip = packet.link.ip;
    const tcp = ip.tcp;
    const src = `${ip.saddr}:${tcp.sport}`;
    const dst = `${ip.daddr}:${tcp.dport}`;
    const key = this.make_session_key(src, dst);
    let session = this.sessions[key];

    if (tcp.flags.syn && !tcp.flags.ack) {
      if (session === undefined) {
        this.sessions[key] = {
          src: src,
          // the side the sent the initial SYN
          dst: dst,
          // the side that the initial SYN was sent to
          syn_time: packet.Decoder_header.time_ms,
          state: 'SYN_SENT',
          key: key,
          // so we can easily remove ourselves
          send_isn: tcp.seqno,
          send_window_scale: tcp.options.window_scale || 1,
          // multipler, not bit shift value
          send_packets: {},
          // send_packets is indexed by the expected ackno: seqno + length
          send_acks: {},
          send_retrans: {},
          send_next_seq: tcp.seqno + 1,
          send_acked_seq: null,
          send_bytes_ip: ip.header_bytes,
          send_bytes_tcp: tcp.header_bytes,
          send_bytes_payload: 0,

          recv_isn: null,
          recv_window_scale: null,
          recv_packets: {},
          recv_acks: {},
          recv_retrans: {},
          recv_next_seq: null,
          recv_acked_seq: null,
          recv_bytes_ip: 0,
          recv_bytes_tcp: 0,
          recv_bytes_payload: 0
        };
        session = this.sessions[key];
        session.send_packets[tcp.seqno + 1] = packet.Decoder_header.time_ms;
        session.src_name = dnsCache.ptr(ip.saddr,
            function (name) {
              session.src_name = `${name}:${tcp.sport}`;
              self.emit('reverse', ip.saddr, name);
            }) + ':' + tcp.sport;
        session.dst_name = dnsCache.ptr(ip.daddr, function (name) {
          session.dst_name = `${name}:${tcp.dport}`;
          self.emit('reverse', ip.daddr, name);
        }) + ':' + tcp.dport;
        session.current_cap_time = packet.Decoder_header.time_ms;
      } else {
        // SYN retry
        this.emit('syn retry', session);
      }
    } else {
      // not a SYN
      if (session) {
        session.current_cap_time = packet.Decoder_header.time_ms;
        this.track_next(key, packet);
      } else {
        // silently ignore session in progress
        // TODO - for sessions in progress, we should pretend that this is the first packet from
        //        the sender, go into ESTAB, and run HTTP detector.  That way we might see HTTP
        //        requests on keepalive connections
      }
    }
  } else {
    // silently ignore any non IPv4 TCP packets
    // user should filter these out with their Decoder filter, but oh well.
  }
};

