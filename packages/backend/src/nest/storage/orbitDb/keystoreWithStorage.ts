import { ComposedStorage, LevelStorage, LRUStorage, Storage, KeyStore } from '@orbitdb/core'
import { createLogger } from '../../common/logger'
import { OrbitDbService } from './orbitDb.service'

const defaultPath = './keystore'

const logger = createLogger('orbitdb:keyStoreWithStorage')

const KeystoreWithStorage = async ({ path }: { storage?: Storage; path?: string } = {}) => {
  logger.info(`Initializing OrbitDB key store using custom storage`)

  path = path || defaultPath

  const storage = await ComposedStorage(
    await LRUStorage({ size: 1000 }),
    await LevelStorage({ path, valueEncoding: 'buffer' }),
    OrbitDbService.events
  )

  return KeyStore({ path, storage })
}

export { KeystoreWithStorage }
