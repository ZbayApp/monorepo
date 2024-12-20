import type { Helia } from '@helia/interface';
import type { BlockBroker } from '@helia/interface/blocks';
import type { ComponentLogger, Libp2p, ServiceMap } from '@libp2p/interface';
import type { KeychainInit } from '@libp2p/keychain';
import type { Blockstore } from 'interface-blockstore';
import type { Datastore } from 'interface-datastore';
import type { CID } from 'multiformats/cid';
import type { MultihashHasher } from 'multiformats/hashes/interface';
export * from '@helia/interface';
export interface DAGWalker {
    codec: number;
    walk(block: Uint8Array): Generator<CID, void, undefined>;
}
export interface HeliaInit<T extends Libp2p = Libp2p> {
    libp2p?: T;
    blockstore?: Blockstore;
    datastore?: Datastore;
    hashers?: MultihashHasher[];
    dagWalkers?: DAGWalker[];
    blockBrokers?: Array<(components: any) => BlockBroker>;
    start?: boolean;
    holdGcLock?: boolean;
    logger?: ComponentLogger;
    keychain?: KeychainInit;
}
export interface HeliaLibp2p<T extends Libp2p = Libp2p<ServiceMap>> extends Helia {
    libp2p: T;
}
export declare function createHelia<T extends Libp2p>(init: HeliaInit<T>): Promise<HeliaLibp2p<T>>;
export declare function createHelia(init?: HeliaInit<Libp2p<any>>): Promise<HeliaLibp2p<Libp2p<ServiceMap>>>;
