import { createSlice, type Dictionary, type EntityState, type PayloadAction } from '@reduxjs/toolkit'
import { channelMessagesAdapter } from '../publicChannels/publicChannels.adapter'
import { StoreKeys } from '../store.keys'
import {
  messageVerificationStatusAdapter,
  messageSendingStatusAdapter,
  publicChannelsMessagesBaseAdapter,
} from './messages.adapter.ts'
import {
  type AddPublicChannelsMessagesBasePayload,
  type GetMessagesPayload,
  type ChannelMessage,
  type ChannelMessageIdsResponse,
  type DeleteChannelEntryPayload,
  type MessagesLoadedPayload,
  instanceOfChannelMessage,
  type LazyLoadingPayload,
  type MessageSendingStatus,
  type MessageVerificationStatus,
  type PublicChannelsMessagesBase,
  type SendDeletionMessagePayload,
  type SetDisplayedMessagesNumberPayload,
  type WriteMessagePayload,
  MessageSendingStatusPayload,
} from '@quiet/types'
import { createLogger } from '../../utils/logger'

const logger = createLogger('messagesSlice')

export class MessagesState {
  public publicKeyMapping: Dictionary<CryptoKey> = {}

  public publicChannelsMessagesBase: EntityState<PublicChannelsMessagesBase> =
    publicChannelsMessagesBaseAdapter.getInitialState()

  public messageVerificationStatus: EntityState<MessageVerificationStatus> =
    messageVerificationStatusAdapter.getInitialState()

  public messageSendingStatus: EntityState<MessageSendingStatus> = messageSendingStatusAdapter.getInitialState()
}

export const messagesSlice = createSlice({
  initialState: { ...new MessagesState() },
  name: StoreKeys.Messages,
  reducers: {
    sendMessage: (state, _action: PayloadAction<WriteMessagePayload>) => state,
    sendDeletionMessage: (state, _action: PayloadAction<SendDeletionMessagePayload>) => state,
    deleteChannelEntry: (state, action: PayloadAction<DeleteChannelEntryPayload>) => {
      const { channelId } = action.payload
      publicChannelsMessagesBaseAdapter.removeOne(state.publicChannelsMessagesBase, channelId)
    },
    addPublicChannelsMessagesBase: (state, action: PayloadAction<AddPublicChannelsMessagesBasePayload>) => {
      const { channelId } = action.payload
      publicChannelsMessagesBaseAdapter.addOne(state.publicChannelsMessagesBase, {
        channelId,
        messages: channelMessagesAdapter.getInitialState(),
        display: 50,
      })
    },
    addMessageVerificationStatus: (state, action: PayloadAction<MessageVerificationStatus>) => {
      const status = action.payload
      messageVerificationStatusAdapter.upsertOne(state.messageVerificationStatus, status)
    },
    addMessagesSendingStatus: (state, action: PayloadAction<MessageSendingStatusPayload>) => {
      messageSendingStatusAdapter.upsertOne(state.messageSendingStatus, {
        id: action.payload.message.id,
        status: action.payload.status,
      })
    },
    removePendingMessageStatuses: (state, action: PayloadAction<MessagesLoadedPayload>) => {
      const { messages } = action.payload

      for (const message of messages) {
        messageSendingStatusAdapter.removeOne(state.messageSendingStatus, message.id)
      }
    },
    removeMessageVerificationStatus: (state, action: PayloadAction<string>) => {
      const id = action.payload
      messageVerificationStatusAdapter.removeOne(state.messageVerificationStatus, id)
    },
    addMessages: (state, action: PayloadAction<MessagesLoadedPayload>) => {
      const { messages } = action.payload
      for (const message of messages) {
        if (!instanceOfChannelMessage(message)) {
          logger.error('Failed to add message, object not instance of message')
          continue
        }
        if (!state.publicChannelsMessagesBase.entities[message.channelId]) {
          logger.error('Failed to add message, could not find channel', message.channelId)
          continue
        }

        let toAdd = message

        const draft = state.publicChannelsMessagesBase.entities[message.channelId]?.messages.entities[message.id]

        if (message.media && draft?.media?.path) {
          toAdd = {
            ...message,
            media: {
              ...message.media,
              path: message.media.path ? message.media.path : draft.media.path,
            },
          }
        }

        const messagesBase = state.publicChannelsMessagesBase.entities[message.channelId]
        if (!messagesBase) {
          throw new Error('Failed to add message, channel went missing')
        }

        logger.info('Upserting message to Redux store', toAdd.id)
        channelMessagesAdapter.upsertOne(messagesBase.messages, toAdd)
      }
    },
    setDisplayedMessagesNumber: (state, action: PayloadAction<SetDisplayedMessagesNumberPayload>) => {
      const { display, channelId } = action.payload
      publicChannelsMessagesBaseAdapter.updateOne(state.publicChannelsMessagesBase, {
        id: channelId,
        changes: {
          display,
        },
      })
    },
    getMessages: (state, _action: PayloadAction<GetMessagesPayload>) => state,
    checkForMessages: (state, _action: PayloadAction<ChannelMessageIdsResponse>) => state,
    lazyLoading: (state, _action: PayloadAction<LazyLoadingPayload>) => state,
    extendCurrentPublicChannelCache: state => state,
    resetCurrentPublicChannelCache: state => state,
    // Utility action for testing purposes
    test_message_verification_status: (
      state,
      action: PayloadAction<{
        message: ChannelMessage
        isVerified: boolean
      }>
    ) => {
      const { message, isVerified } = action.payload
      messageVerificationStatusAdapter.upsertOne(state.messageVerificationStatus, {
        publicKey: message.pubKey,
        signature: message.signature,
        isVerified,
      })
    },
  },
})

export const messagesActions = messagesSlice.actions
export const messagesReducer = messagesSlice.reducer
