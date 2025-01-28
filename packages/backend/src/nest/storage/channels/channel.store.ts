import { Injectable } from '@nestjs/common'

import { EventsType, LogEntry } from '@orbitdb/core'

import { QuietLogger } from '@quiet/logger'
import { ChannelMessage, MessagesLoadedPayload, PublicChannel, PushNotificationPayload } from '@quiet/types'

import { createLogger } from '../../common/logger'
import { EventStoreBase } from '../base.store'
import { EventsWithStorage } from '../orbitDb/eventsWithStorage'
import { MessagesAccessController } from '../orbitDb/MessagesAccessController'
import { OrbitDbService } from '../orbitDb/orbitDb.service'
import validate from '../../validation/validators'
import { MessagesService } from './messages/messages.service'
import { DBOptions, StorageEvents } from '../storage.types'
import { LocalDbService } from '../../local-db/local-db.service'
import { CertificatesStore } from '../certificates/certificates.store'

/**
 * Manages storage-level logic for a given channel in Quiet
 */
@Injectable()
export class ChannelStore extends EventStoreBase<ChannelMessage> {
  private channelData: PublicChannel
  private _subscribing: boolean = false

  private logger: QuietLogger

  constructor(
    private readonly orbitDbService: OrbitDbService,
    private readonly localDbService: LocalDbService,
    private readonly messagesService: MessagesService,
    private readonly certificatesStore: CertificatesStore
  ) {
    super()
  }

  // Initialization

  /**
   * Initialize this instance of ChannelStore by opening an OrbitDB database
   *
   * @param channelData Channel configuration metadata
   * @param options Database options for OrbitDB
   * @returns Initialized ChannelStore instance
   */
  public async init(channelData: PublicChannel, options: DBOptions): Promise<ChannelStore> {
    if (this.store != null) {
      this.logger.warn(`Channel ${this.channelData.name} has already been initialized!`)
      return this
    }

    this.channelData = channelData
    this.logger = createLogger(`storage:channels:channelStore:${this.channelData.name}`)
    this.logger.info(`Initializing channel store for channel ${this.channelData.name}`)

    this.store = await this.orbitDbService.orbitDb.open<EventsType<ChannelMessage>>(`channels.${this.channelData.id}`, {
      type: 'events',
      Database: EventsWithStorage(),
      AccessController: MessagesAccessController({ write: ['*'] }),
      sync: options.sync,
    })

    this.logger.info('Initialized')
    return this
  }

  /**
   * Start syncing the OrbitDB database
   */
  public async startSync(): Promise<void> {
    await this.getStore().sync.start()
  }

  // Accessors

  public get isSubscribing(): boolean {
    return this._subscribing
  }

  /**
   * Subscribe to new messages on this channel
   *
   * @emits StorageEvents.MESSAGE_IDS_STORED
   * @emits StorageEvents.MESSAGES_STORED
   * @emits StorageEvents.SEND_PUSH_NOTIFICATION
   */
  public async subscribe(): Promise<void> {
    this.logger.info('Subscribing to channel ', this.channelData.id)
    this._subscribing = true

    this.getStore().events.on('update', async (entry: LogEntry<ChannelMessage>) => {
      this.logger.info(`${this.channelData.id} database updated`, entry.hash, entry.payload.value?.channelId)

      const message = await this.messagesService.onConsume(entry.payload.value!)

      this.emit(StorageEvents.MESSAGES_STORED, {
        messages: [message],
        isVerified: message.verified,
      })

      await this.refreshMessageIds()

      // FIXME: the 'update' event runs if we replicate entries and if we add
      // entries ourselves. So we may want to check if the message is written
      // by us.
      //
      // Display push notifications on mobile
      if (process.env.BACKEND === 'mobile') {
        if (!message.verified) return

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

    await this.startSync()
    await this.refreshMessageIds()
    this._subscribing = false

    this.logger.info(`Subscribed to channel ${this.channelData.id}`)
  }

  // Messages

  /**
   * Validate and append a new message to this channel's OrbitDB database
   *
   * @param message Message to add to the OrbitDB database
   */
  public async sendMessage(message: ChannelMessage): Promise<void> {
    this.logger.info(`Sending message with ID ${message.id} on channel ${this.channelData.id}`)
    if (!validate.isMessage(message)) {
      this.logger.error('Public channel message is invalid')
      return
    }

    if (message.channelId != this.channelData.id) {
      this.logger.error(
        `Could not send message. Message is for channel ID ${message.channelId} which does not match channel ID ${this.channelData.id}`
      )
      return
    }

    try {
      await this.addEntry(message)
    } catch (e) {
      this.logger.error(`Could not append message (entry not allowed to write to the log). Details: ${e.message}`)
    }
  }

  /**
   * Read messages from OrbitDB, optionally filtered by message ID
   *
   * @param ids Message IDs to read from this channel's OrbitDB database
   * @returns Messages read from OrbitDB
   */
  public async getMessages(ids: string[] | undefined = undefined): Promise<MessagesLoadedPayload | undefined> {
    const messages = await this.getEntries(ids)
    return {
      messages,
      isVerified: true,
    }
  }

  /**
   * Get the latest state of messages in OrbitDB and emit an event to trigger redux updates
   *
   * @emits StorageEvents.MESSAGE_IDS_STORED
   */
  private async refreshMessageIds(): Promise<void> {
    const ids = (await this.getEntries()).map(msg => msg.id)
    const community = await this.localDbService.getCurrentCommunity()

    if (community) {
      this.emit(StorageEvents.MESSAGE_IDS_STORED, {
        ids,
        channelId: this.channelData.id,
        communityId: community.id,
      })
    }
  }

  // Base Store Logic

  /**
   * Add a new event to the OrbitDB event store
   *
   * @param message Message to add to the OrbitDB database
   * @returns Hash of the new database entry
   */
  public async addEntry(message: ChannelMessage): Promise<string> {
    if (!this.store) {
      throw new Error('Store is not initialized')
    }

    this.logger.info('Adding message to database')
    const processedMessage = await this.messagesService.onSend(message)
    return await this.store.add(processedMessage)
  }

  /**
   * Read a list of entries on the OrbitDB event store
   *
   * @param ids Optional list of message IDs to filter by
   * @returns All matching entries on the event store
   */
  public async getEntries(): Promise<ChannelMessage[]>
  public async getEntries(ids: string[] | undefined): Promise<ChannelMessage[]>
  public async getEntries(ids?: string[] | undefined): Promise<ChannelMessage[]> {
    this.logger.info(`Getting all messages for channel`, this.channelData.id, this.channelData.name)
    const messages: ChannelMessage[] = []

    for await (const x of this.getStore().iterator()) {
      if (ids == null || ids?.includes(x.value.id)) {
        // NOTE: we skipped the verification process when reading many messages in the previous version
        // so I'm skipping it here - is that really the correct behavior?
        const processedMessage = await this.messagesService.onConsume(x.value, false)
        messages.push(processedMessage)
      }
    }

    return messages
  }

  // Close Logic

  /**
   * Stop syncing the OrbitDB database
   */
  public async stopSync(): Promise<void> {
    await this.getStore().sync.stop()
  }

  /**
   * Close the OrbitDB database
   */
  public async close(): Promise<void> {
    this.logger.info(`Closing channel store`)
    await this.stopSync()
    await this.getStore().close()
  }

  /**
   * Delete the channel from OrbitDB
   */
  public async deleteChannel(): Promise<void> {
    this.logger.info(`Deleting channel`)
    try {
      await this.stopSync()
      await this.getStore().drop()
    } catch (e) {
      // we expect an error if the database isn't synced
    }

    this.clean()
  }

  /**
   * Clean this ChannelStore
   *
   * NOTE: Does NOT affect data stored in IPFS
   */
  public clean(): void {
    this.logger.info(`Cleaning channel store`, this.channelData.id, this.channelData.name)
    this.store = undefined
    this._subscribing = false
  }
}
