require('async-to-gen/register');
const SegfaultHandler = require('segfault-handler');
const NodeFlowServer = require('./nodeflow-server.js');
const ConfServer = require('./conf-server.js');
// Must be the last module loaded
const mod = require('./modules.js');

SegfaultHandler.registerHandler('crash.log');

const nfs = new NodeFlowServer();
const confServer = new ConfServer({ mod });

process.on('SIGINT', () => {
  console.log('Caught interrupt signal');
  mod.doCleanup();
  process.exit();
});

// nfs.start('0.0.0.0', '6653');
nfs.start('0.0.0.0', '6633');
confServer.start('/tmp/app.ofjs');
