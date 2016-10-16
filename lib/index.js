require('async-to-gen/register');
const SegfaultHandler = require('segfault-handler');
const NodeFlowServer = require('./nodeflow-server.js');
const mod = require('./modules.js');

SegfaultHandler.registerHandler('crash.log');

const nfs = new NodeFlowServer();
const demo = mod.loadModule('../ofjs_modules/demo.js');

process.on('SIGINT', function() {
  console.log("Caught interrupt signal");
  mod.doCleanup();
  mod.unloadModule(demo);
  process.exit();
});

// nfs.start('0.0.0.0', '6653');
nfs.start('0.0.0.0', '6633');
