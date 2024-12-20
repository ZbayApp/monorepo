import { ComposedStorage, LevelStorage, LRUStorage, Storage, KeyStore } from '@orbitdb/core'

const defaultPath = './keystore'

const KeystoreWithStorage = async ({ path }: { storage?: Storage; path?: string } = {}) => {
  path = path || defaultPath

  const storage = await ComposedStorage(
    await LRUStorage({ size: 1000 }),
    await LevelStorage({ path, valueEncoding: 'buffer' })
  )

  return KeyStore({ path, storage })
}

export { KeystoreWithStorage }
