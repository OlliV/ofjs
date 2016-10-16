exports.init = function init () {
  console.log('Hello from demo module');
};

exports.deinit = function deinit () {
  console.log('Unloadig demo module');
};

exports.cleanup = function cleanup () {
  console.log('clean');
};
