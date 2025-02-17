import { LevelDatastore } from 'datastore-level'
import { DatabaseOptions, Level } from 'level'
import { KeyQuery } from 'interface-datastore'
import { MemoryDatastore } from 'datastore-core'

import { QuietLogger } from '@quiet/logger'

import { Libp2pDatastoreOptions, Libp2pDatastorePrefix } from './libp2p.types'
import { createLogger } from '../common/logger'

export class Libp2pDatastore {
  private inMemory: boolean
  private datastorePath: string | undefined
  private datastore: LevelDatastore | MemoryDatastore | undefined

  private logger: QuietLogger = createLogger('libp2p:datastore')

  constructor(options: Libp2pDatastoreOptions) {
    this.inMemory = options.inMemory
    this.datastorePath = options.datastorePath
  }

  public init(): LevelDatastore | MemoryDatastore {
    this.logger.info(`Initializing Libp2pDatastore using an ${this.inMemory ? 'in-memory' : 'level'} datastore`)
    if (this.datastore != null) {
      this.logger.warn(`Libp2pDatastore already initialized, returning existing datastore instance.`)
      return this.datastore
    }

    if (this.inMemory) {
      this.datastore = new MemoryDatastore()
      return this.datastore
    }

    const datastoreInit: DatabaseOptions<string, Uint8Array> = {
      keyEncoding: 'utf8',
      valueEncoding: 'buffer',
      createIfMissing: true,
      errorIfExists: false,
      version: 1,
    }

    if (this.datastorePath == null) {
      throw new Error(`Must provide a datastorePath if using LevelDatastore`)
    }

    const datastoreLevelDb = new Level<string, Uint8Array>(this.datastorePath, datastoreInit)
    this.datastore = new LevelDatastore(datastoreLevelDb, datastoreInit)
    return this.datastore
  }

  public getDatastoreInstance(): LevelDatastore | MemoryDatastore | undefined {
    return this.datastore
  }

  public async deleteKeysByPrefix(prefix: string): Promise<string[]> {
    this.logger.info(`Deleting keys from libp2p datastore with prefix ${prefix}`)
    if (this.datastore == null) {
      this.logger.warn(`Datastore was undefined, skipping!`)
      return []
    }

    if (this.inMemory) {
      return this._deleteKeysByPrefixInMemory(prefix)
    }
    return this._deleteKeysByPrefixLevel({
      prefix: prefix === Libp2pDatastorePrefix.ALL ? undefined : prefix,
    })
  }

  public async close() {
    if (!this.inMemory) {
      try {
        await (this.datastore as LevelDatastore).close()
        await (this.datastore as LevelDatastore).db.close()
      } catch (e) {
        this.logger.warn(`Error while closing libp2p datastore`, e)
      }
    }
  }

  public async clean() {
    await this.deleteKeysByPrefix(Libp2pDatastorePrefix.ALL)
  }

  private async _deleteKeysByPrefixInMemory(prefix: string): Promise<string[]> {
    const deletedKeys: string[] = []
    for await (const key of (this.datastore as MemoryDatastore)._allKeys()) {
      if (prefix === Libp2pDatastorePrefix.ALL || key.list()[0] === prefix) {
        this.logger.info(`Found matching key ${key.toString()}`)
        await this.datastore?.delete(key)
        deletedKeys.push(key.toString())
      }
    }

    this.logger.info(`Deleted ${deletedKeys.length} keys from in-memory datastore`)
    return deletedKeys
  }

  private async _deleteKeysByPrefixLevel(query: KeyQuery): Promise<string[]> {
    const deletedKeys: string[] = []
    for await (const key of (this.datastore as LevelDatastore).queryKeys(query)) {
      this.logger.info(`Found matching key ${key.toString()}`)
      await this.datastore?.delete(key)
      deletedKeys.push(key.toString())
    }

    this.logger.info(`Deleted ${deletedKeys.length} keys from level datastore`)
    return deletedKeys
  }
}
