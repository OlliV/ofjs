const ipc = require('node-ipc');
let mod;

ipc.config.id = 'ofjs';
ipc.config.retry = 1500;

module.exports = class ConfServer {
  constructor (opts) {
    mod = opts.mod;
  }

  start (path) {
    ipc.serve(path, () => {
      ipc.server.on('message', (data, socket) => {
        ipc.log('got a message : '.debug, data);
        const ret = this.parseMessage(data);
        ipc.server.emit(socket, 'message', ret);
      });

      ipc.server.on('socket.disconnected', (socket, destroyedSocketID) => {
        ipc.log(`client ${destroyedSocketID} has disconnected!`);
      });
    });

    ipc.server.start();
  }

  parseMessage (msg) {
    switch (msg.cmd) {
    case 'load':
      if (typeof msg.module !== 'string') return { status: 'FAIL', type: 'invalid_msg' };
      try {
        mod.loadModule('../ofjs_modules/' + msg.module);
      } catch (err) {
        console.error(err);
        return { status: 'FAIL', type: 'load_fail' };
      }
      break;
    default:
      return { status: 'FAIL', type: 'invalid_cmd' };
    }
    return { status: 'OK' };
  }
};
