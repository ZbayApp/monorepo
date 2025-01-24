import { Inject, Injectable } from '@nestjs/common'
import { keyObjectFromString, verifySignature } from '@quiet/identity'
import { type KeyValueType, type EventsType, IPFSAccessController, type LogEntry } from '@orbitdb/core'
import { EventEmitter } from 'events'
import { type PeerId } from '@libp2p/interface'
import { getCrypto } from 'pkijs'
import { stringToArrayBuffer } from 'pvutils'
import validate from '../../validation/validators'
import {
  ChannelMessage,
  ConnectionProcessInfo,
  type CreateChannelResponse,
  DeleteFilesFromChannelSocketPayload,
  FileMetadata,
  type MessagesLoadedPayload,
  NoCryptoEngineError,
  PublicChannel,
  PushNotificationPayload,
  SocketActionTypes,
} from '@quiet/types'
import fs from 'fs'
import { IpfsFileManagerService } from '../../ipfs-file-manager/ipfs-file-manager.service'
import { IPFS_REPO_PATCH, ORBIT_DB_DIR, QUIET_DIR } from '../../const'
import { IpfsFilesManagerEvents } from '../../ipfs-file-manager/ipfs-file-manager.types'
import { LocalDbService } from '../../local-db/local-db.service'
import { createLogger } from '../../common/logger'
import { PublicChannelsRepo } from '../../common/types'
import { DBOptions, StorageEvents } from '../storage.types'
import { CertificatesStore } from '../certificates/certificates.store'
import { OrbitDbService } from '../orbitDb/orbitDb.service'
import { KeyValueIndexedValidated } from '../orbitDb/keyValueIndexedValidated'
import { MessagesAccessController } from '../orbitDb/MessagesAccessController'
import { EventsWithStorage } from '../orbitDb/eventsWithStorage'

@Injectable()
export class ChannelsService extends EventEmitter {
  private peerId: PeerId | null = null
  public publicChannelsRepos: Map<string, PublicChannelsRepo> = new Map()
  private publicKeysMap: Map<string, CryptoKey> = new Map()

  private channels: KeyValueType<PublicChannel> | null

  private readonly logger = createLogger(ChannelsService.name)

  constructor(
    @Inject(QUIET_DIR) public readonly quietDir: string,
    @Inject(ORBIT_DB_DIR) public readonly orbitDbDir: string,
    @Inject(IPFS_REPO_PATCH) public readonly ipfsRepoPath: string,
    private readonly filesManager: IpfsFileManagerService,
    private readonly localDbService: LocalDbService,
    private readonly orbitDbService: OrbitDbService,
    private readonly certificatesStore: CertificatesStore
  ) {
    super()
  }

  // INITIALIZATION

  public async init(peerId: PeerId) {
    this.logger.info(`Initializing ${ChannelsService.name}`)
    this.peerId = peerId

    this.logger.info(`Starting file manager`)
    this.attachFileManagerEvents()
    await this.filesManager.init()

    this.logger.info(`Initializing Databases`)
    await this.initChannels()

    this.logger.info(`Initialized ${ChannelsService.name}`)
  }

  public async initChannels() {
    this.logger.time(`Initializing channel databases`)

    this.attachFileManagerEvents()
    await this.createDbForChannels()
    await this.initAllChannels()

    this.logger.timeEnd('Initializing channel databases')
    this.logger.info('Initialized databases')
  }

  public async startSync() {
    await this.channels?.sync.start()
    for (const channel of this.publicChannelsRepos.values()) {
      await channel.db.sync.start()
    }
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

  public async checkIfFileExist(filepath: string): Promise<boolean> {
    return await new Promise(resolve => {
      fs.access(filepath, fs.constants.F_OK, error => {
        resolve(!error)
      })
    })
  }

  public async closeChannels(): Promise<void> {
    try {
      this.logger.info('Closing channels DB')
      await this.channels?.close()
      this.logger.info('Closed channels DB')
    } catch (e) {
      this.logger.error('Error closing channels db', e)
    }
  }

  public async closeFileManager(): Promise<void> {
    try {
      this.logger.info('Stopping IPFS files manager')
      await this.filesManager.stop()
    } catch (e) {
      this.logger.error('Error stopping IPFS files manager', e)
    }
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

    this.channels = null
  }
}
