import { Inject, Injectable } from '@nestjs/common'
import { type KeyValueType, IPFSAccessController, type LogEntry } from '@orbitdb/core'
import { EventEmitter } from 'events'
import { type PeerId } from '@libp2p/interface'
import {
  ChannelMessage,
  ConnectionProcessInfo,
  type CreateChannelResponse,
  DeleteFilesFromChannelSocketPayload,
  FileMetadata,
  type MessagesLoadedPayload,
  PublicChannel,
  PushNotificationPayload,
  SocketActionTypes,
  ChannelMessageIdsResponse,
  DeleteChannelResponse,
} from '@quiet/types'
import fs from 'fs'
import { IpfsFileManagerService } from '../../ipfs-file-manager/ipfs-file-manager.service'
import { IPFS_REPO_PATCH, ORBIT_DB_DIR, QUIET_DIR } from '../../const'
import { IpfsFilesManagerEvents } from '../../ipfs-file-manager/ipfs-file-manager.types'
import { createLogger } from '../../common/logger'
import { PublicChannelsRepo } from '../../common/types'
import { StorageEvents } from '../storage.types'
import { OrbitDbService } from '../orbitDb/orbitDb.service'
import { KeyValueIndexedValidated } from '../orbitDb/keyValueIndexedValidated'
import { ChannelStore } from './channel.store'
import { createContextId, ModuleRef } from '@nestjs/core'

/**
 * Manages storage-level logic for all channels in Quiet
 */
@Injectable()
export class ChannelsService extends EventEmitter {
  private peerId: PeerId | null = null
  public publicChannelsRepos: Map<string, PublicChannelsRepo> = new Map()

  private channels: KeyValueType<PublicChannel> | null

  private readonly logger = createLogger(`storage:channels`)

  constructor(
    @Inject(QUIET_DIR) public readonly quietDir: string,
    @Inject(ORBIT_DB_DIR) public readonly orbitDbDir: string,
    @Inject(IPFS_REPO_PATCH) public readonly ipfsRepoPath: string,
    private readonly filesManager: IpfsFileManagerService,
    private readonly orbitDbService: OrbitDbService,
    private readonly moduleRef: ModuleRef
  ) {
    super()
  }

  // Initialization

  /**
   * Initialize the ChannelsService by starting event handles, the file manager, and initializing databases in OrbitDB
   *
   * @param peerId Peer ID of the current user
   */
  public async init(peerId: PeerId): Promise<void> {
    this.logger.info(`Initializing ${ChannelsService.name}`)
    this.peerId = peerId

    this.logger.info(`Starting file manager`)
    this.attachFileManagerEvents()
    await this.filesManager.init()

    this.logger.info(`Initializing Databases`)
    await this.initChannels()

    this.logger.info(`Initialized ${ChannelsService.name}`)
  }

  /**
   * Initialize the channels management database and individual channel stores in OrbitDB
   */
  public async initChannels(): Promise<void> {
    this.logger.time(`Initializing channel databases`)

    await this.createChannelsDb()
    await this.loadAllChannels()

    this.logger.timeEnd('Initializing channel databases')
    this.logger.info('Initialized databases')
  }

  /**
   * Start syncing the channels management database in OrbitDB
   */
  public async startSync(): Promise<void> {
    await this.channels?.sync.start()
  }

  // Channels Database Management

  /**
   * Create the channels management database in OrbitDB
   *
   * NOTE: This also subscribes to all known channel stores and handles update events on the channels management database for
   * subscribing to newly created channel stores.
   */
  private async createChannelsDb(): Promise<void> {
    this.logger.info('Creating public-channels database')
    this.channels = await this.orbitDbService.orbitDb.open<KeyValueType<PublicChannel>>('public-channels', {
      sync: false,
      Database: KeyValueIndexedValidated(),
      AccessController: IPFSAccessController({ write: ['*'] }),
    })

    this.channels.events.on('update', async (entry: LogEntry) => {
      const channelId = entry.payload.key
      const operation = entry.payload.op
      this.logger.info('public-channels database updated', channelId, operation)

      this.emit(SocketActionTypes.CONNECTION_PROCESS_INFO, ConnectionProcessInfo.CHANNELS_STORED)

      const channels = await this.getChannels()

      this.emit(StorageEvents.CHANNELS_STORED, { channels })

      // Try to subscribe to all channels that we haven't subscribed to yet, even if this update event isn't for that
      // particular channel.
      //
      // This fixes a bug where joining a community with multiple channels doesn't initialize all channels immediately.
      for (const channel of channels) {
        if (!this.publicChannelsRepos.has(channel.id) || !this.publicChannelsRepos.get(channel.id)?.eventsAttached) {
          await this.subscribeToChannel(channel)
        }
      }
    })

    const channels = await this.getChannels()
    this.logger.info('Channels count:', channels.length)
    this.logger.info(
      'Channels names:',
      channels.map(x => x.name)
    )
    for (const channel of channels.values()) {
      await this.subscribeToChannel(channel)
    }
  }

  /**
   * Add a channel to the channels management database
   *
   * @param id ID of channel to add to the channels database
   * @param channel Channel configuration metadata
   * @throws Error
   */
  public async setChannel(id: string, channel: PublicChannel): Promise<void> {
    if (!this.channels) {
      throw new Error('Channels have not been initialized!')
    }
    await this.channels.put(id, channel)
  }

  /**
   * Read channel metadata by ID from the channels management database
   *
   * @param id ID of channel to fetch
   * @returns Channel metadata, if it exists
   * @throws Error
   */
  public async getChannel(id: string): Promise<PublicChannel | undefined> {
    if (!this.channels) {
      throw new Error('Channels have not been initialized!')
    }
    return await this.channels.get(id)
  }

  /**
   * Read entries for all keys in the channels management database
   *
   * @returns All channel metadata in the channels management database
   * @throws Error
   */
  public async getChannels(): Promise<PublicChannel[]> {
    if (!this.channels) {
      throw new Error('Channels have not been initialized!')
    }
    return (await this.channels.all()).map(x => x.value)
  }

  /**
   * Get all known channels and emit event with metadata
   *
   * @emits StorageEvents.CHANNELS_STORED
   */
  public async loadAllChannels(): Promise<void> {
    this.logger.info('Getting all channels')
    this.emit(StorageEvents.CHANNELS_STORED, {
      channels: await this.getChannels(),
    })
  }

  // Channel Management

  /**
   * Create a new ChannelStore and, optionally, add the metadata to the channels management database
   *
   * @param channelData Channel metadata for new channel
   * @returns Newly created ChannelStore
   */
  private async createChannel(channelData: PublicChannel): Promise<ChannelStore> {
    this.logger.info(`Creating channel`, channelData.id, channelData.name)

    const channelId = channelData.id
    const store = await this.createChannelStore(channelData)

    const channel = await this.getChannel(channelId)
    if (channel == undefined) {
      await this.setChannel(channelId, channelData)
    } else {
      this.logger.info(`Channel ${channelId} already exists`)
    }

    this.publicChannelsRepos.set(channelId, { store, eventsAttached: false })
    this.logger.info(`Set ${channelId} to local channels`)
    this.logger.info(`Created channel ${channelId}`)

    return store
  }

  /**
   * Helper method for creating and initializing ChannelStore
   *
   * @param channelData Channel metadata for new channel
   * @returns Newly created ChannelStore
   */
  private async createChannelStore(channelData: PublicChannel): Promise<ChannelStore> {
    const store = await this.moduleRef.create(ChannelStore, createContextId())
    return await store.init(channelData, { sync: false })
  }

  /**
   * Creates a new channel store with the supplied metadata, if it doesn't exist, and subscribes
   * to new events on the store, if it didn't already exist.
   *
   * NOTE: Storage events like MESSAGE_IDS_STORED are consumed up the chain on this service but are
   * emitted on the ChannelStore instances so we consume and re-emit them on this service's event
   * emitter.
   *
   * @param channelData Channel metadata for channel we are subscribing to
   * @returns CreateChannelResponse
   * @emits StorageEvents.CHANNEL_SUBSCRIBED
   */
  public async subscribeToChannel(channelData: PublicChannel): Promise<CreateChannelResponse | undefined> {
    let store: ChannelStore
    // @ts-ignore
    if (channelData.address) {
      // @ts-ignore
      channelData.id = channelData.address
    }
    let repo = this.publicChannelsRepos.get(channelData.id)

    if (repo) {
      store = repo.store
    } else {
      try {
        store = await this.createChannel(channelData)
      } catch (e) {
        this.logger.error(`Can't subscribe to channel ${channelData.id}`, e)
        return
      }
      if (!store) {
        this.logger.error(`Can't subscribe to channel ${channelData.id}, the DB isn't initialized!`)
        return
      }
      repo = this.publicChannelsRepos.get(channelData.id)
    }

    if (repo && !repo.eventsAttached && !repo.store.isSubscribing) {
      this.handleMessageEventsOnChannelStore(channelData.id, repo)
      await repo.store.subscribe()
      repo.eventsAttached = true
    }

    this.logger.info(`Subscribed to channel ${channelData.id}`)
    this.emit(StorageEvents.CHANNEL_SUBSCRIBED, {
      channelId: channelData.id,
    })
    return { channel: channelData }
  }

  /**
   * Capture events emitted by individual channel stores and re-emit on the channels service
   *
   * @param channelId ID of channel to re-emit events from
   * @param repo Repo containing the store we are re-emitting events from
   * @emits StorageEvents.MESSAGE_IDS_STORED
   * @emits StorageEvents.MESSAGES_STORED
   * @emits StorageEvents.SEND_PUSH_NOTIFICATION
   */
  private handleMessageEventsOnChannelStore(channelId: string, repo: PublicChannelsRepo): void {
    this.logger.info(`Subscribing to channel updates`, channelId)
    repo.store.on(StorageEvents.MESSAGE_IDS_STORED, (payload: ChannelMessageIdsResponse) => {
      this.emit(StorageEvents.MESSAGE_IDS_STORED, payload)
    })

    repo.store.on(StorageEvents.MESSAGES_STORED, (payload: MessagesLoadedPayload) => {
      this.emit(StorageEvents.MESSAGES_STORED, payload)
    })

    repo.store.on(StorageEvents.SEND_PUSH_NOTIFICATION, (payload: PushNotificationPayload) => {
      this.emit(StorageEvents.SEND_PUSH_NOTIFICATION, payload)
    })
  }

  /**
   * Get the store for a given channel ID and, optionally, create a temporary store if it doesn't exist then drop
   * the database from OrbitDB
   *
   * @param payload Metadata on the channel to be deleted
   * @returns Response containing metadata on the channel that was deleted
   * @throws Error
   */
  public async deleteChannel(payload: { channelId: string; ownerPeerId: string }): Promise<DeleteChannelResponse> {
    this.logger.info('Deleting channel', payload)
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
    const repo = this.publicChannelsRepos.get(channelId)
    let store = repo?.store
    if (store == null) {
      const channelData: PublicChannel = channel ?? {
        id: channelId,
        name: 'undefined',
        owner: ownerPeerId,
        description: 'undefined',
        timestamp: 0,
      }
      store = await this.createChannelStore(channelData)
    }
    await store.deleteChannel()
    this.publicChannelsRepos.delete(channelId)
    return { channelId }
  }

  // Messages

  /**
   * Sends a message on a given channel if that channel is known
   *
   * @param message Message to send
   */
  public async sendMessage(message: ChannelMessage): Promise<void> {
    const repo = this.publicChannelsRepos.get(message.channelId)
    if (repo == null) {
      this.logger.error(`Could not send message. No '${message.channelId}' channel in saved public channels`)
      return
    }

    await repo.store.sendMessage(message)
  }

  /**
   * Read messages for a list of message IDs from a given channel if that channel is known
   *
   * @param channelId ID of channel to read messages from
   * @param ids IDS of messages to read
   * @returns Payload containing messages read
   */
  public async getMessages(
    channelId: string,
    messageIds: string[] | undefined = undefined
  ): Promise<MessagesLoadedPayload | undefined> {
    const repo = this.publicChannelsRepos.get(channelId)
    if (repo == null) {
      this.logger.error(`Could not read messages. No '${channelId}' channel in saved public channels`)
      return
    }

    return await repo.store.getMessages(messageIds)
  }

  // Files

  /**
   * Delete multiple files from the file manager
   *
   * @param files List of file metadata to be deleted
   */
  public async deleteChannelFiles(files: FileMetadata[]): Promise<void> {
    for (const file of files) {
      await this.deleteFile(file)
    }
  }

  /**
   * Deleted a single file from the file manager
   *
   * @param fileMetadata Metadata of file to be deleted
   */
  public async deleteFile(fileMetadata: FileMetadata): Promise<void> {
    await this.filesManager.deleteBlocks(fileMetadata)
  }

  /**
   * Consume file manager events and emit storage events on the channels service
   *
   * @emits StorageEvents.DOWNLOAD_PROGRESS
   * @emits StorageEvents.MESSAGE_MEDIA_UPDATED
   * @emits StorageEvents.REMOVE_DOWNLOAD_STATUS
   * @emits StorageEvents.FILE_UPLOADED
   * @emits StorageEvents.DOWNLOAD_PROGRESS
   */
  private attachFileManagerEvents(): void {
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

  /**
   * Emit event to trigger file upload on file manager
   *
   * @param metadata Metadata of file to be uploaded
   * @emits IpfsFilesManagerEvents.UPLOAD_FILE
   */
  public async uploadFile(metadata: FileMetadata): Promise<void> {
    this.filesManager.emit(IpfsFilesManagerEvents.UPLOAD_FILE, metadata)
  }

  /**
   * Emit event to trigger file download on file manager
   *
   * @param metadata Metadata of file to be downloaded
   * @emits IpfsFilesManagerEvents.DOWNLOAD_FILE
   */
  public async downloadFile(metadata: FileMetadata): Promise<void> {
    this.filesManager.emit(IpfsFilesManagerEvents.DOWNLOAD_FILE, metadata)
  }

  /**
   * Emit event to trigger file download cancellation on file manager
   *
   * @param metadata Metadata of file to be cancelled
   * @emits IpfsFilesManagerEvents.CANCEL_DOWNLOAD
   */
  public cancelDownload(mid: string): void {
    this.filesManager.emit(IpfsFilesManagerEvents.CANCEL_DOWNLOAD, mid)
  }

  /**
   * Delete files for a list of messages
   *
   * @param payload Payload containing file messages whose files should be deleted
   */
  public async deleteFilesFromChannel(payload: DeleteFilesFromChannelSocketPayload): Promise<void> {
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

  /**
   * Check if the file with the supplied path exists on the file system
   *
   * @param filePath Path to file
   * @returns True if file exists at the path
   */
  public async checkIfFileExist(filePath: string): Promise<boolean> {
    this.logger.info(`Checking if ${filePath} exists`)
    return fs.existsSync(filePath)
  }

  // Close Logic

  /**
   * Close the channels management database on OrbitDB
   */
  public async closeChannels(): Promise<void> {
    try {
      this.logger.info('Closing channels DB')
      await this.channels?.close()
      this.logger.info('Closed channels DB')
    } catch (e) {
      this.logger.error('Error closing channels db', e)
    }
  }

  /**
   * Stop the file manager
   */
  public async closeFileManager(): Promise<void> {
    try {
      this.logger.info('Stopping IPFS files manager')
      await this.filesManager.stop()
    } catch (e) {
      this.logger.error('Error stopping IPFS files manager', e)
    }
  }

  /**
   * Clean the ChannelsService
   *
   * NOTE: Does NOT affect data stored in IPFS
   */
  public async clean(): Promise<void> {
    this.peerId = null

    // @ts-ignore
    this.channels = undefined
    // @ts-ignore
    this.messageThreads = undefined
    // @ts-ignore
    this.publicChannelsRepos = new Map()

    this.channels = null
  }
}
