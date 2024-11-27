import { Buffer } from 'buffer'
import { Inject, Injectable } from '@nestjs/common'
import { Level } from 'level'
import { type Community, type NetworkInfo, NetworkStats, Identity, IdentityUpdatePayload } from '@quiet/types'
import { createLibp2pAddress, filterAndSortPeers } from '@quiet/common'
import { LEVEL_DB } from '../const'
import { LocalDBKeys, LocalDbStatus } from './local-db.types'
import { createLogger } from '../common/logger'
import { SerializedSigChain, SigChainSaveData } from '../auth/types'
import { SigChain } from '../auth/sigchain'

@Injectable()
export class LocalDbService {
  peers: any
  private readonly logger = createLogger(LocalDbService.name)
  constructor(@Inject(LEVEL_DB) private readonly db: Level) {}

  public async close() {
    this.logger.info('Closing leveldb')
    await this.db.close()
  }

  public async open() {
    this.logger.info('Opening leveldb')
    await this.db.open()
  }

  public getStatus(): LocalDbStatus {
    return this.db.status
  }

  public async purge() {
    this.logger.info(`Purging db`)
    await this.db.clear()
  }

  public async get(key: string) {
    let data: any
    try {
      data = await this.db.get(key)
    } catch (e) {
      return null
    }
    return data
  }

  public async exists(key: string): Promise<boolean> {
    return Boolean(await this.get(key))
  }

  public async put(key: string, value: any) {
    await this.db.put(key, value)
  }

  public async update(key: string, value: object) {
    /**
     * Update data instead of replacing it
     */
    const data = await this.get(key)
    if (!data) {
      await this.put(key, value)
      return null
    }
    const updatedObj = Object.assign(data, value)
    await this.put(key, updatedObj)
  }

  public async find(key: string, value: string) {
    /**
     * Find and return nested key
     */
    const obj = await this.get(key)
    try {
      return obj[value]
    } catch (e) {
      this.logger.error(`${value} not found in ${key}`)
      return null
    }
  }

  public async delete(key: string) {
    await this.db.del(key)
  }

  public async load(data: any) {
    for (const key in data) {
      if (typeof data[key] === 'object' && Object.keys(data[key]).length === 0) {
        continue
      }
      if (typeof data[key] === 'string' && data[key].length === 0) {
        continue
      }
      if (Array.isArray(data[key]) && data[key].length === 0) {
        continue
      }
      await this.put(key, data[key])
    }
  }

  // I think we can move this into StorageService (keep this service
  // focused on CRUD).
  public async getSortedPeers(peers: string[], includeLocalPeerAddress: boolean = true): Promise<string[]> {
    const peersStats = (await this.get(LocalDBKeys.PEERS)) || {}
    const stats: NetworkStats[] = Object.values(peersStats)
    const identity = await this.getIdentity(await this.get(LocalDBKeys.CURRENT_COMMUNITY_ID))

    if (identity) {
      const localPeerAddress = createLibp2pAddress(identity.hiddenService.onionAddress, identity.peerId.id)
      this.logger.info('Local peer', localPeerAddress)
      return filterAndSortPeers(peers, stats, localPeerAddress, includeLocalPeerAddress)
    } else {
      return filterAndSortPeers(peers, stats, undefined, includeLocalPeerAddress)
    }
  }

  public async setCommunity(community: Community) {
    this.logger.info('Setting community', community.id)
    let communities = await this.get(LocalDBKeys.COMMUNITIES)
    if (!communities) {
      communities = {}
    }
    communities[community.id] = community
    await this.put(LocalDBKeys.COMMUNITIES, communities)
  }

  public async setCurrentCommunityId(communityId: string) {
    this.logger.info('Setting current community id', communityId)
    await this.put(LocalDBKeys.CURRENT_COMMUNITY_ID, communityId)
  }

  public async getCommunities(): Promise<Record<string, Community>> {
    return await this.get(LocalDBKeys.COMMUNITIES)
  }

  public async getCurrentCommunity(): Promise<Community | undefined> {
    this.logger.info('Getting current community')
    const currentCommunityId = await this.get(LocalDBKeys.CURRENT_COMMUNITY_ID)
    const communities = await this.get(LocalDBKeys.COMMUNITIES)

    return communities?.[currentCommunityId]
  }

  public async communityExists(communityId: string): Promise<boolean> {
    return communityId in ((await this.getCommunities()) ?? {})
  }

  // temporarily shoving identity creation here
  public async setIdentity(identity: Identity) {
    let identities = await this.get(LocalDBKeys.IDENTITIES)
    if (!identities) {
      identities = {}
    }
    identities[identity.id] = identity
    await this.put(LocalDBKeys.IDENTITIES, identities)
  }

  public async getIdentity(id: string): Promise<Identity | undefined> {
    const identities = await this.get(LocalDBKeys.IDENTITIES)
    return identities?.[id]
  }

  public async getIdentities(): Promise<Record<string, Identity>> {
    return await this.get(LocalDBKeys.IDENTITIES)
  }

  public async setSigChain(sigChain: SigChain) {
    const teamName = sigChain.team.teamName
    const key = `${LocalDBKeys.SIGCHAINS}${teamName}`
    const serializedSigChain: SigChainSaveData = {
      serializedTeam: Buffer.from(sigChain.save()).toString('base64'),
      context: sigChain.context,
      teamKeyRing: sigChain.team.teamKeyring(),
    }
    this.logger.info('Saving sigchain', teamName)
    await this.put(key, serializedSigChain)
  }

  public async getSigChain(teamName: string): Promise<SerializedSigChain | undefined> {
    const key = `${LocalDBKeys.SIGCHAINS}${teamName}`
    this.logger.info('Getting sigchain', teamName, key)
    const sigChainBlob = await this.get(key)
    if (sigChainBlob) {
      // convert serializedTeam from base64 to buffer to Uint8Array
      const serializedTeamBuffer = Buffer.from(sigChainBlob.serializedTeam, 'base64')
      return {
        serializedTeam: new Uint8Array(serializedTeamBuffer),
        context: sigChainBlob.context,
        teamKeyRing: sigChainBlob.teamKeyRing,
      } as SerializedSigChain
    } else {
      this.logger.error('Sigchain not found', teamName)
      return undefined
    }
  }

  public async deleteSigChain(teamName: string) {
    const key = `${LocalDBKeys.SIGCHAINS}${teamName}`
    await this.delete(key)
  }
}
