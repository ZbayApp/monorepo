import { ComposedStorage, Identities, IdentitiesType, IPFSBlockStorage, LRUStorage, MemoryStorage } from '@orbitdb/core'
import { Helia } from 'helia'
import { KeystoreWithStorage } from './keystoreWithStorage'
import { OrbitDbService } from './orbitDb.service'
import { posixJoin } from './util'

export const IdentitiesWithStorage = async (orbitDbDir: string, ipfs: Helia): Promise<IdentitiesType> => {
  const keystore = await KeystoreWithStorage({ path: posixJoin(orbitDbDir, './keystore') })
  const storage = await ComposedStorage(
    await LRUStorage({ size: 1000 }),
    await IPFSBlockStorage({ ipfs, pin: false }),
    OrbitDbService.events
  )

  return Identities({
    ipfs,
    keystore,
    storage,
  })
}
