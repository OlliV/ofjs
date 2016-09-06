import SegfaultHandler from 'segfault-handler';
import NodeFlowServer from './nodeflow-server.js';

SegfaultHandler.registerHandler("crash.log");

var nfs = new NodeFlowServer();

// nfs.start('0.0.0.0', '6653');
nfs.start('0.0.0.0', '6633');
