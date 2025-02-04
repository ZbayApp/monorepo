import { Helia, type HeliaInit } from '@helia/utils';
import type { BlockBroker } from './index.js';
import type { Libp2p } from '@libp2p/interface';
import type { Blockstore } from 'interface-blockstore';
import type { Datastore } from 'interface-datastore';
export interface HeliaP2PInit<T extends Libp2p = Libp2p> extends HeliaInit {
    libp2p: T;
    blockstore: Blockstore;
    datastore: Datastore;
    blockBrokers: Array<(components: any) => BlockBroker>;
}
export declare class HeliaP2P<T extends Libp2p> extends Helia {
    libp2p: T;
    constructor(init: HeliaP2PInit<T>);
    start(): Promise<void>;
    stop(): Promise<void>;
}
