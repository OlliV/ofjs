require('async-to-gen/register');
const SegfaultHandler = require('segfault-handler');
const NodeFlowServer = require('./nodeflow-server.js');

SegfaultHandler.registerHandler('crash.log');

const nfs = new NodeFlowServer();

// nfs.start('0.0.0.0', '6653');
nfs.start('0.0.0.0', '6633');
