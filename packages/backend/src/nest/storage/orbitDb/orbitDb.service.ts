import { Inject, Injectable } from '@nestjs/common'
import { ORBIT_DB_DIR } from '../../const'
import { createLogger } from '../../common/logger'
import { posixJoin } from './util'
import { type PeerId } from '@libp2p/interface'
import { MessagesAccessController } from './MessagesAccessController'
import {
  createOrbitDB,
  type OrbitDBType,
  type IdentitiesType,
  useAccessController as orbitDbUseAccessController, // this is to fix a linting issue about react hooks
  Identities,
  ComposedStorage,
  LRUStorage,
  IPFSBlockStorage,
  LevelStorage,
} from '@orbitdb/core'
import { HeliaLibp2p, type Helia } from 'helia'
import { OrbitDbStorage } from '../../types'
import { IdentitiesWithStorage } from './identitiesWithStorage'

@Injectable()
export class OrbitDbService {
  private orbitDbInstance: OrbitDBType | null = null
  public identities: IdentitiesType

  private readonly logger = createLogger(OrbitDbService.name)

  constructor(@Inject(ORBIT_DB_DIR) public readonly orbitDbDir: string) {}

  get orbitDb() {
    if (!this.orbitDbInstance) {
      this.logger.error('[get orbitDb]:no orbitDbInstance')
      throw new Error('[get orbitDb]:no orbitDbInstance')
    }
    return this.orbitDbInstance
  }

  public async create(peerId: PeerId, ipfs: Helia) {
    this.logger.info('Creating OrbitDB')
    if (this.orbitDbInstance) return

    orbitDbUseAccessController(MessagesAccessController)

    this.identities = await IdentitiesWithStorage(this.orbitDbDir, ipfs)

    const orbitDb = await createOrbitDB({
      ipfs,
      id: peerId.toString(),
      directory: this.orbitDbDir,
      identities: this.identities,
    })

    this.orbitDbInstance = orbitDb
  }

  public async stop() {
    if (this.orbitDbInstance) {
      this.logger.info('Stopping OrbitDB')
      try {
        await this.orbitDbInstance.stop()
      } catch (err) {
        this.logger.error(`Following error occured during closing orbitdb database`, err)
      }
    }

    this.orbitDbInstance = null
  }

  public static async createDefaultStorage(
    baseDirectory: string,
    address: string,
    ipfs: Helia | HeliaLibp2p,
    pinIpfs: boolean = true
  ): Promise<OrbitDbStorage> {
    const entryStorage = await ComposedStorage(
      await LRUStorage({ size: 1000 }),
      await IPFSBlockStorage({ ipfs, pin: pinIpfs })
    )

    const headsStorage = await ComposedStorage(
      await LRUStorage({ size: 1000 }),
      await LevelStorage({
        path: posixJoin(baseDirectory || './orbitdb', `./${address}/log/_heads/`),
        valueEncoding: 'buffer',
      })
    )

    const indexStorage = await ComposedStorage(
      await LRUStorage({ size: 1000 }),
      await LevelStorage({
        path: posixJoin(baseDirectory || './orbitdb', `./${address}/log/_index/`),
        valueEncoding: 'buffer',
      })
    )

    return {
      entryStorage,
      headsStorage,
      indexStorage,
    }
  }
}
