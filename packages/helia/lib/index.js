import { bitswap } from '@helia/block-brokers';
import { libp2pRouting } from '@helia/routers';
import { HeliaP2P } from './helia-p2p.js';
export * from '@helia/interface';
export async function createHelia(init = {}) {
    const { datastore, blockstore, libp2p } = init;
    if (!isLibp2p(libp2p)) {
        throw new Error(`Must provide a libp2p instance!`);
    }
    if (datastore == null || blockstore == null) {
        throw new Error(`Must provide a valid datastore AND blockstore!`);
    }
    const helia = new HeliaP2P({
        ...init,
        libp2p,
        datastore,
        blockstore,
        blockBrokers: init.blockBrokers ?? [bitswap()],
        routers: [libp2pRouting(libp2p)],
    });
    if (init.start !== false) {
        await helia.start();
    }
    return helia;
}
function isLibp2p(obj) {
    if (obj == null) {
        return false;
    }
    const funcs = ['dial', 'dialProtocol', 'hangUp', 'handle', 'unhandle', 'getMultiaddrs', 'getProtocols'];
    return funcs.every(m => typeof obj[m] === 'function');
}
