const dpEventEmitter = require('../lib/flow-server.js').dpee;
const L2Bridge = require('../lib/l2bridge.js');

let l2bridge;

dpEventEmitter.once('INIT', (dp) => {
  l2bridge = new L2Bridge(dp.serve, dp.dpid);
});
