const ignore = new Set(require('node-core-module-names').concat(Object.keys(require.cache)));
const ignorePath = /(^.*node_modules)/.exec(require.resolve('node-core-module-names'))[0];

exports.loadModule = function loadModule (modulePath) {
  const mod = require(modulePath);
  mod.init();
  return require.resolve(modulePath);
};

exports.unloadModule = function unloadModule (moduleName) {
  const key = require.resolve(moduleName);
  const nodeModule = require.cache[key];

  if (nodeModule && !(key.startsWith(ignorePath) || ignore.has(key))) {
    console.log(`Unloading ${moduleName}`);

    const deinit = nodeModule.exports.deinit;
    if (deinit) deinit();

    for (let i in nodeModule.children) {
      const child = nodeModule.children[i];
      unloadModule(child.filename);
    }
    delete require.cache[key];
  }
};

exports.doCleanup = function doCleanup () {
  for (let i in require.cache) {
    const id = require.cache[i].id;
    const cleanup = require.cache[i].exports.cleanup;

    if (cleanup && !(id.startsWith(ignorePath) || ignore.has(id))) cleanup();
  }
};
