import { Inject, Injectable } from '@nestjs/common'
import {
  CertFieldsTypes,
  keyObjectFromString,
  verifySignature,
  parseCertificate,
  parseCertificationRequest,
  getCertFieldValue,
  getReqFieldValue,
  keyFromCertificate,
} from '@quiet/identity'
import type { IPFS } from 'ipfs-core'
import EventStore from 'orbit-db-eventstore'
import KeyValueStore from 'orbit-db-kvstore'
import { EventEmitter } from 'events'
import PeerId from 'peer-id'
import { getCrypto } from 'pkijs'
import { stringToArrayBuffer } from 'pvutils'
import validate from '../validation/validators'
import { CID } from 'multiformats/cid'
import {
  ChannelMessage,
  CommunityMetadata,
  ConnectionProcessInfo,
  type CreateChannelResponse,
  DeleteFilesFromChannelSocketPayload,
  FileMetadata,
  type MessagesLoadedPayload,
  NoCryptoEngineError,
  PublicChannel,
  PushNotificationPayload,
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
import { IpfsFileManagerService } from '../ipfs-file-manager/ipfs-file-manager.service'
import { IPFS_REPO_PATCH, ORBIT_DB_DIR, QUIET_DIR } from '../const'
import { IpfsFilesManagerEvents } from '../ipfs-file-manager/ipfs-file-manager.types'
import { LocalDbService } from '../local-db/local-db.service'
import { LazyModuleLoader } from '@nestjs/core'
import { createLogger } from '../common/logger'
import { PublicChannelsRepo } from '../common/types'
import { removeFiles, removeDirs, createPaths } from '../common/utils'
import { DBOptions, StorageEvents } from './storage.types'
import { CertificatesStore } from './certificates/certificates.store'
import { CertificatesRequestsStore } from './certifacteRequests/certificatesRequestsStore'
import { OrbitDb } from './orbitDb/orbitDb.service'
import { CommunityMetadataStore } from './communityMetadata/communityMetadata.store'
import { UserProfileStore } from './userProfile/userProfile.store'

@Injectable()
export class StorageService extends EventEmitter {
  public publicChannelsRepos: Map<string, PublicChannelsRepo> = new Map()
  private publicKeysMap: Map<string, CryptoKey> = new Map()

  public certificates: EventStore<string>
  public channels: KeyValueStore<PublicChannel>

  private ipfs: IPFS
  private filesManager: IpfsFileManagerService
  private peerId: PeerId | null = null
  private ipfsStarted: boolean

  private readonly logger = createLogger(StorageService.name)

  constructor(
    @Inject(QUIET_DIR) public readonly quietDir: string,
    @Inject(ORBIT_DB_DIR) public readonly orbitDbDir: string,
    @Inject(IPFS_REPO_PATCH) public readonly ipfsRepoPath: string,
    private readonly localDbService: LocalDbService,
    private readonly orbitDbService: OrbitDb,
    private readonly certificatesRequestsStore: CertificatesRequestsStore,
    private readonly certificatesStore: CertificatesStore,
    private readonly communityMetadataStore: CommunityMetadataStore,
    private readonly userProfileStore: UserProfileStore,
    private readonly lazyModuleLoader: LazyModuleLoader
  ) {
    super()
  }

  private prepare() {
    this.logger.info('Initializing storage')
    removeFiles(this.quietDir, 'LOCK')
    removeDirs(this.quietDir, 'repo.lock')
    this.ipfsStarted = false

    if (!['android', 'ios'].includes(process.platform)) {
      createPaths([this.ipfsRepoPath, this.orbitDbDir])
    }

    this.emit(SocketActionTypes.CONNECTION_PROCESS_INFO, ConnectionProcessInfo.STORAGE_INITIALIZED)

    this.logger.info('Initialized storage')
  }

  public async init(peerId: any) {
    this.clean()
    this.prepare()
    this.peerId = peerId
    const { IpfsModule } = await import('../ipfs/ipfs.module')
    const ipfsModuleRef = await this.lazyModuleLoader.load(() => IpfsModule)
    const { IpfsService } = await import('../ipfs/ipfs.service')
    const ipfsService = ipfsModuleRef.get(IpfsService)
    await ipfsService.createInstance(peerId)
    const ipfsInstance = ipfsService?.ipfsInstance
    if (!ipfsInstance) {
      this.logger.error('no ipfs instance')
      throw new Error('no ipfs instance')
    }
    this.ipfs = ipfsInstance
    await this.orbitDbService.create(peerId, this.ipfs)

    this.emit(SocketActionTypes.CONNECTION_PROCESS_INFO, ConnectionProcessInfo.INITIALIZING_IPFS)

    const { IpfsFileManagerModule } = await import('../ipfs-file-manager/ipfs-file-manager.module')
    const ipfsFileManagerModuleRef = await this.lazyModuleLoader.load(() => IpfsFileManagerModule)
    const { IpfsFileManagerService } = await import('../ipfs-file-manager/ipfs-file-manager.service')
    const ipfsFileManagerService = ipfsFileManagerModuleRef.get(IpfsFileManagerService)
    await ipfsFileManagerService.init()
    this.filesManager = ipfsFileManagerService

    this.attachFileManagerEvents()
    await this.initDatabases()

    void this.startIpfs()
  }

  private async startIpfs() {
    this.logger.info('Starting IPFS')
    return this.ipfs
      .start()
      .then(async () => {
        this.logger.info('IPFS started')
        this.ipfsStarted = true
        try {
          await this.startReplicate()
        } catch (e) {
          this.logger.error(`Couldn't start store replication`, e)
        }
      })
      .catch((e: Error) => {
        this.logger.error(`Couldn't start ipfs node`, e)
        throw new Error(e.message)
      })
  }

  private async startReplicate() {
    const dbs = []
    if (this.communityMetadataStore?.getAddress()) {
      dbs.push(this.communityMetadataStore.getAddress())
    }
    if (this.channels?.address) {
      dbs.push(this.channels.address)
    }
    if (this.certificatesStore.getAddress()) {
      dbs.push(this.certificatesStore.getAddress())
    }
    if (this.certificatesRequestsStore.getAddress()) {
      dbs.push(this.certificatesRequestsStore.getAddress())
    }
    if (this.userProfileStore.getAddress()) {
      dbs.push(this.userProfileStore.getAddress())
    }

    const channels = this.publicChannelsRepos.values()

    for (const channel of channels) {
      dbs.push(channel.db.address)
    }

    const addresses = dbs.map(db => StorageService.dbAddress(db))
    await this.subscribeToPubSub(addresses)
  }

  static dbAddress = (db: { root: string; path: string }) => {
    // Note: Do not use path.join for creating db address!
    return `/orbitdb/${db.root}/${db.path}`
  }

  public async initDatabases() {
    this.logger.time('Storage.initDatabases')

    this.logger.info('1/3')
    this.attachStoreListeners()

    // FIXME: This is sort of messy how we are initializing things.
    // Currently, the CommunityMetadataStore sends an event during
    // initialization which is picked up by the CertificatesStore, but
    // the CertificatesStore is not initialized yet. Perhaps we can
    // initialize stores first and then load data/send events.
    this.logger.info('2/3')
    await this.communityMetadataStore.init()
    await this.certificatesStore.init()
    await this.certificatesRequestsStore.init()
    await this.userProfileStore.init()

    this.logger.info('3/3')
    await this.createDbForChannels()
    await this.initAllChannels()

    this.logger.timeEnd('Storage.initDatabases')
    this.logger.info('Initialized DBs')

    this.emit(SocketActionTypes.CONNECTION_PROCESS_INFO, ConnectionProcessInfo.DBS_INITIALIZED)
  }

  private async subscribeToPubSub(addr: string[]) {
    if (!this.ipfsStarted) {
      this.logger.warn(`IPFS not started. Not subscribing to ${addr}`)
      return
    }
    for (const a of addr) {
      this.logger.info(`Pubsub - subscribe to ${a}`)
      // @ts-ignore
      await this.orbitDbService.orbitDb._pubsub.subscribe(
        a,
        // @ts-ignore
        this.orbitDbService.orbitDb._onMessage.bind(this.orbitDbService.orbitDb),
        // @ts-ignore
        this.orbitDbService.orbitDb._onPeerConnected.bind(this.orbitDbService.orbitDb)
      )
    }
  }

  private async __stopIPFS() {
    if (this.ipfs) {
      this.logger.info('Stopping IPFS files manager')
      try {
        await this.filesManager.stop()
      } catch (e) {
        this.logger.error('cannot stop filesManager', e)
      }
      this.logger.info('Stopping IPFS')
      try {
        await this.ipfs.stop()
      } catch (err) {
        this.logger.error(`Following error occured during closing ipfs database: ${err as string}`)
      }
      this.ipfsStarted = false
    }
  }

  public async stopOrbitDb() {
    try {
      this.logger.info('Closing channels DB')
      await this.channels?.close()
      this.logger.info('Closed channels DB')
    } catch (e) {
      this.logger.error('Error closing channels db', e)
    }

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
    await this.__stopIPFS()
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

  public async loadAllChannels() {
    this.logger.info('Getting all channels')
    this.emit(StorageEvents.CHANNELS_STORED, {
      channels: this.channels.all as unknown as { [key: string]: PublicChannel },
    })
  }

  private async createDbForChannels() {
    this.logger.info('createDbForChannels init')
    this.channels = await this.orbitDbService.orbitDb.keyvalue<PublicChannel>('public-channels', {
      replicate: false,
      accessController: {
        // type: 'channelsaccess',
        write: ['*'],
      },
    })

    this.channels.events.on('write', async (_address, entry) => {
      this.logger.info('WRITE: Channels')
    })

    this.channels.events.on('replicated', async () => {
      this.logger.info('REPLICATED: Channels')
      this.emit(SocketActionTypes.CONNECTION_PROCESS_INFO, ConnectionProcessInfo.CHANNELS_STORED)

      const channels = Object.values(this.channels.all)

      const keyValueChannels: {
        [key: string]: PublicChannel
      } = {}

      channels.forEach(channel => {
        keyValueChannels[channel.id] = channel
      })

      this.emit(StorageEvents.CHANNELS_STORED, {
        channels: keyValueChannels,
      })

      channels.forEach(async (channel: PublicChannel) => {
        await this.subscribeToChannel(channel, { replicate: true })
      })
    })

    await this.channels.load()
    this.logger.info('Channels count:', Object.keys(this.channels.all).length)
    this.logger.info('Channels names:', Object.keys(this.channels.all))
    Object.values(this.channels.all).forEach(async (channel: PublicChannel) => {
      await this.subscribeToChannel(channel)
    })
    this.logger.info('STORAGE: Finished createDbForChannels')
  }

  async initAllChannels() {
    this.emit(StorageEvents.CHANNELS_STORED, {
      channels: this.channels.all as unknown as { [key: string]: PublicChannel },
    })
  }

  async verifyMessage(message: ChannelMessage): Promise<boolean> {
    const crypto = getCrypto()
    if (!crypto) throw new NoCryptoEngineError()

    const signature = stringToArrayBuffer(message.signature)
    let cryptoKey = this.publicKeysMap.get(message.pubKey)

    if (!cryptoKey) {
      cryptoKey = await keyObjectFromString(message.pubKey, crypto)
      this.publicKeysMap.set(message.pubKey, cryptoKey)
    }

    return await verifySignature(signature, message.message, cryptoKey)
  }

  protected getAllEventLogEntries<T>(db: EventStore<T>): T[] {
    return db
      .iterator({ limit: -1 })
      .collect()
      .map(e => e.payload.value)
  }

  protected getAllEventLogRawEntries<T>(db: EventStore<T>) {
    return db.iterator({ limit: -1 }).collect()
  }

  public async subscribeToChannel(
    channelData: PublicChannel,
    options = { replicate: false }
  ): Promise<CreateChannelResponse | undefined> {
    let db: EventStore<ChannelMessage>
    // @ts-ignore
    if (channelData.address) {
      // @ts-ignore
      channelData.id = channelData.address
    }
    let repo = this.publicChannelsRepos.get(channelData.id)

    if (repo) {
      db = repo.db
    } else {
      try {
        db = await this.createChannel(channelData, options)
      } catch (e) {
        this.logger.error(`Can't subscribe to channel ${channelData.id}`, e.message)
        return
      }
      if (!db) {
        this.logger.error(`Can't subscribe to channel ${channelData.id}`)
        return
      }
      repo = this.publicChannelsRepos.get(channelData.id)
    }

    if (repo && !repo.eventsAttached) {
      this.logger.info('Subscribing to channel ', channelData.id)

      db.events.on('write', async (_address, entry) => {
        this.logger.info(`Writing to public channel db ${channelData.id}`)
        const verified = await this.verifyMessage(entry.payload.value)

        this.emit(StorageEvents.MESSAGES_STORED, {
          messages: [entry.payload.value],
          isVerified: verified,
        })
      })

      db.events.on('replicate.progress', async (address, _hash, entry, progress, total) => {
        this.logger.info(`progress ${progress as string}/${total as string}. Address: ${address as string}`)
        const messages = [entry.payload.value]

        const verified = await this.verifyMessage(messages[0])

        const message = messages[0]

        this.emit(StorageEvents.MESSAGES_STORED, {
          messages: [message],
          isVerified: verified,
        })

        // Display push notifications on mobile
        if (process.env.BACKEND === 'mobile') {
          if (!verified) return

          // Do not notify about old messages
          // @ts-ignore
          if (parseInt(message.createdAt) < parseInt(process.env.CONNECTION_TIME || '')) return

          const username = await this.certificatesStore.getCertificateUsername(message.pubKey)
          if (!username) {
            this.logger.error(`Can't send push notification, no username found for public key '${message.pubKey}'`)
            return
          }

          const payload: PushNotificationPayload = {
            message: JSON.stringify(message),
            username: username,
          }

          this.emit(StorageEvents.SEND_PUSH_NOTIFICATION, payload)
        }
      })

      db.events.on('replicated', async address => {
        this.logger.info('Replicated.', address)
        const ids = this.getAllEventLogEntries<ChannelMessage>(db).map(msg => msg.id)
        const community = await this.localDbService.getCurrentCommunity()

        if (community) {
          this.emit(StorageEvents.MESSAGE_IDS_STORED, {
            ids,
            channelId: channelData.id,
            communityId: community.id,
          })
        }
      })

      db.events.on('ready', async () => {
        const ids = this.getAllEventLogEntries<ChannelMessage>(db).map(msg => msg.id)
        const community = await this.localDbService.getCurrentCommunity()

        if (community) {
          this.emit(StorageEvents.MESSAGE_IDS_STORED, {
            ids,
            channelId: channelData.id,
            communityId: community.id,
          })
        }
      })

      // FIXME: load is called twice for channel stores
      await db.load()
      repo.eventsAttached = true
    }

    this.logger.info(`Subscribed to channel ${channelData.id}`)
    this.emit(StorageEvents.CHANNEL_SUBSCRIBED, {
      channelId: channelData.id,
    })
    return { channel: channelData }
  }

  public async getMessages(channelId: string, ids: string[]): Promise<MessagesLoadedPayload | undefined> {
    const repo = this.publicChannelsRepos.get(channelId)
    if (!repo) return

    const messages = this.getAllEventLogEntries<ChannelMessage>(repo.db)
    const filteredMessages: ChannelMessage[] = []

    for (const id of ids) {
      filteredMessages.push(...messages.filter(i => i.id === id))
    }

    return {
      messages: filteredMessages,
      isVerified: true,
    }
  }

  private async createChannel(channelData: PublicChannel, options: DBOptions): Promise<EventStore<ChannelMessage>> {
    if (!validate.isChannel(channelData)) {
      this.logger.error('Invalid channel format')
      throw new Error('Create channel validation error')
    }

    this.logger.info(`Creating channel ${channelData.id}`)

    const channelId = channelData.id
    const db: EventStore<ChannelMessage> = await this.orbitDbService.orbitDb.log<ChannelMessage>(
      `channels.${channelId}`,
      {
        replicate: options.replicate,
        accessController: {
          type: 'messagesaccess',
          write: ['*'],
        },
      }
    )
    const channel = this.channels.get(channelId)

    this.logger.info('Found existing channel:', channel)

    if (channel === undefined) {
      await this.channels.put(channelId, { ...channelData })
    }

    this.publicChannelsRepos.set(channelId, { db, eventsAttached: false })
    this.logger.info(`Set ${channelId} to local channels`)
    await db.load()
    this.logger.info(`Created channel ${channelId}`)
    await this.subscribeToPubSub([StorageService.dbAddress(db.address)])

    return db
  }

  public async deleteChannel(payload: { channelId: string; ownerPeerId: string }) {
    this.logger.info('deleting channel storage', payload)
    const { channelId, ownerPeerId } = payload
    const channel = this.channels.get(channelId)
    if (!this.peerId) {
      this.logger.error('deleteChannel - peerId is null')
      throw new Error('deleteChannel - peerId is null')
    }
    const isOwner = ownerPeerId === this.peerId.toString()
    if (channel && isOwner) {
      await this.channels.del(channelId)
    }
    let repo = this.publicChannelsRepos.get(channelId)
    if (!repo) {
      const db = await this.orbitDbService.orbitDb.log<ChannelMessage>(`channels.${channelId}`, {
        accessController: {
          type: 'messagesaccess',
          write: ['*'],
        },
      })
      repo = {
        db,
        eventsAttached: false,
      }
    }
    await repo.db.close()
    await repo.db.drop()
    this.publicChannelsRepos.delete(channelId)
    return { channelId: payload.channelId }
  }

  public async deleteChannelFiles(files: FileMetadata[]) {
    for (const file of files) {
      await this.deleteFile(file)
    }
  }

  public async deleteFile(fileMetadata: FileMetadata) {
    await this.filesManager.deleteBlocks(fileMetadata)
  }

  public async deleteChannelMessages(hashes: CID[]) {
    this.logger.info('hashes ', hashes)
    const gcresult = this.ipfs.repo.gc()
    for await (const res of gcresult) {
      // @ts-ignore
      // const ccc = base58.base58btc.encode(res.cid?.multihash.bytes)
      // this.logger.info('base58btc encoded', ccc)
      // this.logger.info('garbage collector result', res)
    }
    // for await (const result of this.ipfs.block.rm(hashes)) {
    //   if (result.error) {
    //     logger.error(`Failed to remove block ${result.cid}`, result.error)
    //   }
    // }
  }

  public async sendMessage(message: ChannelMessage) {
    if (!validate.isMessage(message)) {
      this.logger.error('STORAGE: public channel message is invalid')
      return
    }
    const repo = this.publicChannelsRepos.get(message.channelId)
    if (!repo) {
      this.logger.error(`Could not send message. No '${message.channelId}' channel in saved public channels`)
      return
    }
    try {
      this.logger.info('Sending message:', message.id)
      await repo.db.add(message)
    } catch (e) {
      this.logger.error(
        `STORAGE: Could not append message (entry not allowed to write to the log). Details: ${e.message}`
      )
    }
  }

  private attachFileManagerEvents = () => {
    this.filesManager.on(IpfsFilesManagerEvents.DOWNLOAD_PROGRESS, status => {
      this.emit(StorageEvents.DOWNLOAD_PROGRESS, status)
    })
    this.filesManager.on(IpfsFilesManagerEvents.MESSAGE_MEDIA_UPDATED, messageMedia => {
      this.emit(StorageEvents.MESSAGE_MEDIA_UPDATED, messageMedia)
    })
    this.filesManager.on(StorageEvents.REMOVE_DOWNLOAD_STATUS, payload => {
      this.emit(StorageEvents.REMOVE_DOWNLOAD_STATUS, payload)
    })
    this.filesManager.on(StorageEvents.FILE_UPLOADED, payload => {
      this.emit(StorageEvents.FILE_UPLOADED, payload)
    })
    this.filesManager.on(StorageEvents.DOWNLOAD_PROGRESS, payload => {
      this.emit(StorageEvents.DOWNLOAD_PROGRESS, payload)
    })
    this.filesManager.on(StorageEvents.MESSAGE_MEDIA_UPDATED, payload => {
      this.emit(StorageEvents.MESSAGE_MEDIA_UPDATED, payload)
    })
  }

  public async uploadFile(metadata: FileMetadata) {
    this.filesManager.emit(IpfsFilesManagerEvents.UPLOAD_FILE, metadata)
  }

  public async downloadFile(metadata: FileMetadata) {
    this.filesManager.emit(IpfsFilesManagerEvents.DOWNLOAD_FILE, metadata)
  }

  public cancelDownload(mid: string) {
    this.filesManager.emit(IpfsFilesManagerEvents.CANCEL_DOWNLOAD, mid)
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

    this.logger.info(`All users count: ${allUsers.length}`)

    return allUsers
  }

  public usernameCert(username: string): string | null {
    /**
     * Check if given username is already in use
     */
    const certificates = this.getAllEventLogEntries(this.certificatesStore.getStore())
    for (const cert of certificates) {
      const parsedCert = parseCertificate(cert)
      const certUsername = getCertFieldValue(parsedCert, CertFieldsTypes.nickName)
      if (certUsername?.localeCompare(username, 'en', { sensitivity: 'base' }) === 0) {
        return cert
      }
    }
    return null
  }

  public async deleteFilesFromChannel(payload: DeleteFilesFromChannelSocketPayload) {
    const { messages } = payload
    Object.keys(messages).map(async key => {
      const message = messages[key]
      if (message?.media?.path) {
        const mediaPath = message.media.path
        this.logger.info('deleteFilesFromChannel : mediaPath', mediaPath)
        const isFileExist = await this.checkIfFileExist(mediaPath)
        this.logger.info(`deleteFilesFromChannel : isFileExist- ${isFileExist}`)
        if (isFileExist) {
          fs.unlink(mediaPath, unlinkError => {
            if (unlinkError) {
              this.logger.error(`deleteFilesFromChannel : unlink error`, unlinkError)
            }
          })
        } else {
          this.logger.error(`deleteFilesFromChannel : file does not exist`, mediaPath)
        }
      }
    })
  }

  public async addUserProfile(profile: UserProfile) {
    await this.userProfileStore.setEntry(profile.pubKey, profile)
  }

  public async checkIfFileExist(filepath: string): Promise<boolean> {
    return await new Promise(resolve => {
      fs.access(filepath, fs.constants.F_OK, error => {
        resolve(!error)
      })
    })
  }

  public async setIdentity(identity: Identity) {
    await this.localDbService.setIdentity(identity)
    this.emit(SocketActionTypes.IDENTITY_STORED, identity)
  }

  public async getIdentity(id: string): Promise<Identity | undefined> {
    return await this.localDbService.getIdentity(id)
  }

  private clean() {
    // @ts-ignore
    this.channels = undefined
    // @ts-ignore
    this.messageThreads = undefined
    // @ts-ignore
    this.publicChannelsRepos = new Map()
    this.publicKeysMap = new Map()
    // @ts-ignore
    this.ipfs = null
    // @ts-ignore
    this.filesManager = null
    this.peerId = null

    this.certificatesRequestsStore.clean()
    this.certificatesStore.clean()
    this.communityMetadataStore.clean()
    this.userProfileStore.clean()
  }
}
