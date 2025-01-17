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
import { type KeyValueType, type EventsType, IPFSAccessController, type LogEntry } from '@orbitdb/core'
import { EventEmitter } from 'events'
import { type PeerId } from '@libp2p/interface'
import { getCrypto } from 'pkijs'
import { stringToArrayBuffer } from 'pvutils'
import validate from '../validation/validators'
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
import { createLogger } from '../common/logger'
import { PublicChannelsRepo } from '../common/types'
import { removeFiles, removeDirs, createPaths } from '../common/utils'
import { DBOptions, StorageEvents } from './storage.types'
import { CertificatesStore } from './certificates/certificates.store'
import { CertificatesRequestsStore } from './certifacteRequests/certificatesRequestsStore'
import { IpfsService } from '../ipfs/ipfs.service'
import { OrbitDbService } from './orbitDb/orbitDb.service'
import { CommunityMetadataStore } from './communityMetadata/communityMetadata.store'
import { UserProfileStore } from './userProfile/userProfile.store'
import { KeyValueIndexedValidated } from './orbitDb/keyValueIndexedValidated'
import { MessagesAccessController } from './orbitDb/MessagesAccessController'
import { EventsWithStorage } from './orbitDb/eventsWithStorage'
import { LocalDBKeys } from '../local-db/local-db.types'

@Injectable()
export class StorageService extends EventEmitter {
  private peerId: PeerId | null = null
  public publicChannelsRepos: Map<string, PublicChannelsRepo> = new Map()
  private publicKeysMap: Map<string, CryptoKey> = new Map()

  private certificates: EventsType<string> | null
  private channels: KeyValueType<PublicChannel> | null

  private readonly logger = createLogger(StorageService.name)

  constructor(
    @Inject(QUIET_DIR) public readonly quietDir: string,
    @Inject(ORBIT_DB_DIR) public readonly orbitDbDir: string,
    @Inject(IPFS_REPO_PATCH) public readonly ipfsRepoPath: string,
    private readonly localDbService: LocalDbService,
    private readonly ipfsService: IpfsService,
    private readonly filesManager: IpfsFileManagerService,
    private readonly orbitDbService: OrbitDbService,
    private readonly certificatesRequestsStore: CertificatesRequestsStore,
    private readonly certificatesStore: CertificatesStore,
    private readonly communityMetadataStore: CommunityMetadataStore,
    private readonly userProfileStore: UserProfileStore
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

    this.logger.info(`Starting file manager`)
    this.attachFileManagerEvents()
    await this.filesManager.init()

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
    await this.channels?.sync.start()
    await this.certificatesStore.startSync()
    await this.certificatesRequestsStore.startSync()
    await this.userProfileStore.startSync()
    for (const channel of this.publicChannelsRepos.values()) {
      await channel.db.sync.start()
    }
  }

  static dbAddress = (db: { root: string; path: string }) => {
    // Note: Do not use path.join for creating db address!
    return `/orbitdb/${db.root}/${db.path}`
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
    await this.createDbForChannels()
    await this.initAllChannels()

    this.logger.timeEnd('Storage.initDatabases')
    this.logger.info('Initialized DBs')

    this.emit(SocketActionTypes.CONNECTION_PROCESS_INFO, ConnectionProcessInfo.DBS_INITIALIZED)
  }

  public async stop() {
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

    this.logger.info('Stopping IPFS files manager')
    try {
      await this.filesManager.stop()
    } catch (e) {
      this.logger.error('Error stopping IPFS files manager', e)
    }

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

  public async setChannel(id: string, channel: PublicChannel) {
    if (!this.channels) {
      throw new Error('Channels have not been initialized!')
    }
    await this.channels.put(id, channel)
  }

  public async getChannel(id: string) {
    if (!this.channels) {
      throw new Error('Channels have not been initialized!')
    }
    return await this.channels.get(id)
  }

  public async getChannels(): Promise<PublicChannel[]> {
    if (!this.channels) {
      throw new Error('Channels have not been initialized!')
    }
    return (await this.channels.all()).map(x => x.value)
  }

  public async loadAllChannels() {
    this.logger.info('Getting all channels')
    this.emit(StorageEvents.CHANNELS_STORED, {
      channels: await this.getChannels(),
    })
  }

  private async createDbForChannels() {
    this.logger.info('Creating public-channels database')
    this.channels = await this.orbitDbService.orbitDb.open<KeyValueType<PublicChannel>>('public-channels', {
      sync: false,
      Database: KeyValueIndexedValidated(),
      AccessController: IPFSAccessController({ write: ['*'] }),
    })

    this.channels.events.on('update', async (entry: LogEntry) => {
      this.logger.info('public-channels database updated')

      this.emit(SocketActionTypes.CONNECTION_PROCESS_INFO, ConnectionProcessInfo.CHANNELS_STORED)

      const channels = await this.getChannels()

      this.emit(StorageEvents.CHANNELS_STORED, { channels })

      channels.forEach(channel => this.subscribeToChannel(channel, { replicate: true }))
    })

    const channels = await this.getChannels()
    this.logger.info('Channels count:', channels.length)
    this.logger.info(
      'Channels names:',
      channels.map(x => x.name)
    )
    channels.forEach(channel => this.subscribeToChannel(channel))
  }

  async initAllChannels() {
    this.emit(StorageEvents.CHANNELS_STORED, {
      channels: await this.getChannels(),
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

  protected async getAllEventLogEntries<T>(db: EventsType<T>): Promise<T[]> {
    const res: T[] = []

    for await (const x of db.iterator()) {
      res.push(x.value)
    }

    return res
  }

  public async subscribeToChannel(
    channelData: PublicChannel,
    options = { replicate: false }
  ): Promise<CreateChannelResponse | undefined> {
    let db: EventsType<ChannelMessage>
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
        this.logger.error(`Can't subscribe to channel ${channelData.id}`, e)
        return
      }
      if (!db) {
        this.logger.error(`Can't subscribe to channel ${channelData.id}, the DB isn't initialized!`)
        return
      }
      repo = this.publicChannelsRepos.get(channelData.id)
    }

    if (repo && !repo.eventsAttached) {
      this.logger.info('Subscribing to channel ', channelData.id)

      db.events.on('update', async (entry: LogEntry<ChannelMessage>) => {
        this.logger.info(`${channelData.id} database updated`, entry.hash, entry.payload.value?.channelId)

        const message = entry.payload.value!
        const verified = await this.verifyMessage(message)

        this.emit(StorageEvents.MESSAGES_STORED, {
          messages: [message],
          isVerified: verified,
        })

        const ids = (await this.getAllEventLogEntries<ChannelMessage>(db)).map(msg => msg.id)
        const community = await this.localDbService.getCurrentCommunity()

        if (community) {
          this.emit(StorageEvents.MESSAGE_IDS_STORED, {
            ids,
            channelId: channelData.id,
            communityId: community.id,
          })
        }

        // FIXME: the 'update' event runs if we replicate entries and if we add
        // entries ourselves. So we may want to check if the message is written
        // by us.
        //
        // Display push notifications on mobile
        if (process.env.BACKEND === 'mobile') {
          if (!verified) return

          // Do not notify about old messages
          if (message.createdAt < parseInt(process.env.CONNECTION_TIME || '')) return

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

      const ids = (await this.getAllEventLogEntries<ChannelMessage>(db)).map(msg => msg.id)
      const community = await this.localDbService.getCurrentCommunity()

      if (community) {
        this.emit(StorageEvents.MESSAGE_IDS_STORED, {
          ids,
          channelId: channelData.id,
          communityId: community.id,
        })
      }

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

    const messages = await this.getAllEventLogEntries<ChannelMessage>(repo.db)
    const filteredMessages: ChannelMessage[] = []

    for (const id of ids) {
      filteredMessages.push(...messages.filter(i => i.id === id))
    }

    return {
      messages: filteredMessages,
      isVerified: true,
    }
  }

  private async createChannel(channelData: PublicChannel, options: DBOptions): Promise<EventsType<ChannelMessage>> {
    if (!validate.isChannel(channelData)) {
      this.logger.error('Invalid channel format')
      throw new Error('Create channel validation error')
    }

    this.logger.info(`Creating channel ${channelData.id}`)

    const channelId = channelData.id
    const db = await this.orbitDbService.orbitDb.open<EventsType<ChannelMessage>>(`channels.${channelId}`, {
      type: 'events',
      Database: EventsWithStorage(),
      AccessController: MessagesAccessController({ write: ['*'] }),
    })
    const channel = await this.getChannel(channelId)

    if (channel === undefined) {
      await this.setChannel(channelId, channelData)
    } else {
      this.logger.info(`Channel ${channelId} already exists`)
    }

    this.publicChannelsRepos.set(channelId, { db, eventsAttached: false })
    this.logger.info(`Set ${channelId} to local channels`)
    this.logger.info(`Created channel ${channelId}`)

    return db
  }

  public async deleteChannel(payload: { channelId: string; ownerPeerId: string }) {
    this.logger.info('deleting channel storage', payload)
    const { channelId, ownerPeerId } = payload
    const channel = await this.getChannel(channelId)
    if (!this.peerId) {
      this.logger.error('deleteChannel - peerId is null')
      throw new Error('deleteChannel - peerId is null')
    }
    const isOwner = ownerPeerId === this.peerId.toString()
    if (channel && isOwner) {
      if (!this.channels) {
        throw new Error('Channels have not been initialized!')
      }
      await this.channels.del(channelId)
    }
    let repo = this.publicChannelsRepos.get(channelId)
    if (!repo) {
      const db = await this.orbitDbService.orbitDb.open<EventsType<ChannelMessage>>(`channels.${channelId}`, {
        sync: false,
        type: 'events',
        Database: EventsWithStorage(),
        AccessController: MessagesAccessController({ write: ['*'] }),
      })
      repo = {
        db,
        eventsAttached: false,
      }
    }
    await repo.db.sync.stop()
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

    this.logger.info(`All users count: ${allUsers.length}`, allUsers)

    return allUsers
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

  public async clean() {
    this.peerId = null

    // @ts-ignore
    this.channels = undefined
    // @ts-ignore
    this.messageThreads = undefined
    // @ts-ignore
    this.publicChannelsRepos = new Map()
    this.publicKeysMap = new Map()

    this.certificates = null
    this.channels = null

    this.certificatesRequestsStore.clean()
    this.certificatesStore.clean()
    this.communityMetadataStore.clean()
    this.userProfileStore.clean()

    await this.ipfsService.destoryInstance()
  }
}
