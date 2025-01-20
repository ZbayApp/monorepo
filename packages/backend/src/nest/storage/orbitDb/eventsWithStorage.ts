import { AccessControllerType, IdentitiesType, LogEntry, Events, LogType } from '@orbitdb/core'
import { type Helia } from 'helia'
import { createLogger } from '../../common/logger'
import { abortableAsyncIterable } from '../../common/utils'
import { OrbitDbService } from './orbitDb.service'

const logger = createLogger('orbitdb:keyValueWrapper')

export const EventsWithStorage =
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
    logger.info(`Initializing Events OrbitDB database using custom storage`)

    const { entryStorage, indexStorage, headsStorage } = await OrbitDbService.createDefaultStorage(
      directory,
      address,
      ipfs,
      pinIpfs
    )

    // Set up the underlying Events database
    const db = await Events()({
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
    })

    db.events.on('error', error => {
      logger.error(`Error on OrbitDB DB ${db.address}`, error)
    })

    const iterator = async function* ({ gt, gte, lt, lte, amount }: any = {}) {
      const abortController = new AbortController()
      try {
        const it = abortableAsyncIterable(db.log.iterator({ gt, gte, lt, lte, amount }), abortController.signal)
        for await (const event of it) {
          const hash = event.hash
          const value = event.payload.value
          yield { hash, value }
        }
      } catch (e) {
        abortController.abort(e)
      }
    }

    return {
      ...db,
      iterator,
    }
  }

EventsWithStorage.type = 'events'
