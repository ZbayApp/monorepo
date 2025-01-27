// Forked from https://github.com/reseau-constellation/orbit-db-types/blob/main/index.d.ts

declare module '@orbitdb/core' {
  import EventEmitter from 'events'
  import type { Helia } from 'helia'

  //
  // OrbitDB
  //

  export function OrbitDB({
    ipfs,
    id,
    identity,
    identities,
    directory,
  }: {
    ipfs: Helia
    id: string
    identity: Identity
    identities: Identities
    directory: string
  }): Promise<OrbitDBType>

  export interface OrbitDBType {
    id: string
    open: <T>(address: string, options?: OrbitDBOpenOptions) => Promise<T>
    stop
    ipfs
    directory
    keystore
    identity: Identity
    peerId
  }

  export interface OrbitDBOpenOptions {
    type?: string
    sync?: boolean
    Database?: Database
    AccessController?: AccessController
  }

  export function createOrbitDB(args: {
    ipfs: Helia
    id: string
    directory: string
    identities: IdentitiesType
  }): Promise<OrbitDBType>

  export function isValidAddress(address: unknown): boolean

  //
  // AccessController
  //

  export function AccessController({
    orbitdb,
    identities,
    address,
    name,
  }: {
    orbitdb: OrbitDBType
    identities: IdentitiesType
    address?: string
    name?: string
  }): Promise<AccessControllerType>

  export interface AccessControllerType {
    type: string
    address: string
    write: string[]
    canAppend: (entry: LogEntry) => Promise<boolean>
  }

  export function IPFSAccessController(args: { write?: string[]; storage?: Storage }): AccessController

  export function useAccessController(accessController: { type: string }): void

  //
  // Identity
  //

  export interface IdentitiesInit {
    keystore?: KeyStoreType
    path?: string
    storage?: Storage
    ipfs?: Helia
  }

  export function Identities(args: IdentitiesInit): Promise<IdentitiesType>

  export interface IdentitiesType {
    createIdentity
    getIdentity
    verifyIdentity: (identity: Identity) => Promise<boolean>
    sign
    verify
    keystore
  }

  export interface Identity {
    id: string
    publicKey: string
    signatures: {
      id: string
      publicKey: string
    }
    type: string
    sign: (identity: Identity, data: string) => Promise<string>
    verify: (signature: string, publicKey: string, data: string) => Promise<boolean>
  }

  export interface IdentityProvider {
    type: string
    verifyIdentity: (identity: Identity) => Promise<boolean>
  }

  //
  // Storage
  //

  export interface Storage {
    put: any
    get: any
    close: any
    clear: any
  }

  export interface IPFSBlockStorageInit {
    ipfs: Helia
    pin?: boolean
    timeout?: number
  }

  export function IPFSBlockStorage(init: IPFSBlockStorageInit): Promise<Storage>

  export function LRUStorage({ size: number }): Promise<Storage>

  export function ComposedStorage(...args: Storage[]): Promise<Storage>

  export function MemoryStorage(): Promise<Storage>

  export function LevelStorage({
    path,
    valueEncoding,
  }: {
    path?: string
    valueEncoding?: string
  }): Promise<LevelStorageType>

  export interface LevelStorageType {
    put: (hash: string, value: any) => Promise<void>
    del: (hash: string) => Promise<void>
    get: (hash: string) => Promise<any | undefined>
    iterator: ({ amount, reverse }: { amount?: number; reverse: boolean }) => Generator<[string, any]>
    close: () => Promise<void>
    clear: () => Promise<void>
  }

  //
  // Log
  //

  export function Log(
    identity: IdentitiesType,
    options: {
      logId?: string
      logHeads?: LogEntry[]
      access?: AccessControllerType
      entryStorage?: Storage
      headsStorage?: Storage
      indexStorage?: Storage
      sortFn?: (...args: any[]) => any
    } = {}
  ): Promise<LogType>

  export interface LogType {
    id: string
    clock: Clock
    heads: () => Promise<LogEntry[]>
    values: () => Promise<LogEntry[]>
    get: (hash: string) => Promise<LogEntry>
    has: (hash: string) => Promise<boolean>
    append: (
      data: any,
      options: {
        referencesCount: number
      } = { referencesCount: 0 }
    ) => Promise<LogEntry | void>
    join: (log: LogType) => Promise<void>
    joinEntry: (entry: LogEntry) => Promise<boolean>
    traverse: (
      rootEntries: LogEntry[] | null,
      shouldStopFn: (entry: LogEntry) => Promise<boolean>
    ) => AsyncGenerator<LogEntry, void, unknown>
    iterator: (
      options: {
        amount: number
        gt: string
        gte: string
        lt: string
        lte: string
      } = {}
    ) => AsyncGenerator<LogEntry, void, unknown>
    clear: () => Promise<void>
    close: () => Promise<void>
    access: AccessControllerType
    identity: Identity
    storage: Storage
  }

  declare interface EntryType {
    create: <T>(
      identity: Identity,
      id: string,
      payload: { op: string; key: string | null; value: T | null },
      clock?: Clock,
      next?: string[],
      refs?: string[]
    ) => Promise<LogEntry<T>>
    verify: (identities: IdentitiesType, entry: LogEntry) => Promise<boolean>
    decode: (bytes: Uint8Array) => Promise<LogEntry>
    isEntry: (obj: object) => boolean
    isEqual: (a: LogEntry, b: LogEntry) => boolean
  }

  declare const Entry: EntryType

  export interface LogEntry<T = unknown> {
    id: string
    payload: { op: string; key: string | null; value: T | null }
    next: string[]
    refs: string[]
    clock: Clock
    v: number
    key: string
    identity: string
    sig: string
    hash: string
  }

  export interface Clock {
    id: string
    time: number
  }

  //
  // Database
  //

  export function useDatabaseType(type: { type: string }): void

  export function Database(args: {
    ipfs: Helia
    identity?: Identity
    address: string
    name?: string
    access?: AccessController
    directory?: string
    meta?: object
    headsStorage?: Storage
    entryStorage?: Storage
    indexStorage?: Storage
    referencesCount?: number
    syncAutomatically?: boolean
    onUpdate?: () => void
  }): Promise<DatabaseType>

  export interface DatabaseType {
    address: string
    name: string
    identity: Identity
    meta: Record<string, any>
    close(): Promise<void>
    drop(): Promise<void>
    addOperation: (args: { op: string; key: string | null; value: unknown }) => Promise<string>
    log: Log
    sync: Sync
    // peers: TODO
    events: EventEmitter
    access: AccessController
  }

  export interface Sync {
    // add: TODO
    stop(): Promise<void>
    start(): Promise<void>
    // events: TODO
    // peers: TODO
  }

  export function KeyValue(): ({
    ipfs,
    identity,
    address,
    name,
    access,
    directory,
    meta,
    headsStorage,
    entryStorage,
    indexStorage,
    referencesCount,
    syncAutomatically,
    onUpdate,
  }) => Promise<KeyValueType>

  export function Events(): ({
    ipfs,
    identity,
    address,
    name,
    access,
    directory,
    meta,
    headsStorage,
    entryStorage,
    indexStorage,
    referencesCount,
    syncAutomatically,
    onUpdate,
  }) => Promise<EventsType>

  export interface KeyValueType<T = unknown> extends DatabaseType {
    type: 'keyvalue'
    put(key: string, value: T): Promise<string>
    set: KeyValue['put']
    del(key: string): Promise<string>
    get(key: string): Promise<T | undefined>
    all(): Promise<{ key: string; value: T; hash: string }[]>
  }

  export interface EventsType<T = unknown> extends DatabaseType {
    type: 'events'
    add(value: T): Promise<string>
    get(hash: string): T
    iterator({
      gt,
      gte,
      lt,
      lte,
      amount,
    }: { gt: string; gte: string; lt: string; lte: string; amount: number } = {}): AyncGenerator<{
      hash: string
      value: T
    }>
    all(): Promise<{ hash: string; value: T }[]>
  }

  //
  // KeyStore
  //

  export function KeyStore(args: { storage?: Storage; path?: string }): Promise<KeyStoreType>

  export interface KeyStoreType {
    clear
    close
    hasKey
    addKey
    createKey
    getKey
    getPublic
  }
}
