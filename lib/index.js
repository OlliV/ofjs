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

Promise.all([
  nfs.start('0.0.0.0', '6633'),
  confServer.start('/tmp/app.ofjs'),
])
.then(() => console.log('ofjs ready'))
.catch((err) => console.error(err));
