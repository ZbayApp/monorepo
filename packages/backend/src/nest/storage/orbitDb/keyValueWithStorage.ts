import { AccessControllerType, KeyValue, IdentitiesType, LogType, LogEntry } from '@orbitdb/core'
import { type Helia } from 'helia'
import { createLogger } from '../../common/logger'
import { OrbitDbService } from './orbitDb.service'

const logger = createLogger('orbitdb:keyValueWithStorage')

export const KeyValueWithStorage =
  (pinIpfs = true) =>
  async ({
    ipfs,
    identity,
    address,
    name,
    access,
    directory,
    meta,
    referencesCount,
    syncAutomatically,
    onUpdate,
  }: {
    ipfs: Helia
    identity: IdentitiesType
    address: string
    name: string
    access: AccessControllerType
    directory: string
    meta: Record<string, any>
    referencesCount: number
    syncAutomatically: boolean
    onUpdate: (log: LogType, entry: LogEntry) => Promise<void>
  }) => {
    logger.info(`Initializing KeyValue OrbitDB database using custom storage`)

    const { entryStorage, indexStorage, headsStorage } = await OrbitDbService.createDefaultStorage(
      directory,
      address,
      ipfs,
      pinIpfs
    )

    // Set up the underlying KeyValue database
    const db = await KeyValue()({
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
      events: OrbitDbService.events,
    })

    db.events.on('error', error => {
      logger.error(`Error on OrbitDB DB ${db.address}`, error)
    })

    const get = async (hash: string): Promise<unknown> => {
      try {
        return db.get(hash)
      } catch (e) {
        db.events.emit('error', e)
        return undefined
      }
    }

    const ogAll = db.all
    const all = async (): Promise<
      {
        key: string
        value: unknown
        hash: string
      }[]
    > => {
      try {
        return await ogAll()
      } catch (e) {
        db.events.emit('error', e)
        return []
      }
    }

    return {
      ...db,
      get,
      all,
    }
  }

KeyValueWithStorage.type = 'keyvalue'
