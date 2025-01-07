import type { Helia } from '@helia/interface';
import type { HeliaInit as HeliaClassInit } from '@helia/utils';
import type { Libp2p, ServiceMap } from '@libp2p/interface';
import type { KeychainInit } from '@libp2p/keychain';
import type { Libp2pOptions } from 'libp2p';
import type { CID } from 'multiformats/cid';
export * from '@helia/interface';
export interface DAGWalker {
    codec: number;
    walk(block: Uint8Array): Generator<CID, void, undefined>;
}
export interface HeliaInit<T extends Libp2p = Libp2p> extends HeliaClassInit {
    libp2p?: T | Omit<Libp2pOptions<any>, 'start'>;
    start?: boolean;
    keychain?: KeychainInit;
}
export interface HeliaLibp2p<T extends Libp2p = Libp2p<ServiceMap>> extends Helia {
    libp2p: T;
}
export declare function createHelia<T extends Libp2p>(init: Partial<HeliaInit<T>>): Promise<HeliaLibp2p<T>>;
export declare function createHelia(init?: Partial<HeliaInit<Libp2p<ServiceMap>>>): Promise<HeliaLibp2p<Libp2p<ServiceMap>>>;
