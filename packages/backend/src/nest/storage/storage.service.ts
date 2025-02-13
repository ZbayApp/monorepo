import { Inject, Injectable } from '@nestjs/common'
import {
  CertFieldsTypes,
  parseCertificate,
  parseCertificationRequest,
  getCertFieldValue,
  getReqFieldValue,
  keyFromCertificate,
} from '@quiet/identity'
import { EventEmitter } from 'events'
import { type PeerId } from '@libp2p/interface'
import {
  CommunityMetadata,
  ConnectionProcessInfo,
  SaveCSRPayload,
  SaveCertificatePayload,
  SocketActionTypes,
  UserData,
  type UserProfile,
  type UserProfilesStoredEvent,
  type Identity,
} from '@quiet/types'
import { createLibp2pAddress } from '@quiet/common'
import fs from 'fs'
import { IPFS_REPO_PATCH, ORBIT_DB_DIR, QUIET_DIR } from '../const'
import { LocalDbService } from '../local-db/local-db.service'
import { createLogger } from '../common/logger'
import { removeFiles, removeDirs, createPaths } from '../common/utils'
import { StorageEvents } from './storage.types'
import { CertificatesStore } from './certificates/certificates.store'
import { CertificatesRequestsStore } from './certifacteRequests/certificatesRequestsStore'
import { IpfsService } from '../ipfs/ipfs.service'
import { OrbitDbService } from './orbitDb/orbitDb.service'
import { CommunityMetadataStore } from './communityMetadata/communityMetadata.store'
import { UserProfileStore } from './userProfile/userProfile.store'
import { LocalDBKeys } from '../local-db/local-db.types'
import { ChannelsService } from './channels/channels.service'

@Injectable()
export class StorageService extends EventEmitter {
  private peerId: PeerId | null = null

  private readonly logger = createLogger(StorageService.name)

  constructor(
    @Inject(QUIET_DIR) public readonly quietDir: string,
    @Inject(ORBIT_DB_DIR) public readonly orbitDbDir: string,
    @Inject(IPFS_REPO_PATCH) public readonly ipfsRepoPath: string,
    private readonly localDbService: LocalDbService,
    private readonly ipfsService: IpfsService,
    private readonly orbitDbService: OrbitDbService,
    private readonly certificatesRequestsStore: CertificatesRequestsStore,
    private readonly certificatesStore: CertificatesStore,
    private readonly communityMetadataStore: CommunityMetadataStore,
    private readonly userProfileStore: UserProfileStore,
    private readonly channelsService: ChannelsService
  ) {
    super()
  }

  private prepare() {
    removeFiles(this.quietDir, 'LOCK')
    removeDirs(this.quietDir, 'repo.lock')

    if (!['android', 'ios'].includes(process.platform)) {
      createPaths([this.ipfsRepoPath, this.orbitDbDir])
    }
  }

  public async init(peerId: PeerId) {
    this.logger.info('Initializing storage')
    this.prepare()
    this.peerId = peerId

    this.emit(SocketActionTypes.CONNECTION_PROCESS_INFO, ConnectionProcessInfo.INITIALIZING_IPFS)

    this.logger.info(`Starting IPFS`)
    await this.ipfsService.createInstance()
    await this.ipfsService.start()

    this.logger.info(`Creating OrbitDB service`)
    await this.orbitDbService.create(peerId, this.ipfsService.ipfsInstance!)

    this.logger.info(`Initializing Databases`)
    await this.initDatabases()

    this.logger.info(`Starting database sync`)
    await this.startSync()

    this.logger.info('Initialized storage')
  }

  private async startSync() {
    if (!this.ipfsService.isStarted()) {
      this.logger.warn(`IPFS not started. Not starting database sync`)
      return
    }

    await this.communityMetadataStore.startSync()
    await this.certificatesStore.startSync()
    await this.certificatesRequestsStore.startSync()
    await this.userProfileStore.startSync()
    await this.channelsService.startSync()
  }

  static dbAddress = (db: { root: string; path: string }) => {
    // Note: Do not use path.join for creating db address!
    return `/orbitdb/${db.root}/${db.path}`
  }

  /**
   * Get the ChannelsService for managing channels and messages
   */
  public get channels() {
    return this.channelsService
  }

  public async initDatabases() {
    this.logger.time('Storage.initDatabases')

    if (!(await this.localDbService.exists(LocalDBKeys.PEERS))) {
      this.logger.info(`Adding empty value to 'peers' key in local DB`)
      await this.localDbService.put(LocalDBKeys.PEERS, {})
    }

    this.logger.info('1/3')
    this.attachStoreListeners()

    // FIXME: This is sort of messy how we are initializing things. Currently,
    // the CommunityMetadataStore sends an event during initialization which is
    // picked up by the CertificatesStore. Perhaps we can initialize stores
    // first and then load data/send events.
    this.logger.info('2/3')
    await this.certificatesStore.init()
    await this.certificatesRequestsStore.init()
    await this.communityMetadataStore.init()
    await this.userProfileStore.init()

    this.logger.info('3/3')
    await this.channelsService.init(this.peerId!)

    this.logger.timeEnd('Storage.initDatabases')
    this.logger.info('Initialized DBs')

    this.emit(SocketActionTypes.CONNECTION_PROCESS_INFO, ConnectionProcessInfo.DBS_INITIALIZED)
  }

  public async stop() {
    await this.channelsService.closeFileManager()
    await this.channelsService.closeChannels()

    try {
      await this.certificatesStore?.close()
    } catch (e) {
      this.logger.error('Error closing certificates db', e)
    }

    try {
      await this.certificatesRequestsStore?.close()
    } catch (e) {
      this.logger.error('Error closing certificates db', e)
    }

    try {
      await this.communityMetadataStore?.close()
    } catch (e) {
      this.logger.error('Error closing community metadata store', e)
    }

    try {
      await this.userProfileStore?.close()
    } catch (e) {
      this.logger.error('Error closing user profiles db', e)
    }

    await this.orbitDbService.stop()

    try {
      await this.ipfsService.stop()
    } catch (e) {
      this.logger.error('Error stopping IPFS service', e)
    }
  }

  public attachStoreListeners() {
    this.certificatesStore.on(StorageEvents.CERTIFICATES_STORED, async payload => {
      this.emit(StorageEvents.CERTIFICATES_STORED, payload)
      await this.updatePeersList()
      // TODO: Shouldn't we also dial new peers or at least add them
      // to the peer store for the auto-dialer to handle?
    })

    this.certificatesRequestsStore.on(StorageEvents.CSRS_STORED, async (payload: { csrs: string[] }) => {
      this.emit(StorageEvents.CSRS_STORED, payload)
      await this.updatePeersList()
      // TODO: Shouldn't we also dial new peers or at least add them
      // to the peer store for the auto-dialer to handle?
    })

    this.communityMetadataStore.on(StorageEvents.COMMUNITY_METADATA_STORED, (meta: CommunityMetadata) => {
      this.certificatesStore.updateMetadata(meta)
      this.emit(StorageEvents.COMMUNITY_METADATA_STORED, meta)
    })

    this.userProfileStore.on(StorageEvents.USER_PROFILES_STORED, (payload: UserProfilesStoredEvent) => {
      this.emit(StorageEvents.USER_PROFILES_STORED, payload)
    })
  }

  public async updateCommunityMetadata(communityMetadata: CommunityMetadata): Promise<CommunityMetadata | undefined> {
    const meta = await this.communityMetadataStore?.setEntry(communityMetadata.id, communityMetadata)
    if (meta) {
      this.certificatesStore.updateMetadata(meta)
    }
    return meta
  }

  public async updatePeersList() {
    const community = await this.localDbService.getCurrentCommunity()
    if (!community) {
      throw new Error('Failed to update peers list - community missing')
    }

    // Always include existing peers. Otherwise, if CSRs or
    // certificates do not replicate, then this could remove peers.
    const existingPeers = community.peerList ?? []
    this.logger.info('Existing peers count:', existingPeers.length)

    const users = await this.getAllUsers()
    const peers = Array.from(
      new Set([...existingPeers, ...users.map(user => createLibp2pAddress(user.onionAddress, user.peerId))])
    )
    const sortedPeers = await this.localDbService.getSortedPeers(peers)

    // This should never happen, but just in case
    if (sortedPeers.length === 0) {
      throw new Error('Failed to update peers list - no peers')
    }

    this.logger.info('Updating community peer list. Peers count:', sortedPeers.length)
    community.peerList = sortedPeers
    await this.localDbService.setCommunity(community)
    this.emit(StorageEvents.COMMUNITY_UPDATED, community)
  }

  public async loadAllCertificates() {
    this.logger.info('Loading all certificates')
    return await this.certificatesStore.getEntries()
  }

  public async saveCertificate(payload: SaveCertificatePayload): Promise<boolean> {
    this.logger.info('About to save certificate...')
    if (!payload.certificate) {
      this.logger.error('Certificate is either null or undefined, not saving to db')
      return false
    }
    this.logger.info('Saving certificate...')
    await this.certificatesStore.addEntry(payload.certificate)
    return true
  }

  public async saveCSR(payload: SaveCSRPayload): Promise<void> {
    this.logger.info('About to save CSR...', payload.csr)
    await this.certificatesRequestsStore.addEntry(payload.csr)
  }

  /**
   * Retrieve all users (using certificates and CSRs to determine users)
   */
  public async getAllUsers(): Promise<UserData[]> {
    const csrs = await this.certificatesRequestsStore.getEntries()
    const certs = await this.certificatesStore.getEntries()
    const allUsersByKey: Record<string, UserData> = {}

    this.logger.info(`Retrieving all users. CSRs count: ${csrs.length} Certificates count: ${certs.length}`)

    for (const cert of certs) {
      const parsedCert = parseCertificate(cert)
      const pubKey = keyFromCertificate(parsedCert)
      const onionAddress = getCertFieldValue(parsedCert, CertFieldsTypes.commonName)
      const peerId = getCertFieldValue(parsedCert, CertFieldsTypes.peerId)
      const username = getCertFieldValue(parsedCert, CertFieldsTypes.nickName)

      // TODO: This validation should go in CertificatesStore
      if (!pubKey || !onionAddress || !peerId || !username) {
        this.logger.error(
          `Received invalid certificate. onionAddress: ${onionAddress} peerId: ${peerId} username: ${username}`
        )
        continue
      }

      allUsersByKey[pubKey] = { onionAddress, peerId, username }
    }

    for (const csr of csrs) {
      const parsedCsr = parseCertificationRequest(csr)
      const pubKey = keyFromCertificate(parsedCsr)
      const onionAddress = getReqFieldValue(parsedCsr, CertFieldsTypes.commonName)
      const peerId = getReqFieldValue(parsedCsr, CertFieldsTypes.peerId)
      const username = getReqFieldValue(parsedCsr, CertFieldsTypes.nickName)

      // TODO: This validation should go in CertificatesRequestsStore
      if (!pubKey || !onionAddress || !peerId || !username) {
        this.logger.error(`Received invalid CSR. onionAddres: ${onionAddress} peerId: ${peerId} username: ${username}`)
        continue
      }

      if (!(pubKey in allUsersByKey)) {
        allUsersByKey[pubKey] = { onionAddress, peerId, username }
      }
    }

    const allUsers = Object.values(allUsersByKey)

    this.logger.info(`All users count: ${allUsers.length}`, allUsers)

    return allUsers
  }

  public async addUserProfile(profile: UserProfile) {
    await this.userProfileStore.setEntry(profile.pubKey, profile)
  }

  public async setIdentity(identity: Identity) {
    await this.localDbService.setIdentity(identity)
    this.emit(SocketActionTypes.IDENTITY_STORED, identity)
  }

  public async getIdentity(id: string): Promise<Identity | undefined> {
    return await this.localDbService.getIdentity(id)
  }

  public async clean() {
    this.peerId = null

    await this.channelsService.clean()

    this.certificatesRequestsStore.clean()
    this.certificatesStore.clean()
    this.communityMetadataStore.clean()
    this.userProfileStore.clean()

    await this.ipfsService.destoryInstance()
  }
}
