module.exports = class L2Table {
  constructor () {
    this.table = new Map();
  }

  setPort (addr, port) {
    this.table.set(addr, port);
  }

  getPort (addr) {
    return this.table.get(addr);
  }

  delPort (dpid, addr) {
    this.table.delete(addr);
  }
}
