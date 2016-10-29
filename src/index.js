const SegfaultHandler = require('segfault-handler');
const FlowServer = require('../lib/flow-server.js').default;
const ConfServer = require('./conf-server.js');
// Must be the last module loaded
const mod = require('./modules.js');

SegfaultHandler.registerHandler('crash.log');

const server = new FlowServer();
const confServer = new ConfServer({ mod });

process.on('SIGINT', () => {
  console.log('Caught interrupt signal');
  mod.doCleanup();
  process.exit();
});

mod.loadModule('../ofjs_modules/default.js');

Promise.all([
  server.start('0.0.0.0', '6633'),
  confServer.start('/tmp/app.ofjs'),
])
.then(() => console.log('ofjs ready'))
.catch((err) => console.error(err));
