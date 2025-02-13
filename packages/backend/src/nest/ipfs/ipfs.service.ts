import { Inject, Injectable } from '@nestjs/common'
import { createHelia, type Helia } from 'helia'
import { bitswap } from '@helia/block-brokers'
import { IPFS_REPO_PATCH } from '../const'
import { createLogger } from '../common/logger'
import { LevelDatastore } from 'datastore-level'
import { LevelBlockstore, LevelBlockstoreInit } from 'blockstore-level'
import { Libp2pService } from '../libp2p/libp2p.service'
import { DatabaseOptions, Level } from 'level'
import { BITSWAP_PROTOCOL } from '../libp2p/libp2p.const'

type StoreInit = {
  blockstore?: Omit<LevelBlockstoreInit, 'valueEncoding' | 'keyEncoding'>
  datastore?: Omit<DatabaseOptions<string, Uint8Array>, 'valueEncoding' | 'keyEncoding'>
}

type Blockstore = {
  store: LevelBlockstore
  db: Level<string, Uint8Array>
}

type Datastore = {
  store: LevelDatastore
  db: Level<string, Uint8Array>
}

@Injectable()
export class IpfsService {
  public ipfsInstance: Helia | null
  private blockstore: Blockstore | null
  private datastore: Datastore | null

  private started: boolean
  private readonly logger = createLogger(IpfsService.name)

  constructor(
    @Inject(IPFS_REPO_PATCH) public readonly ipfsRepoPath: string,
    private readonly libp2pService: Libp2pService
  ) {
    this.started = false
  }

  public async createInstance(): Promise<Helia> {
    const libp2pInstance = this.libp2pService?.libp2pInstance

    let ipfs: Helia
    try {
      if (!libp2pInstance) {
        this.logger.error('Libp2p instance required')
        throw new Error('Libp2p instance required')
      }

      this.logger.info(`Initializing Helia datastore and blockstore`)
      await this.initializeStores()

      this.logger.info(`Creating Helia instance`)
      const bitstwapInstance = bitswap({
        incomingStreamTimeout: 60_000,
        sendBlocksTimeout: 30_000,
        sendBlocksDebounce: 10,
        // @ts-expect-error This is part of the config interface but it isn't typed that way
        messageReceiveTimeout: 30_000,
        protocol: BITSWAP_PROTOCOL,
        maxInboundStreams: 512,
        maxOutboundStreams: 512,
        sendBlocksConcurrency: 10,
      })
      ipfs = await createHelia({
        start: false,
        libp2p: libp2pInstance,
        blockstore: this.blockstore!.store,
        datastore: this.datastore!.store,
        blockBrokers: [bitstwapInstance],
      })
      this.ipfsInstance = ipfs
    } catch (error) {
      this.logger.error('IPFS creation failed', error)
      throw new Error('IPFS creation failed')
    }

    return this.ipfsInstance
  }

  private async initializeStores(init?: StoreInit): Promise<void> {
    this.datastore = await this.createDatastore(init?.datastore)
    this.blockstore = await this.createBlockstore(init?.blockstore)
  }

  private async createDatastore(init?: DatabaseOptions<string, Uint8Array>): Promise<Datastore> {
    let datastoreInit: DatabaseOptions<string, Uint8Array> = {
      keyEncoding: 'utf8',
      valueEncoding: 'buffer',
    }

    if (init != null) {
      datastoreInit = {
        ...datastoreInit,
        ...init,
      }
    }

    if (datastoreInit.valueEncoding != 'buffer') {
      throw new Error(`Datastore valueEncoding was set to ${datastoreInit.valueEncoding} but MUST be set to 'buffer'!`)
    }

    if (datastoreInit.keyEncoding != 'utf8') {
      throw new Error(`Datastore keyEncoding was set to ${datastoreInit.keyEncoding} but MUST be set to 'utf8'!`)
    }

    const datastoreLevelDb = new Level<string, Uint8Array>(this.ipfsRepoPath + '/data', datastoreInit)
    return {
      db: datastoreLevelDb,
      store: new LevelDatastore(datastoreLevelDb, datastoreInit),
    }
  }

  private async createBlockstore(init?: LevelBlockstoreInit): Promise<Blockstore> {
    let blockstoreInit: LevelBlockstoreInit = {
      keyEncoding: 'utf8',
      valueEncoding: 'buffer',
      createIfMissing: true,
      errorIfExists: false,
      version: 1,
    }

    if (init != null) {
      blockstoreInit = {
        ...blockstoreInit,
        ...init,
      }
    }

    if (blockstoreInit.valueEncoding != 'buffer') {
      throw new Error(
        `Blockstore valueEncoding was set to ${blockstoreInit.valueEncoding} but MUST be set to 'buffer'!`
      )
    }

    if (blockstoreInit.keyEncoding != 'utf8') {
      throw new Error(`Blockstore keyEncoding was set to ${blockstoreInit.keyEncoding} but MUST be set to 'utf8'!`)
    }

    const blockstoreLevelDb = new Level<string, Uint8Array>(this.ipfsRepoPath + '/blocks', blockstoreInit)
    return {
      db: blockstoreLevelDb,
      store: new LevelBlockstore(blockstoreLevelDb, blockstoreInit),
    }
  }

  public async start() {
    this.logger.info(`Starting IPFS Service`)
    if (!this.ipfsInstance) {
      throw new Error('IPFS instance does not exist')
    }

    this.logger.info(`Opening Helia blockstore`)
    await this.blockstore!.db.open()
    await this.blockstore!.store.open()

    this.logger.info(`Opening Helia datastore`)
    await this.datastore!.db.open()
    await this.datastore!.store.open()

    this.logger.info(`Starting Helia`)
    await this.ipfsInstance.start()

    this.started = true
    this.logger.info(`IPFS Service has started`)
  }

  public async isStarted() {
    return this.started
  }

  public async stop() {
    this.logger.info('Stopping IPFS')
    if (!this.ipfsInstance) {
      throw new Error('IPFS instance does not exist')
    }

    try {
      await this.ipfsInstance?.stop()
    } catch (e) {
      if (!(e as Error).message.includes('Database is not open')) {
        this.logger.error(`Error while closing IPFS instance`, e)
        throw e
      }
    }

    try {
      await this.blockstore?.db.close()
      await this.blockstore?.store.close()
    } catch (e) {
      if (!(e as Error).message.includes('Database is not open')) {
        this.logger.error(`Error while closing IPFS blockstore`, e)
        throw e
      }
    }

    try {
      await this.datastore?.db.close()
      await this.datastore?.store.close()
    } catch (e) {
      if (!(e as Error).message.includes('Database is not open')) {
        this.logger.error(`Error while closing IPFS datastore`, e)
        throw e
      }
    }
    this.started = false
  }

  public async destoryInstance() {
    try {
      await this.stop()
    } catch (error) {
      this.logger.error('Error while destroying IPFS instance', error)
    }
    this.ipfsInstance = null
    this.blockstore = null
    this.datastore = null
  }
}
