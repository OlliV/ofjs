const AsyncEventEmitter = require('async-eventemitter');

/*
 * callback (data, next)
 * next() to pass
 * next(<obj>) to mangle
 * next('R') to reject
 */
module.exports = class Chain {
  constructor () {
    this.chain = new AsyncEventEmitter();
  }

  instertFirst (callback) {
    this.chain.first('chain', callback);
  }

  insertBefore (target, callback) {
    this.chain.before('chain', target, callback);
  }

  insertAfter (target, callback) {
    this.chain.after('chain', target, callback);
  }

  delete (callback) {
    this.chain.removeListener('chain', callback);
  }

  process (data) {
    const chain = this.chain;

    return new Promise((resolve, reject) => {
      chain.emit('chain', data, (out) => resolve(out || data));
    });
  }
};
