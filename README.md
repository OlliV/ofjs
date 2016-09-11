OpenFlow Controller written in Node.js
======================================

Buid & Run
----------

    npm install
    npm run build
    npm start


Testing with Mininet
--------------------

    sudo mn --switch ovs --controller remote,ip=172.18.0.1,port=6633 --topo tree,depth=2,fanout=8 --test pingall
    sudo mn --switch ovs --controller remote,ip=172.18.0.1,port=6633 --test iperf

Profiling
---------

    node --stack-size=524288 --prof build/index.js
    node --prof-process isolate-0xXXXXX-v8.log > processed.txt
