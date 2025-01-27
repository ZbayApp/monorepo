import { AccessControllerType, IdentitiesType, LogEntry, Events, LogType } from '@orbitdb/core'
import { type Helia } from 'helia'
import { createLogger } from '../../common/logger'
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
    return await Events()({
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
  }

EventsWithStorage.type = 'events'
